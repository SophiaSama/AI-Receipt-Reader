import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createReceiptService,
  mapRowToReceipt,
  mapReceiptToRow,
} from '../../services/receiptService';
import type { ReceiptData } from '../../types';

function makeFromBuilder(result: { data: any; error: any }) {
  const builder: any = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.insert = vi.fn(chain);
  builder.delete = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.in = vi.fn(chain);
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

function makeClient(opts: { fromResult?: { data: any; error: any }; session?: any; storage?: any } = {}) {
  const bucket = opts.storage ?? makeStorageBucket();
  const fromBuilder = makeFromBuilder(opts.fromResult ?? { data: [], error: null });
  const client = {
    from: vi.fn(() => fromBuilder),
    storage: { from: vi.fn(() => bucket) },
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: opts.session ?? { user: { id: 'u1' } } },
        error: null,
      })),
    },
  } as unknown as SupabaseClient;
  return { client, fromBuilder, bucket };
}

describe('receiptService mappers', () => {
  it('mapRowToReceipt converts snake_case + timestamptz to camelCase + epoch ms', () => {
    const row = {
      id: 'r1', user_id: 'u1', date: '2026-03-06', total: '12.34', currency: 'USD',
      merchant_name: 'Acme', items: [{ description: 'x', price: 1 }],
      image_url: 'u1/abc.jpg', image_hash: 'h', ocr_fingerprint: 'f', raw_text: 'raw',
      ocr_route: 'tesseract', processing_metrics: null, created_at: '2026-03-06T10:00:00.000Z',
    };
    const r = mapRowToReceipt(row as any, 'https://signed/abc.jpg');
    expect(r.id).toBe('r1');
    expect(r.merchantName).toBe('Acme');
    expect(r.total).toBe(12.34);
    expect(r.currency).toBe('USD');
    expect(r.imageUrl).toBe('https://signed/abc.jpg');
    expect(r.imageHash).toBe('h');
    expect(r.ocrFingerprint).toBe('f');
    expect(r.items).toEqual([{ description: 'x', price: 1 }]);
    expect(r.createdAt).toBe(new Date('2026-03-06T10:00:00.000Z').getTime());
  });

  it('mapReceiptToRow converts camelCase to snake_case and omits user_id/created_at/camel keys', () => {
    const receipt: ReceiptData = {
      id: 'r1', date: '2026-03-06', total: 9.5, currency: 'SGD', merchantName: 'Store',
      items: [], imageUrl: 'u1/abc.jpg', imageHash: 'h', ocrFingerprint: 'f', rawText: 'raw',
      createdAt: 123,
    };
    const row = mapReceiptToRow(receipt);
    expect(row.merchant_name).toBe('Store');
    expect(row.image_url).toBe('u1/abc.jpg');
    expect(row.image_hash).toBe('h');
    expect(row.ocr_fingerprint).toBe('f');
    expect(row.raw_text).toBe('raw');
    expect(row).not.toHaveProperty('user_id');
    expect(row).not.toHaveProperty('created_at');
    expect(row).not.toHaveProperty('merchantName');
    expect(row).not.toHaveProperty('imageUrl');
  });
});

describe('receiptService client CRUD', () => {
  it('fetchReceiptsFromDB selects ordered rows and attaches signed URLs', async () => {
    const rows = [{
      id: 'r1', date: '2026-03-06', total: 1, currency: 'USD', merchant_name: 'A', items: [],
      image_url: 'u1/a.jpg', image_hash: null, ocr_fingerprint: null, raw_text: null,
      ocr_route: null, processing_metrics: null, created_at: '2026-03-06T10:00:00.000Z',
    }];
    const { client, fromBuilder, bucket } = makeClient({ fromResult: { data: rows, error: null } });
    const service = createReceiptService({ client });

    const result = await service.fetchReceiptsFromDB();

    expect(client.from).toHaveBeenCalledWith('receipts');
    expect(fromBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('u1/a.jpg', 3600);
    expect(result[0].imageUrl).toBe('https://signed/u1/a.jpg');
    expect(result[0].merchantName).toBe('A');
  });

  it('deleteReceiptFromDB removes the storage object then deletes the row', async () => {
    const { client, fromBuilder, bucket } = makeClient({ fromResult: { data: { image_url: 'u1/a.jpg' }, error: null } });
    const service = createReceiptService({ client });

    await service.deleteReceiptFromDB('r1');

    expect(fromBuilder.eq).toHaveBeenCalledWith('id', 'r1');
    expect(bucket.remove).toHaveBeenCalledWith(['u1/a.jpg']);
    expect(fromBuilder.delete).toHaveBeenCalled();
  });

  it('deleteReceiptsFromDB removes storage objects and deletes rows by id list', async () => {
    const { client, fromBuilder, bucket } = makeClient({ fromResult: { data: [{ image_url: 'u1/a.jpg' }, { image_url: 'u1/b.jpg' }], error: null } });
    const service = createReceiptService({ client });

    await service.deleteReceiptsFromDB(['r1', 'r2']);

    expect(fromBuilder.in).toHaveBeenCalledWith('id', ['r1', 'r2']);
    expect(bucket.remove).toHaveBeenCalledWith(['u1/a.jpg', 'u1/b.jpg']);
  });

  it('saveManualReceiptToDB uploads file under user folder, inserts row, returns mapped receipt', async () => {
    const insertedRow = {
      id: 'gen-id', date: '2026-03-06', total: 5, currency: 'USD', merchant_name: 'Manual', items: [],
      image_url: 'u1/gen-id.png', image_hash: null, ocr_fingerprint: null, raw_text: null,
      ocr_route: null, processing_metrics: null, created_at: '2026-03-06T10:00:00.000Z',
    };
    const { client, fromBuilder, bucket } = makeClient({ fromResult: { data: insertedRow, error: null } });
    const service = createReceiptService({ client, generateId: () => 'gen-id' });
    const file = new File([new Uint8Array([1, 2, 3])], 'r.png', { type: 'image/png' });

    const result = await service.saveManualReceiptToDB(
      { merchantName: 'Manual', total: 5, currency: 'USD', date: '2026-03-06', items: [] },
      file
    );

    expect(bucket.upload).toHaveBeenCalled();
    expect(bucket.upload.mock.calls[0][0]).toBe('u1/gen-id.png');
    expect(fromBuilder.insert).toHaveBeenCalled();
    expect(result.merchantName).toBe('Manual');
    expect(result.imageUrl).toBe('https://signed/u1/gen-id.png');
  });

  it('processAndSaveReceipt posts to /api/process with bearer token and returns parsed data', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: 'r1', merchantName: 'X' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const { client } = makeClient({});
    const service = createReceiptService({ client, fetchFn: fetchFn as any, getAccessToken: async () => 'tok', apiBase: '/api' });
    const file = new File([new Uint8Array([1])], 'r.jpg', { type: 'image/jpeg' });

    const result = await service.processAndSaveReceipt(file, { modelId: 'm1' });

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/process');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect((result as any).id).toBe('r1');
  });

  it('processAndSaveReceipt throws on non-ok response', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ error: 'boom' }), { status: 500 }));
    const { client } = makeClient({});
    const service = createReceiptService({ client, fetchFn: fetchFn as any, getAccessToken: async () => 'tok' });
    const file = new File([new Uint8Array([1])], 'r.jpg', { type: 'image/jpeg' });

    await expect(service.processAndSaveReceipt(file)).rejects.toThrow(/boom/);
  });

  it("confirmDuplicateReceiptDecision 'save' inserts the pending receipt and returns mapped receipt", async () => {
    const insertedRow = {
      id: 'r1', date: '2026-03-06', total: 5, currency: 'USD', merchant_name: 'Dup', items: [],
      image_url: 'u1/x.jpg', image_hash: 'h', ocr_fingerprint: 'f', raw_text: null,
      ocr_route: null, processing_metrics: null, created_at: '2026-03-06T10:00:00.000Z',
    };
    const { client, fromBuilder, bucket } = makeClient({ fromResult: { data: insertedRow, error: null } });
    const service = createReceiptService({ client });
    const pending = {
      id: 'r1', date: '2026-03-06', total: 5, currency: 'USD', merchantName: 'Dup',
      items: [], imageUrl: 'u1/x.jpg', imageHash: 'h', ocrFingerprint: 'f', createdAt: 1,
    } as ReceiptData;

    const result = await service.confirmDuplicateReceiptDecision('save', pending);

    expect(fromBuilder.insert).toHaveBeenCalled();
    expect((result as ReceiptData).merchantName).toBe('Dup');
    expect(bucket.remove).not.toHaveBeenCalled();
  });

  it("confirmDuplicateReceiptDecision 'ignore' removes the uploaded storage object", async () => {
    const { client, fromBuilder, bucket } = makeClient({});
    const service = createReceiptService({ client });
    const pending = {
      id: 'r1', imageUrl: 'u1/x.jpg', merchantName: 'Dup', date: '', total: 0, currency: '',
      items: [], createdAt: 1,
    } as ReceiptData;

    const result = await service.confirmDuplicateReceiptDecision('ignore', pending);

    expect(bucket.remove).toHaveBeenCalledWith(['u1/x.jpg']);
    expect(result).toEqual({ ignored: true });
    expect(fromBuilder.insert).not.toHaveBeenCalled();
  });
});
