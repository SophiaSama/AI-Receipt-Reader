/**
 * Client-side image compression and downscaling utility for SmartReceiptReader.
 *
 * Real smartphone camera photos are often 12-48MP (5-15MB+), which exceeds
 * serverless payload limits (Vercel 4.5MB HTTP 413) and causes severe memory/CPU
 * spikes during server-side pixel analysis.
 *
 * This utility downscales images to an optimal resolution for Vision LLMs
 * (default 1800px on the longest edge) and compresses them to high-clarity JPEG
 * (quality ~0.82), reducing file sizes by ~90-95% (to ~300-600KB) with zero loss
 * in OCR readability.
 */

export interface CompressionOptions {
  /** Maximum width or height in pixels. Default: 1800 */
  maxDimension?: number;
  /** JPEG compression quality between 0 and 1. Default: 0.82 */
  quality?: number;
  /** Target max file size in bytes to bypass re-encoding if already small. Default: 800KB */
  bypassSizeThresholdBytes?: number;
}

const DEFAULT_MAX_DIMENSION = 1800;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_BYPASS_THRESHOLD = 800 * 1024; // 800 KB

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/bmp',
];

/**
 * Calculates aspect-ratio-preserving dimensions that fit within maxDimension.
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = DEFAULT_MAX_DIMENSION
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }

  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  if (width > height) {
    const targetWidth = maxDimension;
    const targetHeight = Math.max(1, Math.round((height * maxDimension) / width));
    return { width: targetWidth, height: targetHeight };
  } else {
    const targetHeight = maxDimension;
    const targetWidth = Math.max(1, Math.round((width * maxDimension) / height));
    return { width: targetWidth, height: targetHeight };
  }
}

/**
 * Loads an image from a File into an HTMLImageElement or ImageBitmap.
 */
async function loadImageSource(
  file: File
): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  // Use createImageBitmap if available in modern browsers / web workers
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          if (typeof bitmap.close === 'function') {
            bitmap.close();
          }
        },
      };
    } catch {
      // Fall through to HTMLImageElement on bitmap decode failure
    }
  }

  // Fallback using HTMLImageElement and Object URL
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return reject(new Error('Browser environment required for image loading'));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup,
      });
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image in browser'));
    };

    img.src = objectUrl;
  });
}

/**
 * Downscales and compresses a receipt image file in the browser.
 * Always fails open: if compression fails for any unexpected environment reason,
 * it returns the original file so the user workflow is not blocked.
 */
export async function compressReceiptImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
    bypassSizeThresholdBytes = DEFAULT_BYPASS_THRESHOLD,
  } = options;

  // Non-browser environment check
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  // Only compress supported image mime types
  const mime = (file.type || '').toLowerCase();
  const isImage = SUPPORTED_IMAGE_TYPES.includes(mime) || mime.startsWith('image/');
  if (!isImage) {
    return file;
  }

  try {
    const { source, width, height, cleanup } = await loadImageSource(file);

    try {
      // If already within dimension limits and small file size, no compression needed
      if (width <= maxDimension && height <= maxDimension && file.size <= bypassSizeThresholdBytes && mime === 'image/jpeg') {
        return file;
      }

      const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(width, height, maxDimension);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return file;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });

      if (!blob) {
        return file;
      }

      // If the compressed output is somehow larger than the original, keep original
      if (blob.size >= file.size && width <= maxDimension && height <= maxDimension) {
        return file;
      }

      const originalName = file.name || 'receipt.jpg';
      const outputName = originalName.replace(/\.[^/.]+$/, '') + '.jpg';

      return new File([blob], outputName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    } finally {
      cleanup();
    }
  } catch (err) {
    console.warn('[compressReceiptImage] Image compression failed, falling back to original:', err);
    return file;
  }
}

export const compressImage = compressReceiptImage;
