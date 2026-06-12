import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  extractBearerToken,
  mapRowToReceipt,
  mapReceiptToRow,
  createUserClient,
  createSupabaseReceiptService,
  RECEIPTS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from '@backend/services/supabaseService';
import type { ReceiptData } from '@backend/types';

function makeFromBuilder(result: { data: any; error: any }) {
  const builder: any = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.insert = vi.fn(chain);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (onFulfilled: any, onRejected?: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

function makeStorageBucket(overrides: Record<string, any> = {}) {
  return {
    createSignedUrl: vi.fn(async (path: string) => ({ data: { signedUrl: `https://signed/${path}` }, error: null })),
    upload: vi.fn(async (path: string) => ({ data: { path }, error: null })),
    remove: vi.fn(async () => ({ data: {}, error: null })),
    ...overrides,
  };
}

function makeClient(opts: { fromResult?: { data: any; error: any }; user?: any; userError?: any; storage?: any } = {}) {
  const bucket = opts.storage ?? makeStorageBucket();
  const fromBuilder = makeFromBuilder(opts.fromResult ?? { data: [], error: null });
  const client = {
    from: vi.fn(() => fromBuilder),
    storage: { from: vi.fn(() => bucket) },
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: opts.user ?? { id: 'user-1' } },
        error: opts.userError ?? null,
      })),
    },
  } as any;
  return { client, fromBuilder, bucket };
}

describe('supabaseService — token + env', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure each env-dependent test starts from a known-configured state,
    // independent of test ordering or sibling test files mutating process.env.
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'anon-key';
  });

  it('extractBearerToken parses a Bearer header (case-insensitive)', () => {
    expect(extractBearerToken({ authorization: 'Bearer abc.def' })).toBe('abc.def');
    expect(extractBearerToken({ Authorization: 'bearer xyz' })).toBe('xyz');
  });

  it('extractBearerToken returns null when missing or malformed', () => {
    expect(extractBearerToken({})).toBeNull();
    expect(extractBearerToken(undefined as any)).toBeNull();
    expect(extractBearerToken({ authorization: 'Basic foo' })).toBeNull();
  });

  it('createUserClient injects the JWT as an Authorization header', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'anon-key';

    // Inject a spy factory so the assertion is independent of cross-module
    // auto-mock binding (which is unreliable under forks-pool worker reuse).
    const factory = vi.fn(() => ({ __mock: 'client' }) as any);
    createUserClient('the-jwt', factory);

    expect(factory).toHaveBeenCalledTimes(1);
    const [url, key, opts] = factory.mock.calls[0] as any[];
    expect(url).toBe('https://test.supabase.co');
    expect(key).toBe('anon-key');
    expect(opts.global.headers.Authorization).toBe('Bearer the-jwt');
  });

  it('createUserClient throws when env is missing', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    expect(() => createUserClient('jwt')).toThrow(/SUPABASE_URL/);
  });
});

describe('supabaseService — mappers', () => {
  it('mapRowToReceipt converts snake_case + timestamptz to camelCase + epoch ms', () => {
    const row = {
      id: 'r1', user_id: 'u1', date: '2026-03-06', total: '12.34', currency: 'USD',
      merchant_name: 'Acme', items: [{ description: 'x', price: 1 }],
      image_url: 'u1/abc.jpg', image_hash: 'h', ocr_fingerprint: 'f', raw_text: 'raw',
      ocr_route: 'tesseract', processing_metrics: { route: 'tesseract', durationMs: 5 },
      created_at: '2026-03-06T10:00:00.000Z',
    };
    const r = mapRowToReceipt(row as any);
    expect(r.merchantName).toBe('Acme');
    expect(r.total).toBe(12.34);
    expect(r.imageUrl).toBe('u1/abc.jpg'); // path when no signed url passed
    expect(r.ocrRoute).toBe('tesseract');
    expect(r.createdAt).toBe(new Date('2026-03-06T10:00:00.000Z').getTime());
  });

  it('mapReceiptToRow converts camelCase to snake_case and omits user_id/created_at', () => {
    const receipt: ReceiptData = {
      id: 'r1', date: '2026-03-06', total: 9.5, currency: 'SGD', merchantName: 'Store',
      items: [], imageUrl: 'u1/abc.jpg', imageHash: 'h', ocrFingerprint: 'f', rawText: 'raw',
      ocrRoute: 'vision_llm', createdAt: 123,
    };
    const row = mapReceiptToRow(receipt);
    expect(row.merchant_name).toBe('Store');
    expect(row.image_url).toBe('u1/abc.jpg');
    expect(row.ocr_route).toBe('vision_llm');
    expect(row).not.toHaveProperty('user_id');
    expect(row).not.toHaveProperty('created_at');
    expect(row).not.toHaveProperty('merchantName');
  });
});

describe('supabaseService — receipt service', () => {
  it('getUserId returns the authenticated user id', async () => {
    const { client } = makeClient({ user: { id: 'user-42' } });
    const service = createSupabaseReceiptService(client);
    await expect(service.getUserId()).resolves.toBe('user-42');
  });

  it('getUserId throws when there is no user', async () => {
    const { client } = makeClient({ user: null, userError: { message: 'no session' } });
    const service = createSupabaseReceiptService(client);
    await expect(service.getUserId()).rejects.toThrow(/Unauthorized/);
  });

  it('uploadImage stores under the user folder and returns the path', async () => {
    const { client, bucket } = makeClient();
    const service = createSupabaseReceiptService(client, { generateId: () => 'gen' });

    const path = await service.uploadImage('user-1', Buffer.from([1, 2, 3]), 'r.png', 'image/png');

    expect(client.storage.from).toHaveBeenCalledWith(RECEIPTS_BUCKET);
    expect(bucket.upload.mock.calls[0][0]).toBe('user-1/gen.png');
    expect(path).toBe('user-1/gen.png');
  });

  it('listReceipts selects ordered rows scoped by RLS and maps them', async () => {
    const rows = [{
      id: 'r1', date: '2026-03-06', total: 1, currency: 'USD', merchant_name: 'A', items: [],
      image_url: 'u1/a.jpg', image_hash: null, ocr_fingerprint: null, raw_text: null,
      ocr_route: null, processing_metrics: null, created_at: '2026-03-06T10:00:00.000Z',
    }];
    const { client, fromBuilder } = makeClient({ fromResult: { data: rows, error: null } });
    const service = createSupabaseReceiptService(client);

    const result = await service.listReceipts();

    expect(client.from).toHaveBeenCalledWith('receipts');
    expect(fromBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result[0].merchantName).toBe('A');
  });

  it('insertReceipt inserts a mapped row and returns the mapped receipt', async () => {
    const insertedRow = {
      id: 'r1', date: '2026-03-06', total: 5, currency: 'USD', merchant_name: 'Dup', items: [],
      image_url: 'u1/x.jpg', image_hash: 'h', ocr_fingerprint: 'f', raw_text: null,
      ocr_route: null, processing_metrics: null, created_at: '2026-03-06T10:00:00.000Z',
    };
    const { client, fromBuilder } = makeClient({ fromResult: { data: insertedRow, error: null } });
    const service = createSupabaseReceiptService(client);

    const receipt = {
      id: 'r1', date: '2026-03-06', total: 5, currency: 'USD', merchantName: 'Dup',
      items: [], imageUrl: 'u1/x.jpg', imageHash: 'h', ocrFingerprint: 'f', createdAt: 1,
    } as ReceiptData;
    const result = await service.insertReceipt(receipt);

    expect(fromBuilder.insert).toHaveBeenCalled();
    expect(result.merchantName).toBe('Dup');
    expect(result.imageUrl).toBe('u1/x.jpg');
  });

  it('createSignedUrl returns a signed URL for a stored path', async () => {
    const { client, bucket } = makeClient();
    const service = createSupabaseReceiptService(client);

    const url = await service.createSignedUrl('u1/a.jpg');

    expect(bucket.createSignedUrl).toHaveBeenCalledWith('u1/a.jpg', SIGNED_URL_TTL_SECONDS);
    expect(url).toBe('https://signed/u1/a.jpg');
  });

  it('removeImage deletes the storage object', async () => {
    const { client, bucket } = makeClient();
    const service = createSupabaseReceiptService(client);

    await service.removeImage('u1/a.jpg');

    expect(bucket.remove).toHaveBeenCalledWith(['u1/a.jpg']);
  });
});
