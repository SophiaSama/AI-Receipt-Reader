# Future Change: Containerized Backend on Cloud Run (Tesseract-enabled)

> **Status:** Planned / not yet implemented. Tracked separately from the current
> feature branch to keep that branch's scope limited to the Supabase migration and
> the serverless Tesseract guard fix.

## Background

The `/api/process` endpoint currently runs as a **Vercel serverless function**. Vercel's
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

### Current mitigation (already on this branch)

`analyzeImage` skips Tesseract when `process.env.VERCEL === '1'` (or
`DISABLE_TESSERACT_OCR === 'true'`) and routes straight to the **Vision LLM** path. This
keeps production working but **disables the local/free Tesseract cost-optimization route**
on Vercel. See [backend/src/services/imageAnalysisService.ts](../../backend/src/services/imageAnalysisService.ts).

## Goal of this future change

Run the backend API in a **Docker container on Google Cloud Run** so we fully control the
filesystem, bundle the Tesseract WASM core, and bake in the `eng.traineddata` language
file. This **re-enables the Tesseract / Hybrid OCR routes** (restoring the cost savings)
and removes the serverless function timeout cap.

## Target architecture

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
  points `API_BASE` at the Cloud Run URL.
- The existing Express app in [backend/local/server.ts](../../backend/local/server.ts) is
  the container entrypoint — it already exposes `POST /api/process` + `GET /api/health` and
  only calls `listen()` when `VERCEL !== '1'`.

## Implementation checklist (when picked up)

1. **Dockerfile** (multi-stage) in `backend/`:
   - Stage 1: `npm ci` + `npm run build` (TS → `dist/`).
   - Stage 2: copy `dist/`, install production deps only, run `node dist/local/server.js`.
   - Copy/keep `node_modules/tesseract.js-core/*.wasm` in the final image.
   - Bake `eng.traineddata` into the image (e.g. `/app/tessdata`).
2. **Tesseract offline config** — set `langPath`/`cachePath`/`corePath` in `createWorker`
   so it loads the baked-in WASM + traineddata and performs **no runtime download**.
   Ensure the serverless guard does **not** disable Tesseract in the container (it won't:
   `VERCEL` is unset there; do not set `DISABLE_TESSERACT_OCR`).
3. **`.dockerignore`** — exclude `dist/`, test artifacts, `.env`, `node_modules` from the
   build context as appropriate to keep the image lean.
4. **Cloud Run service**:
   - Listen on `process.env.PORT` (Cloud Run injects `PORT`, default 8080) — confirm the
     server reads it (currently defaults to `3001`).
   - Set runtime env vars: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `MISTRAL_API_KEY`,
     `OPENROUTER_API_KEY` (+ optional `OPENROUTER_*`).
   - Tune memory (Tesseract WASM needs headroom; start ~512MB–1GB) and request timeout.
5. **Frontend wiring** — point `API_BASE` (see `services/receiptService.ts`) at the Cloud
   Run URL via a `VITE_` env var; keep the Vercel `/api/process` function or remove it.
6. **CORS** — currently open (`app.use(cors())`); optionally restrict to the Vercel
   frontend origin.
7. **CI/CD** — build + push the image (Artifact Registry) and `gcloud run deploy` on merge.

## Tradeoffs

| | Vercel function (current) | Cloud Run container (future) |
|---|---|---|
| Tesseract OCR | ❌ disabled (WASM not bundled) | ✅ works (baked into image) |
| Cost-optimized routing | Vision LLM only | Tesseract / Hybrid / Vision |
| Timeout | Function cap (`maxDuration`) | No hard function cap |
| Cold start | Per-request | Warm if min-instances ≥ 1; scale-to-zero optional |
| Ops | Zero-ops | Manage image, registry, service, TLS/domain |
| Cost | Included in Vercel | Cloud Run usage (small; scale-to-zero available) |

## Out of scope for the current branch

This document is intentionally **planning only**. No Dockerfile, Cloud Run config, or
frontend `API_BASE` change is made on the current branch. The current branch keeps the
Vercel deployment working via the serverless Tesseract guard described above.
