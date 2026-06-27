import { describe, it, expect } from 'vitest';
import { createSupabaseClient } from '../../services/supabaseClient';

describe('createSupabaseClient', () => {
  it('throws a clear error when required env vars are missing', () => {
    expect(() => createSupabaseClient({ url: '', publishableKey: '' }))
      .toThrow(/VITE_SUPABASE_URL/);
  });

  it('creates a Supabase client exposing auth, from and storage when env is provided', () => {
    const client = createSupabaseClient({
      url: 'http://localhost:54321',
      publishableKey: 'test-anon-key',
    });

    expect(client).toBeDefined();
    expect(typeof client.auth.getSession).toBe('function');
    expect(typeof client.from).toBe('function');
    expect(typeof client.storage.from).toBe('function');
  });
});
