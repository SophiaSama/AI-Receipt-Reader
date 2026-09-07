import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseEnv {
  url?: string;
  publishableKey?: string;
}

/**
 * Reads Supabase config from Vite's import.meta.env.
 * VITE_SUPABASE_PUBLISHABLE_KEY is the anon/publishable key (safe for the browser).
 *
 * NOTE: These must be accessed as direct, static `import.meta.env.VITE_*`
 * member expressions so Vite can inline the values at build time. Aliasing
 * `import.meta.env` to a variable (or using optional chaining / `as any`)
 * defeats the static replacement and yields `undefined` in the production bundle.
 */
export function readSupabaseEnv(): SupabaseEnv {
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

  // When running in Node.js < 22 (e.g. during SSR or unit tests), native WebSocket
  // is not present on globalThis. Provide a lightweight transport stub so that
  // @supabase/realtime-js does not throw during client initialization.
  const realtime = typeof globalThis.WebSocket === 'undefined'
    ? { transport: class WebSocketStub {} as any }
    : undefined;

  return createClient(env.url, env.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    ...(realtime ? { realtime } : {}),
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
