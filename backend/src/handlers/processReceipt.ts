import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyEvent, APIGatewayProxyResult, ReceiptData } from '../types';
import { parseMultipart } from '../utils/parseMultipart';
import { success, badRequest, serverError } from '../utils/responseHelper';
import { uploadImage } from '../services/s3Service';
import { getReceipts, saveReceipt } from '../services/dynamoService';
import { extractTextFromImage, structureReceiptData, resolveAiModel } from '../services/aiProviderService';
import { computeImageHash, computeOcrFingerprint, findDuplicateReceipt } from '../utils/duplicateDetection';

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

        // Compute image hash early (exact duplicate check)
        const imageHash = computeImageHash(file.content);

        // Step 1: Upload to S3 (kept early so we can clean up on ignore)
        const imageUrl = await uploadImage(file.content, file.filename, file.contentType);
        console.log(`Image uploaded: ${imageUrl}`);

        const modelId = parsed.fields.model || parsed.fields.modelId;
        const resolvedModel = resolveAiModel(modelId);

        // Step 2: Extract text using selected OCR model
        const imageBase64 = file.content.toString('base64');
        const ocrResult = await extractTextFromImage(imageBase64, file.contentType, resolvedModel.id);
        console.log(`OCR complete, extracted ${ocrResult.rawText.length} characters`);

        // Step 3: Structure data using selected LLM
        const structuredData = await structureReceiptData(ocrResult.rawText, resolvedModel.id);
        console.log(`Structured data: ${JSON.stringify(structuredData)}`);

        // Step 4: Create complete receipt record (NOT saved yet if duplicate)
        const receipt: ReceiptData = {
            id: uuidv4(),
            merchantName: structuredData.merchantName,
            date: structuredData.date,
            total: structuredData.total,
            currency: structuredData.currency,
            items: structuredData.items,
            imageUrl: imageUrl,
            imageHash,
            rawText: ocrResult.rawText,
            createdAt: Date.now(),
        };

        receipt.ocrFingerprint = computeOcrFingerprint(receipt);

        // Step 4.5: Duplicate detection after OCR/structuring, before persisting
        const force = String((event.queryStringParameters || {})['force'] || '').toLowerCase();
        const shouldForceSave = force === '1' || force === 'true' || force === 'yes';

        if (!shouldForceSave) {
            const existingReceipts = await getReceipts();
            const match = findDuplicateReceipt(existingReceipts, receipt);
            if (match) {
                return success({
                    duplicateDetected: true,
                    matchType: match.matchType,
                    candidateReceipt: {
                        id: match.existingReceipt.id,
                        merchantName: match.existingReceipt.merchantName,
                        date: match.existingReceipt.date,
                        total: match.existingReceipt.total,
                        currency: match.existingReceipt.currency,
                    },
                    pendingReceipt: receipt,
                });
            }
        }

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
    contentType: string,
    modelId?: string
): Promise<ReceiptData> => {
    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(contentType)) {
        throw new Error(`Invalid file type: ${contentType}. Only JPEG, PNG, and WebP images are supported.`);
    }

    // Compute image hash early (exact duplicate check)
    const imageHash = computeImageHash(fileBuffer);

    // Step 1: Upload to S3/local storage
    const imageUrl = await uploadImage(fileBuffer, filename, contentType);

    const resolvedModel = resolveAiModel(modelId);

    // Step 2: Extract text using selected OCR model
    const imageBase64 = fileBuffer.toString('base64');
    const ocrResult = await extractTextFromImage(imageBase64, contentType, resolvedModel.id);

    // Step 3: Structure data using selected LLM
    const structuredData = await structureReceiptData(ocrResult.rawText, resolvedModel.id);

    // Step 4: Create complete receipt record
    const receipt: ReceiptData = {
        id: uuidv4(),
        merchantName: structuredData.merchantName,
        date: structuredData.date,
        total: structuredData.total,
        currency: structuredData.currency,
        items: structuredData.items,
        imageUrl: imageUrl,
        imageHash,
        rawText: ocrResult.rawText,
        createdAt: Date.now(),
    };

    receipt.ocrFingerprint = computeOcrFingerprint(receipt);

    // Step 5: Save to DynamoDB/local storage
    await saveReceipt(receipt);

    return receipt;
};
