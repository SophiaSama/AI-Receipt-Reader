import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseEnv {
  url?: string;
  publishableKey?: string;
}

/**
 * Reads Supabase config from Vite's import.meta.env.
 * VITE_SUPABASE_PUBLISHABLE_KEY is the anon/publishable key (safe for the browser).
 */
export function readSupabaseEnv(): SupabaseEnv {
  const env = ((import.meta as any)?.env ?? {}) as Record<string, string | undefined>;
  return {
    url: env.VITE_SUPABASE_URL,
    publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

/**
 * Creates a Supabase browser client. Throws a clear error if config is missing
 * so misconfiguration fails fast at startup instead of at first request.
 */
export function createSupabaseClient(env: SupabaseEnv = readSupabaseEnv()): SupabaseClient {
  if (!env.url || !env.publishableKey) {
    throw new Error(
      'Missing Supabase configuration: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set.'
    );
  }

  return createClient(env.url, env.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let cachedClient: SupabaseClient | null = null;

/**
 * Lazily-created singleton browser client. Initialized on first use so that
 * importing this module (e.g. in tests) does not require the env to be present.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createSupabaseClient();
  }
  return cachedClient;
}
