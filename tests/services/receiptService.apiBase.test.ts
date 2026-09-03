import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createReceiptService } from '../../services/receiptService';

/**
 * Tests for the apiBase / VITE_API_BASE_URL wiring in receiptService.
 *
 * The module-level DEFAULT_API_BASE is computed from import.meta.env at load
 * time. We can't easily mutate that in a unit test, but we *can* verify the
 * injectable `apiBase` dependency is respected — and that's the same code path
 * the module-level default feeds into.
 */

function makeClient(session: any = { user: { id: 'u1' } }) {
  return {
    from: vi.fn(() => {
      const b: any = {};
      const c = () => b;
      b.select = vi.fn(c);
      b.order = vi.fn(c);
      b.insert = vi.fn(c);
      b.delete = vi.fn(c);
      b.eq = vi.fn(c);
      b.in = vi.fn(c);
      b.single = vi.fn(() => Promise.resolve({ data: {}, error: null }));
      b.then = (f: any, r?: any) => Promise.resolve({ data: [], error: null }).then(f, r);
      return b;
    }),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://signed/x' }, error: null })),
        upload: vi.fn(async () => ({ data: {}, error: null })),
        remove: vi.fn(async () => ({ data: {}, error: null })),
      })),
    },
    auth: {
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
    },
  } as unknown as SupabaseClient;
}

describe('receiptService — apiBase wiring', () => {
  it('processAndSaveReceipt uses the default /api base when no apiBase is provided', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: 'r1' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const service = createReceiptService({
      client: makeClient(),
      fetchFn: fetchFn as any,
      getAccessToken: async () => 'tok',
      // apiBase omitted — falls back to DEFAULT_API_BASE
    });

    const file = new File([new Uint8Array([1])], 'r.jpg', { type: 'image/jpeg' });
    await service.processAndSaveReceipt(file);

    const [url] = fetchFn.mock.calls[0] as [string, RequestInit];
    // The default in test env (no VITE_API_BASE_URL set) should be '/api'
    expect(url).toBe('/api/process');
  });

  it('processAndSaveReceipt uses a custom apiBase (simulating Cloud Run URL)', async () => {
    const cloudRunBase = 'https://smart-receipt-backend-abc123-uc.a.run.app/api';
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: 'r1' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const service = createReceiptService({
      client: makeClient(),
      fetchFn: fetchFn as any,
      getAccessToken: async () => 'tok',
      apiBase: cloudRunBase,
    });

    const file = new File([new Uint8Array([1])], 'r.jpg', { type: 'image/jpeg' });
    await service.processAndSaveReceipt(file);

    const [url] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${cloudRunBase}/process`);
  });

  it('processAndSaveReceipt sends Authorization header with bearer token', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: 'r1' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const service = createReceiptService({
      client: makeClient(),
      fetchFn: fetchFn as any,
      getAccessToken: async () => 'my-jwt-token',
      apiBase: 'https://cloud-run.example.com/api',
    });

    const file = new File([new Uint8Array([1])], 'r.jpg', { type: 'image/jpeg' });
    await service.processAndSaveReceipt(file);

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer my-jwt-token');
  });

  it('processAndSaveReceipt sends model in FormData when specified', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: 'r1' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const service = createReceiptService({
      client: makeClient(),
      fetchFn: fetchFn as any,
      getAccessToken: async () => 'tok',
      apiBase: 'https://cloud-run.example.com/api',
    });

    const file = new File([new Uint8Array([1])], 'r.jpg', { type: 'image/jpeg' });
    await service.processAndSaveReceipt(file, { modelId: 'google/gemini-2.5-flash' });

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    const body = init.body as FormData;
    expect(body.get('model')).toBe('google/gemini-2.5-flash');
  });

  it('processAndSaveReceipt omits Authorization header when no token available', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: 'r1' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const service = createReceiptService({
      client: makeClient(),
      fetchFn: fetchFn as any,
      getAccessToken: async () => null,
      apiBase: '/api',
    });

    const file = new File([new Uint8Array([1])], 'r.jpg', { type: 'image/jpeg' });
    await service.processAndSaveReceipt(file);

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
