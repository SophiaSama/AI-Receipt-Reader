# Containerized Backend on Cloud Run (Tesseract-enabled)

> **Status:** ✅ Implemented. Dockerfile, CI/CD workflow, and Tesseract offline
> config are in place. Deploy by pushing `backend/` changes to `main`.

## Background: known issue in Vercel's serverless function

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

1. A GCP project with Cloud Run, Secret Manager and Artifact Registry APIs enabled.

  ```bash
    # Log in first
    gcloud auth login
    gcloud config set project [PROJECT_ID]

    # Verify Login

    gcloud auth list
    gcloud config get-value project

    # Enable APIs

    gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

  ```
  And grant permission to project
  ```bash
    gcloud projects add-iam-policy-binding 924806699856 \
    --member="serviceAccount:924806699856-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

  ```
  Add secret entry for supabase
  ```bash
  # 1. Create the secret entry
  gcloud secrets create supabase-url --replication-policy="automatic"
  gcloud secrets create supabase-publishable-key --replication-policy="automatic"
  gcloud secrets create mistral-api-key --replication-policy="automatic"
  gcloud secrets create openrouter-api-key --replication-policy="automatic"

  # 2. Add the actual URL value to the secret
  echo -n "YOUR_SUPABASE_URL" | gcloud secrets versions add supabase-url --data-file=-
  echo -n "YOUR_ACTUAL_KEY" | gcloud secrets versions add supabase-publishable-key --data-file=-
  echo -n "YOUR_ACTUAL_KEY" | gcloud secrets versions add mistral-api-key --data-file=-
  echo -n "YOUR_ACTUAL_KEY" | gcloud secrets versions add openrouter-api-key --data-file=-

  # 3. Grant permissions
  PROJECT_NUMBER="924806699856"

  gcloud projects add-iam-policy-binding $PROJECT_NUMBER \
      --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor"
  ```
2. Create an Artifact Registry Docker repository:

   ```bash
   gcloud artifacts repositories create smart-receipt \
     --repository-format=docker \
     --location=us-central1
   ```
3. Create a service account with `roles/run.admin`, `roles/artifactregistry.writer`,
   and `roles/iam.serviceAccountUser`.

   ```bash
    gcloud iam service-accounts create smart-receipt-deployer \
    --display-name="Smart Receipt Deployer" \
    --project=gen-lang-client-0181500335

    gcloud projects add-iam-policy-binding gen-lang-client-0181500335 \
    --member=serviceAccount:smart-receipt-deployer@gen-lang-client-0181500335.iam.gserviceaccount.com \
    --role=roles/run.admin

    gcloud projects add-iam-policy-binding gen-lang-client-0181500335 \
    --member=serviceAccount:smart-receipt-deployer@gen-lang-client-0181500335.iam.gserviceaccount.com \
    --role=roles/artifactregistry.writer

    gcloud projects add-iam-policy-binding gen-lang-client-0181500335 \
    --member=serviceAccount:smart-receipt-deployer@gen-lang-client-0181500335.iam.gserviceaccount.com \
    --role=roles/iam.serviceAccountUser
   ```
4. Verify roles are assigned as expected

  ```bash
    gcloud projects get-iam-policy gen-lang-client-0181500335 \
        --flatten="bindings[].members" \
        --format='table(bindings.role)' \
        --filter="bindings.members:smart-receipt-deployer@gen-lang-client-0181500335.iam.gserviceaccount.com"

  ```
5. Generate JSON key for this service account
  ```bash
    gcloud iam service-accounts keys create key.json \
        --iam-account=smart-receipt-deployer@gen-lang-client-0181500335.iam.gserviceaccount.com
  ```

6. Deploy manually on Google Cloud
  ```bash
    cd ~
    git clone --branch <your-feature-branch> <your-repo-url> smart-receipt
    cd smart-receipt
    gcloud meta list-files-for-upload | wc -l
    gcloud builds submit --config=cloudbuild.backend.yaml --substitutions=_REGION=us-central1,_AR_REPO=smart-receipt,_SERVICE_NAME=smart-receipt-backend,_CORS_ORIGINS=https://smart-receipt-reader.vercel.app
  ```
7.  Make the aervice public 
  ```bash
    gcloud run services add-iam-policy-binding smart-receipt-backend \
        --region=us-central1 \
        --member="allUsers" \
        --role="roles/run.invoker"

  ```
  If you don't want it to be public, you can add the --no-allow-unauthenticated flag to your deployment command next time.
  
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

After the first deploy, get the deployed Cloud Run service URL:
```bash
gcloud run services describe smart-receipt-backend --region us-central1 --format="value(status.url)"
```
Then set `VITE_API_BASE_URL` in Vercel's environment variables to the
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
