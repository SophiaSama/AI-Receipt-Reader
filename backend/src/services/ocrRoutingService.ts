import {
    RoutingDecision,
    ProcessingMetrics,
    MistralOCRResult,
    ImageAnalysisResult,
} from '../types';
import { extractTextFromImage } from './aiProviderService';

/**
 * Phase 2: Decide which OCR route to use based on Phase 1 analysis.
 *
 * With Tesseract removed, all images are routed to the Vision LLM for
 * maximum accuracy with a much smaller Docker image footprint.
 */
export const decideRoute = (analysis: ImageAnalysisResult): RoutingDecision => {
    return {
        route: 'vision_llm',
        reason: 'Vision LLM route (Tesseract removed)',
        analysis,
    };
};

/**
 * Phase 3: Execute the chosen OCR route and collect metrics.
 *
 * @param decision  - The routing decision from Phase 2
 * @param imageBase64 - Base64-encoded image (used by Vision LLM)
 * @param mimeType  - Image MIME type
 * @param modelId   - Resolved AI model ID
 * @returns OCR result text and processing metrics
 */
export const executeRoute = async (
    decision: RoutingDecision,
    imageBase64: string,
    mimeType: string,
    modelId: string
): Promise<{ ocrResult: MistralOCRResult; metrics: ProcessingMetrics }> => {
    const startTime = Date.now();
    const ocrResult = await extractTextFromImage(imageBase64, mimeType, modelId);
    const durationMs = Date.now() - startTime;

    return {
        ocrResult,
        metrics: {
            route: 'vision_llm',
            durationMs,
        },
    };
};
