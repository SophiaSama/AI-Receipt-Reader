# Quick Reference: Testing SmartReceiptReader

## 🚀 Quick Start

```bash
# Run all integration tests
npm test

# Run with watch mode
npm test -- --watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

That's it! The backend builds automatically if needed.

## 🏗️ How It Works

### Test Mode Architecture

**Two modes, same code:**

```
┌─────────────────────────────────────────┐
│           API Endpoint                  │
│  (e.g., POST /api/receipts/manual)     │
└──────────────┬──────────────────────────┘
               │
       ┌───────▼────────┐
       │ Detect Request │
       │     Shape      │
       └───────┬────────┘
               │
     ┌─────────┴─────────┐
     │                   │
┌────▼─────┐      ┌─────▼──────┐
│   Test   │      │ Production │
│   Mode   │      │    Mode    │
└────┬─────┘      └─────┬──────┘
     │                  │
┌────▼─────┐      ┌─────▼──────┐
│ In-Memory│      │    AWS     │
│  Store   │      │  Services  │
└──────────┘      └────────────┘
```

### Request Detection

```typescript
// Test request (from test harness)
{
  method: 'POST',
  body: { metadata: '{"merchantName": "Store"}' },
  headers: {}
}
// → Uses in-memory store

// Production request (from Vercel)
{
  method: 'POST',
  body: <ReadableStream>,
  headers: { 'content-type': 'multipart/form-data' }
}
// → Uses AWS services
```

## 📝 Writing Tests

### Basic Test Pattern

```typescript
import { describe, it, expect } from 'vitest';
import manualHandler from '@/api/receipts/manual';

describe('My Feature', () => {
  it('should do something', async () => {
    // Arrange: Create mock request
    const req = createMockRequest({
      method: 'POST',
      body: { metadata: JSON.stringify({ 
        merchantName: 'Test Store',
        date: '2026-01-23',
        total: 50.00
      })}
    });
    const res = createMockResponse();

    // Act: Call handler (automatically uses test mode)
    await manualHandler(req, res);

    // Assert: Verify response
    expect(res.getStatus()).toBe(200);
    expect(res.getData()).toHaveProperty('id');
    expect(res.getData()).toHaveProperty('source', 'manual');
  });
});
```

### Full Workflow Test

```typescript
it('should complete full workflow', async () => {
  // 1. Create
  const createReq = createMockRequest({
    method: 'POST',
    body: { metadata: JSON.stringify(receiptData) }
  });
  await manualHandler(createReq, createRes);
  const receiptId = createRes.getData().id;

  // 2. List
  await receiptsHandler(listReq, listRes);
  expect(listRes.getData()).toContainEqual(
    expect.objectContaining({ id: receiptId })
  );

  // 3. Delete
  await deleteHandler(
    createMockRequest({ 
      method: 'DELETE', 
      query: { id: receiptId } 
    }), 
    deleteRes
  );
  expect(deleteRes.getStatus()).toBe(204);

  // 4. Verify
  await receiptsHandler(verifyReq, verifyRes);
  expect(verifyRes.getData()).not.toContainEqual(
    expect.objectContaining({ id: receiptId })
  );
});
```

## 🛠️ Utilities

### In-Memory Store

```typescript
import { 
  addReceipt, 
  listReceipts, 
  deleteReceiptById, 
  clearReceipts 
} from '@/api/_lib/receiptsStore';

// Add receipt
await addReceipt({ id: '123', merchantName: 'Store', ... });

// List all
const receipts = await listReceipts();

// Delete
const deleted = await deleteReceiptById('123');

// Clear (done automatically before each test)
await clearReceipts();
```

### Request Body Reader

```typescript
import { readRawBody } from '@/api/_lib/readRawBody';

// Works with streams, objects, buffers, or strings
const rawBody = await readRawBody(req);
```

## 🐛 Debugging

### View What's Stored

```typescript
it('debug test', async () => {
  const { listReceipts } = await import('@/api/_lib/receiptsStore');
  console.log('Store contents:', await listReceipts());
  // Store is cleared before each test
});
```

### Check Build Status

```bash
# List backend build artifacts
ls backend/dist/src/handlers/

# Should show:
# - processReceipt.js
# - manualSave.js
# - getReceipts.js
# - deleteReceipt.js
```

### Rebuild Backend

```bash
# If tests fail with "Cannot find module"
node scripts/pre-test-build.cjs
```

### Run Specific Test

```bash
# By test name
npm test -- -t "should save manual receipt"

# By file
npm test -- tests/integration/api.test.ts

# With verbose output
npm test -- --reporter=verbose
```

## 📊 Common Issues

### "Cannot find module"
**Cause:** Backend not built  
**Fix:** `node scripts/pre-test-build.cjs`

### "req.on is not a function"
**Cause:** Using old request handling code  
**Fix:** Use `readRawBody()` utility

### Tests pass locally but fail in CI
**Cause:** Missing build step in workflow  
**Fix:** Ensure workflow includes explicit build step

### Store has data from previous test
**Cause:** Store not cleared  
**Fix:** Verify `tests/setup.ts` has `beforeEach(() => clearReceipts())`

### Test expects JSON but gets string
**Cause:** Using `.send()` instead of `.json()`  
**Fix:** Use `res.json(JSON.parse(result.body))`

## 📚 Documentation

- **Architecture**: `TEST_MODE_ARCHITECTURE.md`
- **Full Guide**: `docs/development/TESTING_GUIDE.md`
- **CI/CD**: `docs/my_local_doc/CI_CD_TESTING.md`
- **Setup**: `docs/TEST_SETUP.md`
- **Tests**: `tests/README.md`

## 🎯 Best Practices

### DO ✅
- Write tests for both success and error cases
- Test full workflows (create → list → delete)
- Use descriptive test names
- Test method validation (405 for wrong methods)
- Test query parameter validation

### DON'T ❌
- Don't test external services (S3, DynamoDB, Mistral)
- Don't rely on test execution order
- Don't share state between tests
- Don't skip the automated build
- Don't test implementation details

## 🚀 CI/CD

### GitHub Actions

```yaml
- name: Install dependencies
  run: npm install

- name: Build backend
  run: node scripts/pre-test-build.cjs

- name: Run tests
  run: npm run test:integration
  env:
    USE_LOCAL_STORAGE: true
    NODE_ENV: test
```

### Local Development

```bash
# Watch mode for TDD
npm test -- --watch

# Coverage while developing
npm run test:coverage

# UI for interactive testing
npm run test:ui
```

## 💡 Tips

1. **Fast feedback**: Use watch mode during development
2. **Visual debugging**: Use test UI to see what's happening
3. **Incremental**: Write one test, make it pass, repeat
4. **Coverage**: Aim for 80%+ on critical paths
5. **Documentation**: Update docs when adding features

---

**Quick Links:**
- [Full Testing Guide](../docs/development/TESTING_GUIDE.md)
- [Architecture Details](../TEST_MODE_ARCHITECTURE.md)
- [Project Structure](../PROJECT_STRUCTURE.md)
