import { ImageAnalysisResult } from '../types';

/**
 * Decode raw image bytes into a flat array of RGBA pixels.
 * Supports JPEG and PNG via pure-JS decoders (jpeg-js / pngjs).
 * Falls back to a zero-length buffer if decoding fails.
 */
const decodePixels = async (
    buffer: Buffer,
    mimeType: string
): Promise<{ data: Uint8Array; width: number; height: number }> => {
    try {
        if (mimeType === 'image/png') {
            const { PNG } = await import('pngjs');
            const png = PNG.sync.read(buffer);
            return { data: png.data, width: png.width, height: png.height };
        }

        // JPEG (and fallback for other types)
        const jpeg = await import('jpeg-js');
        const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
        return { data: decoded.data, width: decoded.width, height: decoded.height };
    } catch (err) {
        console.warn('Image pixel decode failed, using fallback metrics:', err);
        return { data: new Uint8Array(0), width: 0, height: 0 };
    }
};

/**
 * Compute luminance values from RGBA pixel array.
 * Uses standard BT.601 coefficients: Y = 0.299R + 0.587G + 0.114B
 */
const extractLuminance = (rgba: Uint8Array): Float32Array => {
    const pixelCount = rgba.length / 4;
    const lum = new Float32Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
        const offset = i * 4;
        lum[i] = 0.299 * rgba[offset] + 0.587 * rgba[offset + 1] + 0.114 * rgba[offset + 2];
    }
    return lum;
};

/**
 * Compute image contrast as normalized standard deviation of luminance.
 * Returns 0-1 where 0 = uniform, 1 = max contrast.
 */
const computeContrast = (luminance: Float32Array): number => {
    if (luminance.length === 0) return 0.5;

    let sum = 0;
    for (let i = 0; i < luminance.length; i++) sum += luminance[i];
    const mean = sum / luminance.length;

    let variance = 0;
    for (let i = 0; i < luminance.length; i++) {
        const diff = luminance[i] - mean;
        variance += diff * diff;
    }
    variance /= luminance.length;

    // Normalize: max possible std dev is 127.5 (half of 255)
    return Math.min(Math.sqrt(variance) / 127.5, 1);
};

/**
 * Estimate image sharpness via Laplacian variance on luminance.
 * Higher variance = sharper image.
 * Returns 0-1 normalized.
 */
const computeSharpness = (luminance: Float32Array, width: number, height: number): number => {
    if (width < 3 || height < 3) return 0.5;

    let laplacianSum = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            // Laplacian kernel: center*4 - top - bottom - left - right
            const lap =
                4 * luminance[idx] -
                luminance[(y - 1) * width + x] -
                luminance[(y + 1) * width + x] -
                luminance[y * width + (x - 1)] -
                luminance[y * width + (x + 1)];
            laplacianSum += lap * lap;
            count++;
        }
    }

    if (count === 0) return 0.5;

    const variance = laplacianSum / count;
    // Empirical normalization: variance of ~2000 is very sharp for receipts
    return Math.min(variance / 2000, 1);
};

/**
 * Phase 1: Analyze an image to determine its quality characteristics.
 * Returns metrics used by the routing decision in Phase 2.
 *
 * Tesseract.js has been removed to reduce Docker image size (~3GB → ~300MB).
 * All OCR now routes through the Vision LLM, which is more accurate.
 * Pixel-level analysis (contrast, sharpness) is still performed for diagnostics.
 */
export const analyzeImage = async (
    imageBuffer: Buffer,
    mimeType: string
): Promise<ImageAnalysisResult> => {
    const pixelData = await decodePixels(imageBuffer, mimeType);
    const luminance = extractLuminance(pixelData.data);

    return {
        contrast: computeContrast(luminance),
        sharpness: computeSharpness(luminance, pixelData.width, pixelData.height),
        tesseractConfidence: 0,
        isComplexLayout: false,
        isHandwriting: false,
        quickOcrText: '',
    };
};

// Export for testing
export { computeContrast, computeSharpness };
