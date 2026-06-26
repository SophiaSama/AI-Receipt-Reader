import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env from .env files AND process.env (Vercel injects dashboard vars here).
  const env = loadEnv(mode, process.cwd(), '');

  // Build-time diagnostic: visible in the Vercel build logs. Helps confirm
  // whether the Supabase vars are actually present when `vite build` runs.
  const supabaseUrlSet = Boolean(env.VITE_SUPABASE_URL);
  const supabaseKeySet = Boolean(env.VITE_SUPABASE_PUBLISHABLE_KEY);
  console.log(
    `[vite] Supabase env at build → VITE_SUPABASE_URL: ${supabaseUrlSet ? 'set' : 'MISSING'}, ` +
      `VITE_SUPABASE_PUBLISHABLE_KEY: ${supabaseKeySet ? 'set' : 'MISSING'}`
  );

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  };
});
