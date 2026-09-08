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

  // Build-time diagnostic for the backend API base. When MISSING, the frontend
  // falls back to the relative `/api` (Vercel serverless), where Tesseract is
  // auto-disabled. Must be `set` (pointing at Cloud Run) for Tesseract OCR.
  console.log(
    `[vite] API base at build → VITE_API_BASE_URL: ${env.VITE_API_BASE_URL ? env.VITE_API_BASE_URL : 'MISSING (will fall back to /api on Vercel)'}`
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
