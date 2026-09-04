# Backend Configuration Guide

## Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

### Required Variables

```bash
# Mistral AI API Key (get from https://console.mistral.ai/)
MISTRAL_API_KEY=your_actual_mistral_api_key_here

# OpenRouter API Key (optional; if missing, Mistral is used by default)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# OpenRouter configuration (optional)
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_APP_NAME=SmartReceiptReader

# Supabase (used by /api/process to read/write receipts + Storage)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_publishable_key

# Optional CORS allowlist for production (comma-separated origins)
# Leave empty or set to * for permissive mode (allow all origins)
# Supports wildcards (e.g. https://*.vercel.app) and automatically allows Vercel preview URLs
# Example: CORS_ORIGINS=https://your-app.vercel.app,https://*.vercel.app
CORS_ORIGINS=https://your-app.vercel.app,https://*.vercel.app

# Server Port
PORT=3001
```

> The backend acts on behalf of the calling user using the Supabase JWT
> forwarded by the frontend (`Authorization: Bearer <token>`). The `service_role`
> key is intentionally **not** used — row-level security enforces per-user access.

### Local Supabase Stack

For local development against a real schema + RLS, start the Supabase CLI stack
(requires Docker) and point `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` at it:

```bash
npx supabase start   # prints API URL + anon key via `supabase status`
npx supabase stop
```

### Vercel Deployment Variables

When deploying to Vercel, set these in the Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `MISTRAL_API_KEY` (your API key)
   - `OPENROUTER_API_KEY` (optional; missing key falls back to Mistral)
   - `OPENROUTER_BASE_URL` (optional override)
   - `OPENROUTER_HTTP_REFERER` (optional)
   - `OPENROUTER_APP_NAME` (optional)
   - `SUPABASE_URL` (your Supabase project URL)
   - `SUPABASE_PUBLISHABLE_KEY` (Supabase anon/publishable key)
   - `CORS_ORIGINS` (optional comma-separated allowlist for API origins)

## Local Development

1. Copy `.env.example` to `.env`
2. Update `MISTRAL_API_KEY` with your actual key
3. Add `OPENROUTER_API_KEY` if you plan to use non-Mistral models
4. Set `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` (cloud project or local stack)
5. Run: `npm run dev`

## Testing Without Mistral API Key

The backend includes mock responses for development without an API key. Just keep `MISTRAL_API_KEY` as the default value or don't set it.

If `OPENROUTER_API_KEY` is missing, the backend defaults to Mistral for AI processing. OpenRouter-backed models fall back to mock responses when selected without a key.
