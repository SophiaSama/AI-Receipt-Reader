# Tests for SmartReceipt

This directory contains the automated test suites for the project. Network access
to external services (Supabase, Mistral/OpenRouter) is **mocked** in unit and
integration tests, so no real credentials are required. End-to-end tests run
against a **local Supabase stack** started via the Supabase CLI.

## 🎯 Architecture

- **Unit / service tests** (`tests/services`, `tests/backend`) — exercise the
  frontend Supabase services (`authService`, `receiptService`, `supabaseClient`)
  and backend services (OCR routing, image analysis, duplicate detection,
  `supabaseService`) with mocked dependencies.
- **Integration tests** (`tests/integration`) — run the OCR `/api/process` flow
  with [MSW](https://mswjs.io/) intercepting outbound HTTP so AI/Storage calls
  are deterministic.
- **E2E tests** (`tests/e2e/playwright`) — Python + Playwright tests that sign in
  as seeded users and drive the real UI against a local Supabase stack.

There is **no** in-memory storage mode and **no** `/api/receipts/*` REST routes.
Receipt CRUD happens client-side directly against Supabase (REST + Storage) under
row-level security; only OCR/AI processing is server-side (`POST /api/process`).

## 📁 Structure

```
tests/
├── setup.ts                       # Vitest setup: env defaults + MSW server lifecycle
├── README.md                      # This file
├── tsconfig.json                  # Test-only TS config (not type-checked in CI)
├── helpers/
│   └── testUtils.ts               # Shared test helpers
├── services/                      # Frontend Supabase service tests (mocked)
│   ├── authService.test.ts
│   ├── receiptService.test.ts
│   └── supabaseClient.test.ts
├── backend/                       # Backend service tests (mocked)
│   ├── supabaseService.test.ts
│   ├── ocrRoutingService.test.ts
│   ├── imageAnalysisService.test.ts
│   └── duplicateDetection.test.ts
├── integration/                   # MSW-backed integration tests
│   ├── mswServer.ts
│   ├── apiMockHandlers.ts
│   └── mistral_mock.test.ts
└── e2e/
    └── playwright/                # Python + Playwright e2e suite
```

## 🚀 Running Tests

```powershell
# Run the full Vitest suite (backend builds automatically via pretest)
npm test

# Integration tests only
npm run test:integration

# Vitest UI (interactive)
npm run test:ui

# Coverage report
npm run test:coverage
```

### E2E (Playwright)

E2E tests require a running local Supabase stack and the dev servers. Start the
stack first, then run the Python suite:

```powershell
npx supabase start          # applies migrations + seed.sql (seeds test users)
pytest tests/e2e/playwright/
npx supabase stop
```

The Playwright `conftest.py` reads these environment variables (defaults shown):

- `SUPABASE_URL` (fallback `VITE_SUPABASE_URL`, default `http://localhost:54321`)
- `SUPABASE_PUBLISHABLE_KEY` (fallback `VITE_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` — used only by the autouse cleanup fixture
- `E2E_USER_A_EMAIL` / `E2E_USER_A_PASSWORD`
- `E2E_USER_B_EMAIL` / `E2E_USER_B_PASSWORD`

The seeded users (see `supabase/seed.sql`) are:

| Var prefix | Email | Password |
| --- | --- | --- |
| `E2E_USER_A_*` | `test-user-a@example.com` | `test-password-a` |
| `E2E_USER_B_*` | `test-user-b@example.com` | `test-password-b` |

> The seed file is for local/CI only and must never be applied to production.

## 🔧 Configuration

`tests/setup.ts` sets safe defaults for the Vitest run:

- `NODE_ENV=test`
- `MISTRAL_API_KEY` — from your environment or `test-key`
- `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` — dummy `localhost` values
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — dummy `localhost` values

These dummy values let the Supabase client modules initialize; all network calls
are intercepted by MSW (or `vi.mock`), so the values are never used for real
requests. The setup also verifies the backend build artifacts
(`backend/dist/src/handlers/processReceipt.js`) exist and starts/stops the MSW
server around the suite.

## 🎯 Why mock the network

- **Fast** — no real Supabase/AI round-trips; the Vitest suite completes in seconds.
- **Reliable** — no flaky network or external outages, deterministic results.
- **CI-friendly** — no credentials needed for unit/integration tests; the e2e
  workflow spins up a local Supabase stack instead.

## 🐛 Debugging

```powershell
# Verbose output
npm test -- --reporter=verbose

# Single file
npm test tests/integration/mistral_mock.test.ts

# Single test by name
npm test -- -t "falls back to Mistral"
```

If tests fail with missing backend artifacts, build the backend first:

```powershell
node scripts/pre-test-build.cjs
```

## ✅ Best practices

- Mock external services (Supabase, Mistral) — never hit real endpoints in
  unit/integration tests.
- Keep tests independent; do not rely on execution order.
- Cover error paths, not just the happy path.
- Never commit credentials. Use the seeded local users for e2e only.
