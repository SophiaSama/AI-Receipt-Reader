# Containerized Backend on Cloud Run (Tesseract-enabled)

> **Status:** ✅ Implemented. Dockerfile, CI/CD workflow, and Tesseract offline
> config are in place. Deploy by pushing `backend/` changes to `main`.

## Background

The `/api/process` endpoint originally ran as a **Vercel serverless function**. Vercel's
build-time file tracer does **not** include `tesseract.js-core/tesseract-core-simd.wasm`,
because that file is loaded at runtime by a dynamic path rather than a static `import`.
In production this produces:

```
ENOENT: no such file or directory, open
'/var/task/backend/node_modules/tesseract.js-core/tesseract-core-simd.wasm'
Uncaught Exception: RuntimeError: Aborted(...)
```

The WASM `Aborted(...)` surfaces as an **uncaught exception** that crashes the whole
function process, so the request dies (504 / crash) **before** the OpenRouter call runs —
i.e. the receipt is never processed by AI.

### Vercel fallback (still available)

`analyzeImage` skips Tesseract when `process.env.VERCEL === '1'` (or
`DISABLE_TESSERACT_OCR === 'true'`) and routes straight to the **Vision LLM** path. The
Vercel serverless functions in `api/` are kept as a fallback. See
[imageAnalysisService.ts](../../backend/src/services/imageAnalysisService.ts).

## Architecture

```
Frontend (Vite static build) ──► Vercel (static hosting)
        │  calls API_BASE (HTTPS)
        ▼
Backend API container ──► Google Cloud Run
  (Express + Tesseract WASM + eng.traineddata baked into image)
        │
        ▼
Supabase (Auth + Postgres + Storage, RLS)  +  Mistral / OpenRouter
```

- **Only the API moves.** The React frontend stays on Vercel as static hosting and simply
  points `VITE_API_BASE_URL` at the Cloud Run URL.
- The existing Express app in [server.ts](../../backend/local/server.ts) is the container
  entrypoint.

## Files

| File | Purpose |
|---|---|
| [`backend/Dockerfile`](../../backend/Dockerfile) | Multi-stage build: compile TS, install prod deps, bake `eng.traineddata` |
| [`backend/.dockerignore`](../../backend/.dockerignore) | Excludes `node_modules`, `dist`, `.env`, etc. from build context |
| [`imageAnalysisService.ts`](../../backend/src/services/imageAnalysisService.ts) | `TESSDATA_PREFIX` env var configures offline Tesseract paths |
| [`.github/workflows/deploy-cloud-run.yml`](../../.github/workflows/deploy-cloud-run.yml) | CI/CD: build → push to Artifact Registry → `gcloud run deploy` |

## Deploying

### Prerequisites

1. A GCP project with Cloud Run and Artifact Registry APIs enabled.
2. Create an Artifact Registry Docker repository:

   ```bash
   gcloud artifacts repositories create smart-receipt \
     --repository-format=docker \
     --location=us-central1
   ```

3. Create a service account with `roles/run.admin`, `roles/artifactregistry.writer`,
   and `roles/iam.serviceAccountUser`.

### GitHub Secrets

| Secret | Description |
|---|---|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_SA_KEY` | Service account JSON key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `MISTRAL_API_KEY` | Mistral AI API key |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_BASE_URL` | OpenRouter base URL (optional) |

### GitHub Variables (optional)

| Variable | Default |
|---|---|
| `GCP_REGION` | `us-central1` |

### Frontend wiring

After the first deploy, set `VITE_API_BASE_URL` in Vercel's environment variables to the
Cloud Run service URL (printed by the workflow), e.g.:

```
VITE_API_BASE_URL=https://smart-receipt-backend-xxxxx-uc.a.run.app/api
```

### Local Docker testing

```bash
cd backend
docker build -t smart-receipt-backend:test .
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e SUPABASE_URL=http://localhost:54321 \
  -e SUPABASE_PUBLISHABLE_KEY=your-local-key \
  -e MISTRAL_API_KEY=your-key \
  smart-receipt-backend:test

# Health check
curl http://localhost:8080/api/health
```

## Tradeoffs

| | Vercel function (fallback) | Cloud Run container |
|---|---|---|
| Tesseract OCR | ❌ disabled (WASM not bundled) | ✅ works (baked into image) |
| Cost-optimized routing | Vision LLM only | Tesseract / Hybrid / Vision |
| Timeout | Function cap (`maxDuration`) | Configurable (default 300s) |
| Cold start | Per-request | Warm if min-instances ≥ 1; scale-to-zero optional |
| Ops | Zero-ops | Manage image, registry, service |
| Cost | Included in Vercel | Cloud Run usage (small; scale-to-zero) |
