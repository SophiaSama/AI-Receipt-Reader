# Integration Tests for SmartReceipt API

This directory contains integration tests for all Vercel Serverless API routes using an in-memory test mode architecture.

## 🎯 Test Mode Architecture

The project uses a **dual-mode system** where API endpoints automatically detect and handle test requests differently from production requests:

- **Production Mode**: Uses AWS services (S3, DynamoDB), Mistral AI, processes streams
- **Test Mode**: Uses in-memory storage, handles pre-parsed bodies, no external dependencies

This allows fast, reliable integration tests without requiring AWS credentials or network access.

## 📁 Structure

```
tests/
├── setup.ts                      # Global test setup (clears in-memory store)
├── README.md                     # This file
├── helpers/
│   └── testUtils.ts             # Test utilities and helpers
├── integration/
│   └── api.test.ts              # API route integration tests (test mode)
└── e2e/
    └── api.e2e.test.ts          # End-to-end tests (live server)
```

## 🚀 Running Tests

### Quick Start

```powershell
# Run all integration tests (builds backend automatically)
npm test
```

### Integration Tests Only

```powershell
npm run test:integration
```

### E2E Tests (requires live server)

Run with python playwright

```powershell
# Run all tests (headless by default)
pytest tests/e2e/playwright/
```

## 📝 Test Coverage

### Endpoints Tested (Test Mode)

All endpoints support **test mode** for fast, reliable integration testing:

1. **Health Check** - `GET /api/health`
   - ✅ Returns healthy status with timestamp
   - ✅ Rejects non-GET requests with 405
   - ✅ No external dependencies

2. **List Receipts** - `GET /api/receipts`
   - ✅ Returns receipts from in-memory store
   - ✅ Works with create → list → delete workflow
   - ✅ Rejects non-GET requests with 405

3. **Manual Entry** - `POST /api/receipts/manual`
   - ✅ Handles pre-parsed JSON body (test mode)
   - ✅ Handles multipart form data (production mode)
   - ✅ Saves to in-memory store in tests
   - ✅ Returns receipt with `id` and `source: 'manual'`
   - ✅ Validates required fields (merchantName, date, total)
   - ✅ Rejects non-POST requests with 405

4. **Delete Receipt** - `DELETE /api/receipts/delete?id=xxx`
   - ✅ Deletes from in-memory store in tests
   - ✅ Requires id query parameter
   - ✅ Returns 204 on success
   - ✅ Handles non-existent receipts
   - ✅ Rejects non-DELETE requests with 405

5. **Process Receipt** - `POST /api/process`
   - ✅ Uses `readRawBody()` utility for request handling
   - ✅ Handles streams, objects, and buffers
   - ✅ Rejects request without file
   - ✅ Rejects non-POST requests with 405

### Integration Workflows

- ✅ **Full CRUD Workflow**: Create → List → Delete
  - Creates manual receipt
  - Verifies it appears in list
  - Deletes the receipt
  - Confirms it's removed from list
- ✅ **Error Handling**: Malformed JSON, missing headers, invalid data
- ✅ **Validation**: Required fields, method validation, query parameters
- ✅ **Test Isolation**: Store cleared before each test

## 🏗️ How Test Mode Works

### Request Detection

API endpoints detect test requests by checking for pre-parsed bodies:

```typescript
// In api/receipts/manual.ts
if (req.body && typeof req.body === 'object' && 
    req.body.metadata && !contentType.includes('multipart/form-data')) {
  return handleTestMode(req, res);  // Use in-memory store
}
// Otherwise, use production Lambda handler
```

### In-Memory Storage

Tests use a shared in-memory store (`api/_lib/receiptsStore.ts`):

```typescript
const receipts: Receipt[] = [];

export async function addReceipt(receipt: Receipt) {
  receipts.push(receipt);
}

export async function listReceipts() {
  return [...receipts];
}

export async function deleteReceiptById(id: string) {
  const idx = receipts.findIndex(r => r.id === id);
  if (idx === -1) return false;
  receipts.splice(idx, 1);
  return true;
}
```

The store is automatically cleared before each test in `tests/setup.ts`:

```typescript
beforeEach(async () => {
  const { clearReceipts } = await import('../api/_lib/receiptsStore.js');
  await clearReceipts();
});
```

## 🔧 Configuration

Tests use the following environment:

- `USE_LOCAL_STORAGE=true` - Enables in-memory storage mode
- `NODE_ENV=test` - Test environment flag
- `MISTRAL_API_KEY` - From your environment or defaults to 'test-key'

Set in `tests/setup.ts` automatically.

## 📊 Test Structure

Each test follows the AAA pattern (Arrange-Act-Assert):

```typescript
describe('Feature', () => {
  it('should do something', async () => {
    // Arrange: Create mock request
    const req = createMockRequest({
      method: 'POST',
      body: { metadata: JSON.stringify({ ... }) }
    });
    const res = createMockResponse();

    // Act: Call API handler (automatically uses test mode)
    await manualHandler(req, res);

    // Assert: Verify response
    expect(res.getStatus()).toBe(200);
    expect(res.getData()).toHaveProperty('id');
    expect(res.getData()).toHaveProperty('source', 'manual');
  });
});
```

### Mock Request/Response Helpers

```typescript
function createMockRequest(options: {
  method: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
})

function createMockResponse() {
  return {
    status: (code: number) => this,
    json: (data: any) => this,
    setHeader: (key: string, value: string) => this,
    getStatus: () => number,
    getData: () => any,
    getHeaders: () => Record<string, string>
  }
}
```

## 🎯 Benefits of Test Mode Architecture

### Fast ⚡

- No network calls to AWS
- No API calls to Mistral
- No S3 uploads or DynamoDB queries
- Tests complete in ~2-5 seconds

### Reliable 🔒

- No flaky network issues
- No external service outages
- No credential management
- Deterministic results

### CI-Friendly 🚀

- No AWS credentials needed
- No environment setup required
- Works identically in local and CI
- Parallel test execution safe

### Maintainable 🛠️

- Clear separation of concerns
- Test and production code paths separate
- Easy to debug
- Well-documented

## 🔍 Debugging Tests

### View Test Output

```powershell
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- tests/integration/api.test.ts

# Run specific test
npm test -- -t "should save manual receipt"
```

### Check Build Artifacts

```powershell
# Verify backend is built
ls backend/dist/src/handlers/

# Manually rebuild if needed
node scripts/pre-test-build.cjs
```

### Inspect In-Memory Store

Add logging in tests:

```typescript
const { listReceipts } = await import('@/api/_lib/receiptsStore');
console.log('Current receipts:', await listReceipts());
```

## 📚 Related Documentation

- **Test Mode Architecture**: `../TEST_MODE_ARCHITECTURE.md`
- **Testing Guide**: `../docs/development/TESTING_GUIDE.md`
- **CI/CD Setup**: `../docs/my_local_doc/CI_CD_TESTING.md`
- **Test Setup**: `../docs/TEST_SETUP.md`

    // Act: Call API handler
    await handler(req, res);

    // Assert: Verify response
    expect(res.getStatus()).toBe(200);
    expect(res.getData()).toHaveProperty('id');
  });
});

```

## 🐛 Debugging Tests

### View Test Output

```powershell
npm test -- --reporter=verbose
```

### Run Single Test File

```powershell
npm test tests/integration/api.test.ts
```

### Run Specific Test

```powershell
npm test -- -t "should return healthy status"
```

## 📚 Writing New Tests

### 1. Create Test File

```typescript
// tests/integration/myfeature.test.ts
import { describe, it, expect } from 'vitest';
import handler from '@api/myroute';

describe('My Feature', () => {
  it('should work', async () => {
    // Your test here
  });
});
```

### 2. Use Helper Functions

```typescript
import { createMockImageFile, createFormData } from '../helpers/testUtils';

const file = createMockImageFile('receipt.jpg');
const formData = createFormData(metadata, file);
```

### 3. Follow Patterns

- Use descriptive test names
- Arrange → Act → Assert pattern
- Test both success and error cases
- Clean up after tests (if needed)

## ⚠️ Known Limitations

### Multipart File Upload

Testing actual file uploads with multipart/form-data is complex in unit tests. Current tests use mock objects. For full file upload testing, consider:

1. **E2E Tests**: Use real HTTP server with `vercel dev`
2. **Test Utilities**: Libraries like `form-data` for Node.js
3. **Manual Testing**: Test file uploads in browser/Postman

### AWS Services

Tests use `USE_LOCAL_STORAGE=true` to avoid requiring AWS credentials. For testing actual AWS integration:

1. Create separate test suite
2. Use AWS SDK mocks (like `aws-sdk-mock`)
3. Or use real AWS resources with test prefix

### Mistral AI

Tests don't make actual Mistral API calls. To test AI integration:

1. Mock the Mistral service
2. Use recorded responses (VCR pattern)
3. Run separate E2E tests with real API

## 🎯 Best Practices

### ✅ DO

- Write tests for all API routes
- Test error cases, not just happy path
- Use descriptive test names
- Keep tests independent (no shared state)
- Mock external services (AWS, Mistral)

### ❌ DON'T

- Make real API calls to external services
- Depend on test execution order
- Leave test data in storage
- Skip error case testing
- Commit sensitive credentials

## 📈 Coverage Goals

Target coverage levels:

- **API Routes**: 90%+ coverage
- **Handlers**: 80%+ coverage
- **Services**: 70%+ coverage

View coverage report:

```powershell
npm test -- --coverage
```

## 🔗 Related Documentation

- [VERCEL_DEVELOPMENT_GUIDE.md](../VERCEL_DEVELOPMENT_GUIDE.md) - Development best practices
- [VERCEL_DEPLOYMENT_GUIDE.md](../VERCEL_DEPLOYMENT_GUIDE.md) - Deployment guide
- [Vitest Documentation](https://vitest.dev/) - Test framework docs

---

## 🤝 Contributing

When adding new API routes:

1. Write integration tests first (TDD)
2. Ensure tests pass locally
3. Update this README if needed
4. Include tests in PR

Happy Testing! 🎉
