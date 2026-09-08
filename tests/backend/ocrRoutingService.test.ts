import { describe, it, expect } from 'vitest';
import { decideRoute } from '@backend/services/ocrRoutingService';
import { ImageAnalysisResult } from '@backend/types';

/**
 * Helper to build an ImageAnalysisResult with sensible defaults,
 * overriding only the fields relevant to each test.
 */
const makeAnalysis = (overrides: Partial<ImageAnalysisResult> = {}): ImageAnalysisResult => ({
    contrast: 0.6,
    sharpness: 0.6,
    tesseractConfidence: 0,
    isComplexLayout: false,
    isHandwriting: false,
    quickOcrText: '',
    ...overrides,
});

describe('ocrRoutingService – decideRoute', () => {
    it('always routes to vision_llm regardless of analysis values', () => {
        const decision = decideRoute(makeAnalysis());
        expect(decision.route).toBe('vision_llm');
    });

    it('routes to vision_llm even with high confidence values', () => {
        const decision = decideRoute(makeAnalysis({
            tesseractConfidence: 95,
            contrast: 0.9,
            sharpness: 0.9,
        }));
        expect(decision.route).toBe('vision_llm');
    });

    it('routes to vision_llm for low quality images', () => {
        const decision = decideRoute(makeAnalysis({
            tesseractConfidence: 10,
            contrast: 0.1,
            sharpness: 0.1,
        }));
        expect(decision.route).toBe('vision_llm');
    });

    it('routes to vision_llm for complex layouts', () => {
        const decision = decideRoute(makeAnalysis({
            isComplexLayout: true,
        }));
        expect(decision.route).toBe('vision_llm');
    });

    it('routes to vision_llm for handwriting', () => {
        const decision = decideRoute(makeAnalysis({
            isHandwriting: true,
        }));
        expect(decision.route).toBe('vision_llm');
    });

    it('includes the analysis object in the decision', () => {
        const analysis = makeAnalysis();
        const decision = decideRoute(analysis);
        expect(decision.analysis).toBe(analysis);
    });

    it('always returns a valid route string', () => {
        const decision = decideRoute(makeAnalysis({ tesseractConfidence: 0 }));
        expect(['tesseract', 'hybrid', 'vision_llm']).toContain(decision.route);
    });
});
