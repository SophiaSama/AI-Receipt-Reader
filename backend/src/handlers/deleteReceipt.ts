import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types';
import { noContent, notFound, badRequest, serverError } from '../utils/responseHelper';
import { getReceiptById, deleteReceipt } from '../services/dynamoService';
import { deleteImage } from '../services/s3Service';

/**
 * DELETE /api/receipts/:id
 * Cascade delete:
 * 1. Fetch receipt to get S3 image URL
 * 2. Delete image from S3
 * 3. Delete record from DynamoDB
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const id = event.pathParameters?.id;

        if (!id) {
            return badRequest('Receipt ID is required');
        }

        // Get receipt to find S3 image URL
        const receipt = await getReceiptById(id);

        if (!receipt) {
            return notFound(`Receipt with ID ${id} not found`);
        }

        // Delete image from S3 if exists
        if (receipt.imageUrl) {
            try {
                await deleteImage(receipt.imageUrl);
                console.log(`Deleted image: ${receipt.imageUrl}`);
            } catch (s3Error) {
                console.warn(`Failed to delete S3 image (continuing with DB delete):`, s3Error);
            }
        }

        // Delete from DynamoDB
        await deleteReceipt(id);
        console.log(`Deleted receipt: ${id}`);

        return noContent();
    } catch (error: any) {
        console.error('Error deleting receipt:', error);
        return serverError(error.message || 'Failed to delete receipt');
    }
};

/**
 * Handler for Express.js local development
 */
export const deleteReceiptHandler = async (id: string): Promise<void> => {
    // Get receipt to find image URL
    const receipt = await getReceiptById(id);

    if (!receipt) {
        throw new Error(`Receipt with ID ${id} not found`);
    }

    // Delete image if exists
    if (receipt.imageUrl) {
        try {
            await deleteImage(receipt.imageUrl);
        } catch (error) {
            console.warn('Failed to delete image:', error);
        }
    }

    // Delete from storage
    await deleteReceipt(id);
};
