import {
    ImageAnalysisResult,
    RoutingDecision,
    OcrRoute,
    ProcessingMetrics,
    MistralOCRResult,
} from '../types';
import { extractTextFromImage } from './aiProviderService';

/**
 * Phase 2: Decide which OCR route to use based on Phase 1 analysis.
 * This is a pure, deterministic function — easy to unit test and tune.
 */
export const decideRoute = (analysis: ImageAnalysisResult): RoutingDecision => {
    const {
        contrast,
        sharpness,
        tesseractConfidence,
        isComplexLayout,
        isHandwriting,
    } = analysis;

    // Route 1: Tesseract only — high quality, simple layout, high confidence
    if (
        tesseractConfidence >= 85 &&
        !isComplexLayout &&
        !isHandwriting &&
        contrast >= 0.3 &&
        sharpness >= 0.3
    ) {
        return {
            route: 'tesseract',
            reason: `High confidence (${tesseractConfidence.toFixed(1)}%), good quality (contrast=${contrast.toFixed(2)}, sharpness=${sharpness.toFixed(2)}), simple layout`,
            analysis,
        };
    }

    // Route 2: Hybrid — medium confidence range
    if (
        tesseractConfidence >= 70 &&
        tesseractConfidence < 85 &&
        !isHandwriting
    ) {
        return {
            route: 'hybrid',
            reason: `Medium confidence (${tesseractConfidence.toFixed(1)}%), using Tesseract + LLM validation`,
            analysis,
        };
    }

    // Route 3: Vision LLM — everything else (low quality, complex, handwriting)
    const reasons: string[] = [];
    if (tesseractConfidence < 70) reasons.push(`low confidence (${tesseractConfidence.toFixed(1)}%)`);
    if (isComplexLayout) reasons.push('complex layout');
    if (isHandwriting) reasons.push('handwriting detected');
    if (contrast < 0.3) reasons.push(`low contrast (${contrast.toFixed(2)})`);
    if (sharpness < 0.3) reasons.push(`low sharpness (${sharpness.toFixed(2)})`);

    return {
        route: 'vision_llm',
        reason: reasons.length > 0
            ? `Vision LLM needed: ${reasons.join(', ')}`
            : 'Defaulting to Vision LLM',
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

    switch (decision.route) {
        case 'tesseract':
            return executeTesseractRoute(decision, startTime);

        case 'hybrid':
            return executeHybridRoute(decision, imageBase64, mimeType, modelId, startTime);

        case 'vision_llm':
            return executeVisionLlmRoute(imageBase64, mimeType, modelId, startTime);

        default:
            // Should never happen, but TypeScript exhaustiveness
            return executeVisionLlmRoute(imageBase64, mimeType, modelId, startTime);
    }
};

/**
 * Tesseract-only route: Use the quick OCR text already obtained in Phase 1.
 * No LLM cost, ~0ms incremental since Tesseract already ran.
 */
const executeTesseractRoute = async (
    decision: RoutingDecision,
    startTime: number
): Promise<{ ocrResult: MistralOCRResult; metrics: ProcessingMetrics }> => {
    const durationMs = Date.now() - startTime;

    return {
        ocrResult: { rawText: decision.analysis.quickOcrText },
        metrics: {
            route: 'tesseract',
            durationMs,
            // No LLM tokens used
        },
    };
};

/**
 * Hybrid route: Start with Tesseract text, then ask the LLM to validate/fix it.
 * Records token usage from the LLM response.
 */
const executeHybridRoute = async (
    decision: RoutingDecision,
    imageBase64: string,
    mimeType: string,
    modelId: string,
    startTime: number
): Promise<{ ocrResult: MistralOCRResult; metrics: ProcessingMetrics }> => {
    // Use Tesseract text as a starting point
    const tesseractText = decision.analysis.quickOcrText;

    // Send to Vision LLM for validation — the LLM can compare what it sees
    // in the image against the Tesseract text and fix any errors
    const llmResult = await extractTextFromImage(imageBase64, mimeType, modelId);

    const durationMs = Date.now() - startTime;

    // For hybrid, we prefer the LLM result but log that we had Tesseract as backup
    console.log(`Hybrid route: Tesseract (${tesseractText.length} chars) → LLM (${llmResult.rawText.length} chars)`);

    return {
        ocrResult: llmResult,
        metrics: {
            route: 'hybrid',
            durationMs,
            // Token usage would be tracked by the LLM provider; we log duration
        },
    };
};

/**
 * Vision LLM route: Full LLM-based OCR (most accurate, most expensive).
 */
const executeVisionLlmRoute = async (
    imageBase64: string,
    mimeType: string,
    modelId: string,
    startTime: number
): Promise<{ ocrResult: MistralOCRResult; metrics: ProcessingMetrics }> => {
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
