# Integration Tests for SmartReceipt API

This directory contains integration tests for all Vercel Serverless API routes.

## 📁 Structure

```
tests/
├── setup.ts                      # Global test setup
├── helpers/
│   └── testUtils.ts             # Test utilities and helpers
└── integration/
    └── api.test.ts              # API route integration tests
```

## 🚀 Running Tests

### Install Dependencies First

```powershell
npm install
```

### Run All Tests

```powershell
npm test
```

### Run Only Integration Tests

```powershell
npm run test:integration
```

### Run Tests with UI

```powershell
npm run test:ui
```

### Watch Mode (Re-run on Changes)

```powershell
npm test -- --watch
```

## 📝 Test Coverage

### Endpoints Tested

1. **Health Check** - `GET /api/health`
   - ✅ Returns healthy status
   - ✅ Rejects non-GET requests

2. **List Receipts** - `GET /api/receipts`
   - ✅ Returns array of receipts
   - ✅ Rejects non-GET requests

3. **Manual Entry** - `POST /api/receipts/manual`
   - ✅ Saves manual receipt without image
   - ✅ Validates required fields
   - ✅ Rejects non-POST requests

4. **Delete Receipt** - `DELETE /api/receipts/delete?id=xxx`
   - ✅ Requires id query parameter
   - ✅ Handles non-existent receipts
   - ✅ Rejects non-DELETE requests

5. **Process Receipt** - `POST /api/process`
   - ✅ Rejects request without file
   - ✅ Rejects non-POST requests

### Integration Workflows

- ✅ **Full CRUD Workflow**: Create → List → Delete
- ✅ **Error Handling**: Malformed JSON, missing headers
- ✅ **Validation**: Required fields, invalid data

## 🔧 Configuration

Tests use the following environment:
- `USE_LOCAL_STORAGE=true` - In-memory storage for testing
- `NODE_ENV=test` - Test environment
- `MISTRAL_API_KEY` - From your environment or defaults to 'test-key'

## 📊 Test Structure

Each test follows this pattern:

```typescript
describe('Feature', () => {
  it('should do something', async () => {
    // Arrange: Create mock request
    const req = createMockRequest({ ... });
    const res = createMockResponse();

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
