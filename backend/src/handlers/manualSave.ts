import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyEvent, APIGatewayProxyResult, ReceiptData } from '../types';
import { parseMultipart } from '../utils/parseMultipart';
import { success, badRequest, serverError } from '../utils/responseHelper';
import { uploadImage } from '../services/s3Service';
import { saveReceipt } from '../services/dynamoService';

/**
 * POST /api/receipts/manual
 * Manual receipt entry endpoint:
 * 1. Parse metadata from form data
 * 2. Optionally upload image to S3
 * 3. Save to DynamoDB
 * 4. Return complete ReceiptData
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

        if (!contentType.includes('multipart/form-data')) {
            return badRequest('Content-Type must be multipart/form-data');
        }

        if (!event.body) {
            return badRequest('Request body is required');
        }

        const parsed = await parseMultipart(event.body, contentType, event.isBase64Encoded);

        // Parse metadata from form field
        const metadataStr = parsed.fields['metadata'];
        if (!metadataStr) {
            return badRequest('metadata field is required');
        }

        let metadata: Partial<ReceiptData>;
        try {
            metadata = JSON.parse(metadataStr);
        } catch (e) {
            return badRequest('Invalid metadata JSON');
        }

        // Validate required fields
        if (!metadata.merchantName || metadata.total === undefined || !metadata.date) {
            return badRequest('merchantName, total, and date are required in metadata');
        }

        // Optional: Upload image to S3
        let imageUrl: string | undefined;
        if (parsed.files.length > 0) {
            const file = parsed.files[0];
            imageUrl = await uploadImage(file.content, file.filename, file.contentType);
        }

        // Create receipt record
        const receipt: ReceiptData = {
            id: uuidv4(),
            merchantName: metadata.merchantName,
            date: metadata.date,
            total: metadata.total,
            currency: metadata.currency || 'SGD',
            items: metadata.items || [],
            imageUrl: imageUrl,
            createdAt: Date.now(),
        };

        // Save to DynamoDB
        await saveReceipt(receipt);
        console.log(`Manual receipt saved with ID: ${receipt.id}`);

        return success(receipt);
    } catch (error: any) {
        console.error('Error saving manual receipt:', error);
        return serverError(error.message || 'Internal server error');
    }
};

/**
 * Handler for Express.js local development
 */
export const manualSaveHandler = async (
    metadata: Partial<ReceiptData>,
    fileBuffer?: Buffer,
    filename?: string,
    contentType?: string
): Promise<ReceiptData> => {
    // Validate required fields
    if (!metadata.merchantName || metadata.total === undefined || !metadata.date) {
        throw new Error('merchantName, total, and date are required');
    }

    // Optional: Upload image
    let imageUrl: string | undefined;
    if (fileBuffer && filename && contentType) {
        imageUrl = await uploadImage(fileBuffer, filename, contentType);
    }

    // Create receipt record
    const receipt: ReceiptData = {
        id: uuidv4(),
        merchantName: metadata.merchantName,
        date: metadata.date,
        total: metadata.total,
        currency: metadata.currency || 'SGD',
        items: metadata.items || [],
        imageUrl: imageUrl,
        createdAt: Date.now(),
    };

    // Save to storage
    await saveReceipt(receipt);

    return receipt;
};
