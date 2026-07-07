/**
 * Client-side image compression to keep uploads under the serverless request
 * body limit. Vercel serverless functions reject bodies larger than ~4.5MB with
 * a 413 FUNCTION_PAYLOAD_TOO_LARGE error before the function even runs, so large
 * phone photos (often 5-12MB) must be downscaled/re-encoded in the browser first.
 */

/** Stay safely below Vercel's ~4.5MB body limit, leaving room for multipart overhead. */
const DEFAULT_MAX_BYTES = 4_000_000;
/** Longest edge (px) to scale down to on the first pass; large photos rarely need more for OCR. */
const DEFAULT_MAX_DIMENSION = 2200;
/** Only bother compressing files above this size. */
const COMPRESSION_THRESHOLD_BYTES = 3_800_000;

export interface CompressImageOptions {
  maxBytes?: number;
  maxDimension?: number;
}

/** True when the DOM/Canvas APIs needed for compression are available (i.e. a browser). */
function canCompress(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function' &&
    typeof createImageBitmap === 'function'
  );
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

/**
 * Returns a compressed JPEG File when the input is a large raster image, or the
 * original file otherwise (non-image, already small, or unsupported environment).
 * Never throws — on any failure it falls back to returning the original file so
 * upload behavior is unchanged.
 */
export async function compressImage(file: File, options: CompressImageOptions = {}): Promise<File> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;

  const isImage = typeof file.type === 'string' && file.type.startsWith('image/');
  if (!isImage || file.size <= COMPRESSION_THRESHOLD_BYTES || !canCompress()) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let width = bitmap.width;
    let height = bitmap.height;

    const largestEdge = Math.max(width, height);
    if (largestEdge > maxDimension) {
      const scale = maxDimension / largestEdge;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    // Step quality down until the encoded blob fits under the byte budget.
    const qualities = [0.85, 0.7, 0.55, 0.4];
    let best: Blob | null = null;
    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, quality);
      if (!blob) continue;
      best = blob;
      if (blob.size <= maxBytes) break;
    }

    if (!best || best.size >= file.size) {
      return file;
    }

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([best], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}
