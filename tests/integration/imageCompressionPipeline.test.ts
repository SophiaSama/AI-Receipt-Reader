import { describe, it, expect, vi } from 'vitest';
import { createReceiptService } from '../../services/receiptService';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handler as processHandler } from '../../backend/src/handlers/processReceipt';
import type { APIGatewayProxyEvent } from '../../backend/src/types';

describe('Image Compression Pipeline Integration Tests', () => {
  it('processAndSaveReceipt compresses large images before sending to /api/process', async () => {
    let capturedFormData: FormData | null = null;

    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/api/process')) {
        capturedFormData = init?.body as FormData;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'mock-receipt-1',
            merchantName: 'Trader Joe',
            date: '2026-03-01',
            total: 42.50,
            currency: 'USD',
            items: [{ description: 'Organic Milk', price: 4.50 }],
            imageUrl: 'https://example.com/mock.jpg',
            createdAt: Date.now(),
          }),
        } as unknown as Response;
      }
      return { ok: false, status: 404 } as unknown as Response;
    });

    const mockCompressFn = vi.fn(async (file: File) => {
      // Simulate downscaling an 8MB photo to 450KB JPEG
      const compressedBytes = new Uint8Array(450 * 1024);
      return new File([compressedBytes], 'photo_compressed.jpg', {
        type: 'image/jpeg',
      });
    });

    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-123' }, access_token: 'valid-jwt' } },
          error: null,
        }),
      },
    } as unknown as SupabaseClient;

    const receiptService = createReceiptService({
      client,
      fetchFn: mockFetch as unknown as typeof fetch,
      getAccessToken: () => Promise.resolve('valid-jwt'),
      compressFn: mockCompressFn,
    });

    const largeCameraPhoto = new File([new Uint8Array(8 * 1024 * 1024)], 'IMG_9999.JPG', {
      type: 'image/jpeg',
    });

    const result = await receiptService.processAndSaveReceipt(largeCameraPhoto, {
      modelId: 'google/gemini-2.5-flash',
    });

    // 1. Verify compression function was invoked with the original photo
    expect(mockCompressFn).toHaveBeenCalledTimes(1);
    expect(mockCompressFn).toHaveBeenCalledWith(largeCameraPhoto);

    // 2. Verify the FormData received by the server contains the compressed file
    expect(capturedFormData).not.toBeNull();
    const sentFile = capturedFormData!.get('file') as File;
    expect(sentFile).toBeDefined();
    expect(sentFile.name).toBe('photo_compressed.jpg');
    expect(sentFile.type).toBe('image/jpeg');
    expect(sentFile.size).toBe(450 * 1024); // 450 KB, well below Vercel's 4.5MB limit!

    // 3. Verify the model parameter was forwarded
    expect(capturedFormData!.get('model')).toBe('google/gemini-2.5-flash');

    // 4. Verify the structured receipt result
    expect((result as any).merchantName).toBe('Trader Joe');
    expect((result as any).total).toBe(42.50);
  });

  it('saveManualReceiptToDB compresses attached photo before saving to Supabase Storage', async () => {
    let uploadedFile: File | null = null;

    const mockStorage = {
      upload: vi.fn(async (path: string, file: File) => {
        uploadedFile = file;
        return { data: { path }, error: null };
      }),
      createSignedUrl: vi.fn(async (path: string) => ({
        data: { signedUrl: `https://signed.example.com/${path}` },
        error: null,
      })),
    };

    const mockFrom = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'manual-1',
              merchant_name: 'Manual Store',
              total: 15.0,
              currency: 'USD',
              date: '2026-03-01',
              image_url: 'user-123/manual-1.jpg',
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    });

    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-123' } } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue(mockStorage),
      },
      from: mockFrom,
    } as unknown as SupabaseClient;

    const mockCompressFn = vi.fn(async (file: File) => {
      return new File([new Uint8Array(300 * 1024)], 'manual_compressed.jpg', {
        type: 'image/jpeg',
      });
    });

    const receiptService = createReceiptService({
      client,
      compressFn: mockCompressFn,
    });

    const largeManualPhoto = new File([new Uint8Array(10 * 1024 * 1024)], 'receipt_huge.png', {
      type: 'image/png',
    });

    await receiptService.saveManualReceiptToDB(
      { merchantName: 'Manual Store', total: 15.0, currency: 'USD' },
      largeManualPhoto
    );

    expect(mockCompressFn).toHaveBeenCalledTimes(1);
    expect(uploadedFile).not.toBeNull();
    expect(uploadedFile!.name).toBe('manual_compressed.jpg');
    expect(uploadedFile!.size).toBe(300 * 1024);
  });

  it('backend handler returns 400 Bad Request when receiving an uncompressed file > 5MB', async () => {
    // Generate a multipart payload exceeding 5MB
    const boundary = '----WebKitFormBoundaryIntegrationTest';
    const overSizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x41); // 5.5 MB of 'A'

    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="huge.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const bodyBuffer = Buffer.concat([Buffer.from(header), overSizedBuffer, Buffer.from(footer)]);

    const event: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      path: '/api/process',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        authorization: 'Bearer mock-token-for-test',
      },
      isBase64Encoded: true,
      body: bodyBuffer.toString('base64'),
    };

    const response = await processHandler(event as APIGatewayProxyEvent);

    expect(response.statusCode).toBe(400);
    const parsed = JSON.parse(response.body);
    expect(parsed.error).toContain('File too large');
  });
});
