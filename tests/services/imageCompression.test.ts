import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateTargetDimensions,
  compressReceiptImage,
  compressImage,
  SUPPORTED_IMAGE_TYPES,
} from '../../services/imageCompression';

describe('imageCompression - calculateTargetDimensions', () => {
  it('preserves dimensions when already smaller than maxDimension', () => {
    const result = calculateTargetDimensions(800, 600, 1800);
    expect(result).toEqual({ width: 800, height: 600 });
  });

  it('preserves dimensions when exactly equal to maxDimension', () => {
    const result = calculateTargetDimensions(1800, 1200, 1800);
    expect(result).toEqual({ width: 1800, height: 1200 });
  });

  it('scales landscape photos proportionally to maxDimension', () => {
    // 4000 x 3000 with max 1800 -> 1800 x 1350
    const result = calculateTargetDimensions(4000, 3000, 1800);
    expect(result).toEqual({ width: 1800, height: 1350 });
  });

  it('scales portrait photos proportionally to maxDimension', () => {
    // 3024 x 4032 with max 1800 -> 1350 x 1800
    const result = calculateTargetDimensions(3000, 4000, 1800);
    expect(result).toEqual({ width: 1350, height: 1800 });
  });

  it('scales square photos proportionally to maxDimension', () => {
    const result = calculateTargetDimensions(2400, 2400, 1800);
    expect(result).toEqual({ width: 1800, height: 1800 });
  });

  it('handles zero or negative dimensions safely', () => {
    const result = calculateTargetDimensions(0, -10, 1800);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});

describe('imageCompression - compressReceiptImage', () => {
  it('supports standard image mime types', () => {
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/jpeg');
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/png');
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/webp');
  });

  it('exports compressImage as an alias of compressReceiptImage', () => {
    expect(compressImage).toBe(compressReceiptImage);
  });

  it('returns non-image files untouched without attempting compression', async () => {
    const pdfFile = new File(['%PDF-1.4 mock content'], 'receipt.pdf', {
      type: 'application/pdf',
    });
    const result = await compressReceiptImage(pdfFile);
    expect(result).toBe(pdfFile);
  });

  describe('canvas downscaling and compression in browser environment', () => {
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalDocument = globalThis.document;
    const originalWindow = (globalThis as any).window;

    beforeEach(() => {
      // Mock window and document
      (globalThis as any).window = {};

      const mockCanvas: any = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
          imageSmoothingEnabled: false,
          imageSmoothingQuality: 'low',
        }),
        toBlob: vi.fn((cb: (b: Blob | null) => void) => {
          const mockBlob = new Blob(['compressed-image-binary-data'], { type: 'image/jpeg' });
          cb(mockBlob);
        }),
      };

      (globalThis as any).document = {
        createElement: vi.fn((tag: string) => {
          if (tag === 'canvas') return mockCanvas;
          return {};
        }),
      };

      // Mock createImageBitmap
      (globalThis as any).createImageBitmap = vi.fn().mockResolvedValue({
        width: 4000,
        height: 3000,
        close: vi.fn(),
      });
    });

    afterEach(() => {
      (globalThis as any).createImageBitmap = originalCreateImageBitmap;
      (globalThis as any).document = originalDocument;
      (globalThis as any).window = originalWindow;
      vi.restoreAllMocks();
    });

    it('downscales large photos and converts to JPEG', async () => {
      // Create a mock 8MB file
      const rawContent = new Uint8Array(8 * 1024 * 1024);
      const largeFile = new File([rawContent], 'IMG_2026_receipt.PNG', {
        type: 'image/png',
      });

      const compressed = await compressReceiptImage(largeFile, {
        maxDimension: 1800,
        quality: 0.82,
      });

      expect(compressed).not.toBe(largeFile);
      expect(compressed.type).toBe('image/jpeg');
      expect(compressed.name).toBe('IMG_2026_receipt.jpg');
      expect(compressed.size).toBeLessThan(largeFile.size);
    });

    it('bypasses re-encoding if image is already small JPEG within max dimensions', async () => {
      // Mock bitmap dimensions within maxDimension
      (globalThis as any).createImageBitmap = vi.fn().mockResolvedValue({
        width: 1200,
        height: 900,
        close: vi.fn(),
      });

      const smallFile = new File(['small jpeg content'], 'small.jpg', {
        type: 'image/jpeg',
      });

      const result = await compressReceiptImage(smallFile, {
        maxDimension: 1800,
        bypassSizeThresholdBytes: 800 * 1024,
      });

      expect(result).toBe(smallFile);
    });

    it('fails open and returns original file if canvas decoding throws', async () => {
      (globalThis as any).createImageBitmap = vi.fn().mockRejectedValue(new Error('Decode error'));

      const file = new File(['corrupted data'], 'corrupt.jpg', {
        type: 'image/jpeg',
      });

      const result = await compressReceiptImage(file);
      expect(result).toBe(file);
    });
  });
});
