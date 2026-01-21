import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyEvent, APIGatewayProxyResult, ReceiptData } from '../types';
import { parseMultipart } from '../utils/parseMultipart';
import { success, badRequest, serverError } from '../utils/responseHelper';
import { uploadImage } from '../services/s3Service';
import { saveReceipt } from '../services/dynamoService';
import { extractTextFromImage, structureReceiptData } from '../services/mistralService';

/**
 * POST /api/process
 * Unified endpoint for receipt processing:
 * 1. Upload image to S3
 * 2. Extract text using Mistral OCR
 * 3. Structure data using Mistral LLM
 * 4. Save to DynamoDB
 * 5. Return complete ReceiptData
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Parse multipart form data
        const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

        if (!contentType.includes('multipart/form-data')) {
            return badRequest('Content-Type must be multipart/form-data');
        }

        if (!event.body) {
            return badRequest('Request body is required');
        }

        const parsed = await parseMultipart(event.body, contentType, event.isBase64Encoded);

        if (parsed.files.length === 0) {
            return badRequest('No file uploaded. Please provide a receipt image.');
        }

        const file = parsed.files[0];
        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedMimeTypes.includes(file.contentType)) {
            return badRequest(`Invalid file type: ${file.contentType}. Only JPEG, PNG, and WebP images are supported.`);
        }

        console.log(`Processing file: ${file.filename}, type: ${file.contentType}, size: ${file.content.length} bytes`);

        // Step 1: Upload to S3
        const imageUrl = await uploadImage(file.content, file.filename, file.contentType);
        console.log(`Image uploaded: ${imageUrl}`);

        // Step 2: Extract text using Mistral OCR
        const imageBase64 = file.content.toString('base64');
        const ocrResult = await extractTextFromImage(imageBase64, file.contentType);
        console.log(`OCR complete, extracted ${ocrResult.rawText.length} characters`);

        // Step 3: Structure data using Mistral LLM
        const structuredData = await structureReceiptData(ocrResult.rawText);
        console.log(`Structured data: ${JSON.stringify(structuredData)}`);

        // Step 4: Create complete receipt record
        const receipt: ReceiptData = {
            id: uuidv4(),
            merchantName: structuredData.merchantName,
            date: structuredData.date,
            total: structuredData.total,
            currency: structuredData.currency,
            items: structuredData.items,
            imageUrl: imageUrl,
            rawText: ocrResult.rawText,
            createdAt: Date.now(),
        };

        // Step 5: Save to DynamoDB
        await saveReceipt(receipt);
        console.log(`Receipt saved with ID: ${receipt.id}`);

        return success(receipt);
    } catch (error: any) {
        console.error('Error processing receipt:', error);
        return serverError(`Internal server error during receipt processing: ${error.message}`);
    }
};

/**
 * Handler for Express.js local development
 */
export const processReceiptHandler = async (
    fileBuffer: Buffer,
    filename: string,
    contentType: string
): Promise<ReceiptData> => {
    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(contentType)) {
        throw new Error(`Invalid file type: ${contentType}. Only JPEG, PNG, and WebP images are supported.`);
    }

    // Step 1: Upload to S3/local storage
    const imageUrl = await uploadImage(fileBuffer, filename, contentType);

    // Step 2: Extract text using Mistral OCR
    const imageBase64 = fileBuffer.toString('base64');
    const ocrResult = await extractTextFromImage(imageBase64, contentType);

    // Step 3: Structure data using Mistral LLM
    const structuredData = await structureReceiptData(ocrResult.rawText);

    // Step 4: Create complete receipt record
    const receipt: ReceiptData = {
        id: uuidv4(),
        merchantName: structuredData.merchantName,
        date: structuredData.date,
        total: structuredData.total,
        currency: structuredData.currency,
        items: structuredData.items,
        imageUrl: imageUrl,
        rawText: ocrResult.rawText,
        createdAt: Date.now(),
    };

    // Step 5: Save to DynamoDB/local storage
    await saveReceipt(receipt);

    return receipt;
};
