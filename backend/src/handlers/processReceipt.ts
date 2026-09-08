import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyEvent, APIGatewayProxyResult, ReceiptData } from '../types';
import { parseMultipart } from '../utils/parseMultipart';
import { success, badRequest, serverError, unauthorized } from '../utils/responseHelper';
import {
    createUserClient,
    createSupabaseReceiptService,
    extractBearerToken,
    SupabaseReceiptService,
} from '../services/supabaseService';
import { structureReceiptData, resolveAiModel } from '../services/aiProviderService';
import { computeImageHash, computeOcrFingerprint, findDuplicateReceipt } from '../utils/duplicateDetection';
import { analyzeImage } from '../services/imageAnalysisService';
import { decideRoute, executeRoute } from '../services/ocrRoutingService';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type ProcessReceiptResult =
    | ReceiptData
    | {
          duplicateDetected: true;
          matchType: 'imageHash' | 'ocrFingerprint';
          candidateReceipt: Pick<ReceiptData, 'id' | 'merchantName' | 'date' | 'total' | 'currency'>;
          pendingReceipt: ReceiptData;
      };

export interface ProcessReceiptParams {
    service: SupabaseReceiptService;
    userId: string;
    fileBuffer: Buffer;
    filename: string;
    contentType: string;
    modelId?: string;
    force?: boolean;
}

/**
 * Core receipt processing pipeline, independent of transport. Uploads the image
 * to Supabase Storage under the user's folder, runs the OCR/structuring
 * pipeline, performs RLS-scoped duplicate detection, and persists the receipt
 * unless a duplicate is found.
 *
 * Returns either:
 *  - a persisted `ReceiptData` whose `imageUrl` is a short-lived signed URL for
 *    immediate display, or
 *  - a `duplicateDetected` payload whose `pendingReceipt.imageUrl` is the raw
 *    storage path, so the client can later save (insert) or ignore (remove) it.
 */
export async function processReceiptCore(params: ProcessReceiptParams): Promise<ProcessReceiptResult> {
    const { service, userId, fileBuffer, filename, contentType, modelId, force } = params;

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        throw new Error(`Invalid file type: ${contentType}. Only JPEG, PNG, and WebP images are supported.`);
    }

    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File too large (${(fileBuffer.length / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 5MB.`);
    }

    // Compute image hash early (exact-duplicate signal).
    const imageHash = computeImageHash(fileBuffer);

    // Step 1: Upload image to Supabase Storage under the user's folder.
    const imagePath = await service.uploadImage(userId, fileBuffer, filename, contentType);
    console.log(`Image uploaded to storage: ${imagePath}`);

    const resolvedModel = resolveAiModel(modelId);

    // Step 2: Smart OCR routing.
    const imageBase64 = fileBuffer.toString('base64');
    const analysis = await analyzeImage(fileBuffer, contentType);
    const decision = decideRoute(analysis);
    console.log(`OCR route: ${decision.route} (reason: ${decision.reason})`);
    const { ocrResult, metrics } = await executeRoute(decision, imageBase64, contentType, resolvedModel.id);
    console.log(`OCR complete via ${metrics.route} in ${metrics.durationMs}ms, ${ocrResult.rawText.length} chars`);

    // Step 3: Structure the data using the selected LLM.
    const structuredData = await structureReceiptData(ocrResult.rawText, resolvedModel.id);

    // Step 4: Build the candidate record (imageUrl = storage path until persisted).
    const receipt: ReceiptData = {
        id: uuidv4(),
        merchantName: structuredData.merchantName,
        date: structuredData.date,
        total: structuredData.total,
        currency: structuredData.currency,
        items: structuredData.items,
        imageUrl: imagePath,
        imageHash,
        rawText: ocrResult.rawText,
        ocrRoute: decision.route,
        processingMetrics: metrics,
        createdAt: Date.now(),
    };
    receipt.ocrFingerprint = computeOcrFingerprint(receipt);

    // Step 4.5: Duplicate detection (RLS-scoped) before persisting.
    if (!force) {
        const existingReceipts = await service.listReceipts();
        const match = findDuplicateReceipt(existingReceipts, receipt);
        if (match) {
            return {
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
            };
        }
    }

    // Step 5: Persist and return with a signed URL for immediate display.
    const saved = await service.insertReceipt(receipt);
    console.log(`Receipt saved with ID: ${saved.id}`);
    const signedUrl = await service.createSignedUrl(saved.imageUrl);
    return { ...saved, imageUrl: signedUrl ?? saved.imageUrl };
}

function parseForce(event: APIGatewayProxyEvent): boolean {
    const force = String((event.queryStringParameters || {})['force'] || '').toLowerCase();
    return force === '1' || force === 'true' || force === 'yes';
}

/**
 * POST /api/process
 * Authenticated, Supabase-backed receipt processing endpoint. Requires an
 * `Authorization: Bearer <jwt>` header; all storage/DB access runs under the
 * caller's RLS context.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const token = extractBearerToken(event.headers);
        if (!token) {
            return unauthorized('Missing or invalid Authorization header.');
        }

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
        if (!ALLOWED_MIME_TYPES.includes(file.contentType)) {
            return badRequest(`Invalid file type: ${file.contentType}. Only JPEG, PNG, and WebP images are supported.`);
        }

        if (file.content.length > MAX_FILE_SIZE_BYTES) {
            return badRequest(`File too large (${(file.content.length / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 5MB.`);
        }

        const client = createUserClient(token);
        const service = createSupabaseReceiptService(client);

        let userId: string;
        try {
            userId = await service.getUserId();
        } catch {
            return unauthorized('Invalid or expired session.');
        }

        console.log(`Processing file: ${file.filename}, type: ${file.contentType}, size: ${file.content.length} bytes`);

        const result = await processReceiptCore({
            service,
            userId,
            fileBuffer: file.content,
            filename: file.filename,
            contentType: file.contentType,
            modelId: parsed.fields.model || parsed.fields.modelId,
            force: parseForce(event),
        });

        return success(result);
    } catch (error: any) {
        console.error('Error processing receipt:', error);
        return serverError(`Internal server error during receipt processing: ${error.message}`);
    }
};
