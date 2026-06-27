import { createWorker, Worker } from 'tesseract.js';
import { ImageAnalysisResult } from '../types';

/**
 * Singleton Tesseract worker — initialized lazily, reused across requests.
 * Workers are expensive to create (~2-4s) but subsequent calls are fast.
 */
let workerPromise: Promise<Worker> | null = null;

const getWorker = (): Promise<Worker> => {
    if (!workerPromise) {
        workerPromise = createWorker('eng');
    }
    return workerPromise;
};

/**
 * Tesseract.js relies on a WASM core + downloaded language data that are not
 * bundled into serverless deployments (e.g. Vercel's `/var/task`), where a
 * missing `tesseract-core-simd.wasm` aborts the WASM runtime and crashes the
 * whole function process. In those environments we skip the local Tesseract
 * pass entirely and let the vision-LLM route handle OCR.
 *
 * Auto-disabled on Vercel; can also be forced off via DISABLE_TESSERACT_OCR.
 */
const isTesseractDisabled = (): boolean =>
    process.env.DISABLE_TESSERACT_OCR === 'true' || process.env.VERCEL === '1';

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
 * Detect complex layout from Tesseract word-level data.
 * Heuristic: if words span more than 3 distinct horizontal zones → complex layout.
 */
const detectComplexLayout = (words: Array<{ bbox: { x0: number; x1: number }; text: string }>): boolean => {
    if (words.length < 5) return false;

    // Bucket word x0-positions into zones (every 50 pixels)
    const zones = new Set<number>();
    for (const w of words) {
        if (w.text.trim().length > 0) {
            zones.add(Math.floor(w.bbox.x0 / 50));
        }
    }
    return zones.size > 5;
};

/**
 * Detect handwriting heuristic.
 * Handwriting typically shows: low average confidence and high per-word confidence variance.
 */
const detectHandwriting = (
    words: Array<{ confidence: number; text: string }>,
    overallConfidence: number
): boolean => {
    if (overallConfidence >= 70) return false;

    const validWords = words.filter((w) => w.text.trim().length > 1);
    if (validWords.length < 3) return false;

    const confidences = validWords.map((w) => w.confidence);
    const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance = confidences.reduce((a, c) => a + (c - mean) ** 2, 0) / confidences.length;
    const stdDev = Math.sqrt(variance);

    // High variance in per-word confidence + low overall → handwriting
    return stdDev > 20 && overallConfidence < 60;
};

/**
 * Phase 1: Analyze an image to determine its quality characteristics.
 * Returns metrics used by the routing decision in Phase 2.
 */
export const analyzeImage = async (
    imageBuffer: Buffer,
    mimeType: string
): Promise<ImageAnalysisResult> => {
    // Run pixel analysis and Tesseract in parallel. When Tesseract is disabled
    // (serverless), skip it and force the vision-LLM route via confidence 0.
    const tesseractEnabled = !isTesseractDisabled();
    const [pixelData, tesseractResult] = await Promise.all([
        decodePixels(imageBuffer, mimeType),
        tesseractEnabled
            ? runQuickTesseract(imageBuffer)
            : Promise.resolve({ confidence: 0, text: '', words: [] }),
    ]);

    if (!tesseractEnabled) {
        console.log('Tesseract OCR disabled in this environment; routing to vision LLM.');
    }

    const luminance = extractLuminance(pixelData.data);

    return {
        contrast: computeContrast(luminance),
        sharpness: computeSharpness(luminance, pixelData.width, pixelData.height),
        tesseractConfidence: tesseractResult.confidence,
        isComplexLayout: detectComplexLayout(tesseractResult.words),
        isHandwriting: detectHandwriting(tesseractResult.words, tesseractResult.confidence),
        quickOcrText: tesseractResult.text,
    };
};

/**
 * Run a quick Tesseract recognition pass on the image.
 */
const runQuickTesseract = async (
    imageBuffer: Buffer
): Promise<{
    confidence: number;
    text: string;
    words: Array<{ confidence: number; text: string; bbox: { x0: number; x1: number } }>;
}> => {
    try {
        const worker = await getWorker();
        const result = await worker.recognize(imageBuffer);

        const words =
            result.data.words?.map((w: any) => ({
                confidence: w.confidence ?? 0,
                text: w.text ?? '',
                bbox: w.bbox ?? { x0: 0, x1: 0 },
            })) ?? [];

        return {
            confidence: result.data.confidence ?? 0,
            text: result.data.text ?? '',
            words,
        };
    } catch (error) {
        console.error('Quick Tesseract scan failed:', error);
        return { confidence: 0, text: '', words: [] };
    }
};

// Export for testing
export { computeContrast, computeSharpness, detectComplexLayout, detectHandwriting };
