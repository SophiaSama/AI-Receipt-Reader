# Quick Reference: Testing SmartReceiptReader

## 🚀 Quick Start

```bash
# Run the full Vitest suite (backend builds automatically via pretest)
npm test

# Watch mode
npm test -- --watch

# Vitest UI
npm run test:ui

# Coverage
npm run test:coverage
```

## 🏗️ How It Works

Network access to Supabase and AI providers is **mocked** in unit/integration
tests (via [MSW](https://mswjs.io/) and `vi.mock`), so no real credentials are
needed. End-to-end tests run against a **local Supabase stack**.

```
┌──────────────────────────────────────────────┐
│ Frontend (React)                              │
│   • Auth + receipt CRUD → Supabase directly   │
│     (REST /rest/v1/receipts + Storage, RLS)   │
│   • OCR/AI → POST /api/process (server-side)  │
└──────────────────────────────────────────────┘
```

There is no in-memory storage mode and no `/api/receipts/*` routes.

## 📝 Test Layout

- `tests/services/` — frontend Supabase service tests (`authService`,
  `receiptService`, `supabaseClient`), dependencies mocked.
- `tests/backend/` — backend service tests (`supabaseService`, OCR routing,
  image analysis, duplicate detection), dependencies mocked.
- `tests/integration/` — `/api/process` flow with MSW intercepting HTTP.
- `tests/e2e/playwright/` — Python + Playwright against a local Supabase stack.

## 🐛 Debugging

```bash
# Verbose
npm test -- --reporter=verbose

# Single file
npm test tests/integration/mistral_mock.test.ts

# Single test by name
npm test -- -t "falls back to Mistral"
```

### "Cannot find module" / missing backend artifacts

Build the backend first:

```bash
node scripts/pre-test-build.cjs
```

## 🎯 Best Practices

### DO ✅
- Mock external services (Supabase, Mistral) — never hit real endpoints.
- Cover both success and error cases.
- Use descriptive test names.
- Keep tests independent.

### DON'T ❌
- Don't call real Supabase/AI endpoints in unit/integration tests.
- Don't rely on test execution order or shared state.
- Don't commit credentials (use seeded local users for e2e only).

## 🚀 CI/CD

- Integration tests run with MSW mocks and dummy Supabase env values.
- E2E tests spin up a local Supabase stack (`supabase start` → `db reset`),
  start the backend + frontend, then run Playwright, and `supabase stop`.

See `tests/README.md` for the full details.
