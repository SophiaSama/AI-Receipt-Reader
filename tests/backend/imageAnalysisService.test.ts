import { describe, it, expect } from 'vitest';
import {
    computeContrast,
    computeSharpness,
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
});
