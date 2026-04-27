import { describe, it, expect } from 'vitest';
import {
    computeContrast,
    computeSharpness,
    detectComplexLayout,
    detectHandwriting,
} from '@backend/services/imageAnalysisService';

describe('imageAnalysisService', () => {
    describe('computeContrast', () => {
        it('returns 0 for uniform luminance', () => {
            const lum = new Float32Array([128, 128, 128, 128]);
            expect(computeContrast(lum)).toBe(0);
        });

        it('returns high value for max contrast', () => {
            // Alternating black and white pixels
            const lum = new Float32Array([0, 255, 0, 255, 0, 255]);
            const contrast = computeContrast(lum);
            expect(contrast).toBeGreaterThan(0.9);
        });

        it('returns ~0.5 for empty array', () => {
            expect(computeContrast(new Float32Array(0))).toBe(0.5);
        });

        it('returns moderate value for moderate variance', () => {
            const lum = new Float32Array([100, 120, 140, 160, 180]);
            const contrast = computeContrast(lum);
            expect(contrast).toBeGreaterThan(0.1);
            expect(contrast).toBeLessThan(0.5);
        });
    });

    describe('computeSharpness', () => {
        it('returns 0.5 for image too small', () => {
            const lum = new Float32Array([128, 128, 128, 128]);
            expect(computeSharpness(lum, 2, 2)).toBe(0.5);
        });

        it('returns 0 for perfectly uniform 3x3 image', () => {
            // All same value → Laplacian = 0 everywhere
            const lum = new Float32Array([128, 128, 128, 128, 128, 128, 128, 128, 128]);
            expect(computeSharpness(lum, 3, 3)).toBe(0);
        });

        it('returns high value for a strong edge', () => {
            // 3x3 with a strong center pixel
            const lum = new Float32Array([
                0, 0, 0,
                0, 255, 0,
                0, 0, 0,
            ]);
            const sharpness = computeSharpness(lum, 3, 3);
            expect(sharpness).toBeGreaterThan(0.5);
        });
    });

    describe('detectComplexLayout', () => {
        it('returns false for few words', () => {
            const words = [
                { bbox: { x0: 10, x1: 100 }, text: 'hello' },
                { bbox: { x0: 10, x1: 100 }, text: 'world' },
            ];
            expect(detectComplexLayout(words)).toBe(false);
        });

        it('returns false for words in similar zones', () => {
            const words = Array.from({ length: 10 }, (_, i) => ({
                bbox: { x0: 10 + i * 2, x1: 100 },
                text: `word${i}`,
            }));
            expect(detectComplexLayout(words)).toBe(false);
        });

        it('returns true for words scattered across many zones', () => {
            // Words at x0 = 0, 100, 200, 300, 400, 500 → 6+ zones
            const words = Array.from({ length: 8 }, (_, i) => ({
                bbox: { x0: i * 100, x1: i * 100 + 50 },
                text: `word${i}`,
            }));
            expect(detectComplexLayout(words)).toBe(true);
        });
    });

    describe('detectHandwriting', () => {
        it('returns false when overall confidence is high', () => {
            const words = [
                { confidence: 90, text: 'hello' },
                { confidence: 88, text: 'world' },
                { confidence: 85, text: 'test' },
            ];
            expect(detectHandwriting(words, 88)).toBe(false);
        });

        it('returns false with too few words', () => {
            const words = [
                { confidence: 20, text: 'ab' },
                { confidence: 10, text: 'cd' },
            ];
            expect(detectHandwriting(words, 15)).toBe(false);
        });

        it('returns true for low confidence with high variance', () => {
            const words = [
                { confidence: 10, text: 'hello' },
                { confidence: 80, text: 'world' },
                { confidence: 15, text: 'test' },
                { confidence: 75, text: 'more' },
            ];
            expect(detectHandwriting(words, 45)).toBe(true);
        });

        it('returns false when confidence is low but variance is also low', () => {
            const words = [
                { confidence: 40, text: 'hello' },
                { confidence: 42, text: 'world' },
                { confidence: 38, text: 'test' },
            ];
            // stdDev ~ 1.6, which is < 20
            expect(detectHandwriting(words, 40)).toBe(false);
        });
    });
});
