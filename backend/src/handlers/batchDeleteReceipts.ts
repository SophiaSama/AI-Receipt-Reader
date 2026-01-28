import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types';
import { noContent, badRequest, serverError } from '../utils/responseHelper';
import { getReceiptById, batchDeleteReceipts } from '../services/dynamoService';
import { deleteImage } from '../services/s3Service';

/**
 * POST /api/receipts/batch-delete
 * Body: { ids: string[] }
 * Cascade delete for multiple receipts:
 * 1. Fetch all receipts to get S3 image URLs
 * 2. Delete all images from S3
 * 3. Delete records from DynamoDB
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const ids = body?.ids;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return badRequest('Array of Receipt IDs (ids) is required');
        }

        // Fetch all receipts in parallel to find image URLs
        const receipts = await Promise.all(ids.map(id => getReceiptById(id)));
        const imageUrls = receipts
            .filter(r => r && r.imageUrl)
            .map(r => r!.imageUrl!);

        // Delete images from S3
        if (imageUrls.length > 0) {
            await Promise.all(imageUrls.map(async (url) => {
                try {
                    await deleteImage(url);
                } catch (s3Error) {
                    console.warn(`Failed to delete S3 image ${url} (continuing):`, s3Error);
                }
            }));
        }

        // Delete from DynamoDB in batch
        await batchDeleteReceipts(ids);
        console.log(`Successfully batch deleted ${ids.length} receipts`);

        return noContent();
    } catch (error: any) {
        console.error('Error batch deleting receipts:', error);
        return serverError(error.message || 'Failed to batch delete receipts');
    }
};

/**
 * Handler for Express.js local development
 */
export const batchDeleteReceiptsHandler = async (ids: string[]): Promise<void> => {
    if (!ids || ids.length === 0) return;

    // Get receipts to find image URLs
    const receipts = await Promise.all(ids.map(id => getReceiptById(id)));
    const imageUrls = receipts
        .filter(r => r && r.imageUrl)
        .map(r => r!.imageUrl!);

    // Delete images
    if (imageUrls.length > 0) {
        await Promise.all(imageUrls.map(async (url) => {
            try {
                await deleteImage(url);
            } catch (error) {
                console.warn(`Failed to delete image ${url}:`, error);
            }
        }));
    }

    // Delete from storage
    await batchDeleteReceipts(ids);
};
