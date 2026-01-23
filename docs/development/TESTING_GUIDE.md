# Testing Guide for SmartReceiptReader

This document describes the testing infrastructure and practices for the SmartReceiptReader application.

## 📚 Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

---

## 🎯 Overview

SmartReceiptReader uses **Vitest** as the testing framework, providing:
- ✅ Fast unit and integration tests
- ✅ TypeScript support out of the box
- ✅ Compatible with Vite's config
- ✅ Similar API to Jest (easy migration)
- ✅ Built-in coverage reporting

### Test Coverage

| Category | Coverage Target | Status |
|----------|----------------|--------|
| API Routes | 90%+ | 🟢 Implemented |
| Handlers | 80%+ | 🟡 Partial |
| Services | 70%+ | 🔴 Planned |

---

## 🧪 Test Types

### 1. Integration Tests (`tests/integration/`)

Test API routes end-to-end within the application:
- Mock HTTP requests/responses
- Use in-memory storage (`USE_LOCAL_STORAGE=true`)
- No external dependencies required
- Fast execution (~2-5 seconds)

**When to use:** Testing API logic, request/response handling, validation

### 2. E2E Tests (`tests/e2e/`)

Test against a live server (local or deployed):
- Real HTTP requests with `fetch`
- Tests full stack including routing
- Can test against `vercel dev` or production
- Slower execution (~10-30 seconds)

**When to use:** Testing deployment, routing, real-world scenarios

### 3. Unit Tests (Future)

Test individual functions and components:
- Test utilities in isolation
- Test React components with React Testing Library
- Test business logic without dependencies

---

## 🚀 Getting Started

### Prerequisites

Node.js 20+ and npm 10+ are required.

### Install Dependencies

```powershell
# Install all dependencies (includes dev dependencies)
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Build Backend

Tests import from `backend/dist/`, so build first:

```powershell
cd backend
npm run build
cd ..
```

---

## 🏃 Running Tests

### All Tests

```powershell
npm test
```

### Integration Tests Only

```powershell
npm run test:integration
```

### E2E Tests (requires live server)

```powershell
# Terminal 1: Start local server
npm run dev

# Terminal 2: Run E2E tests
npm run test:e2e
```

Or test against deployed app:

```powershell
$env:API_URL="https://your-app.vercel.app"
npm run test:e2e
```

### With UI (Interactive)

```powershell
npm run test:ui
```

Opens a browser with interactive test runner.

### With Coverage

```powershell
npm run test:coverage
```

Generates coverage report in `coverage/` directory.

### Watch Mode

```powershell
npm test -- --watch
```

Re-runs tests when files change.

### Specific Test File

```powershell
npm test tests/integration/api.test.ts
```

### Specific Test Case

```powershell
npm test -- -t "should return healthy status"
```

---

## 📁 Test Structure

```
tests/
├── README.md                     # Test documentation
├── setup.ts                      # Global test setup
├── tsconfig.json                 # TypeScript config for tests
│
├── helpers/
│   └── testUtils.ts             # Shared test utilities
│
├── integration/
│   └── api.test.ts              # Integration tests for API routes
│
└── e2e/
    └── api.e2e.test.ts          # E2E tests against live server
```

---

## ✍️ Writing Tests

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import handler from '../api/myroute';
import { createMockRequest, createMockResponse } from '../tests/helpers/testUtils';

describe('My Route', () => {
  it('should handle requests correctly', async () => {
    // Arrange
    const req = createMockRequest({
      method: 'POST',
      body: { data: 'test' }
    });
    const res = createMockResponse();

    // Act
    await handler(req, res);

    // Assert
    expect(res.getStatus()).toBe(200);
    expect(res.getData()).toHaveProperty('success', true);
  });
});
```

### E2E Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('E2E: My Feature', () => {
  it('should work in production', async () => {
    const response = await fetch('http://localhost:3000/api/myroute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

### Using Test Utilities

```typescript
import { createMockImageFile, createFormData } from '../tests/helpers/testUtils';

// Create a mock image file
const file = createMockImageFile('receipt.jpg');

// Create form data with metadata and file
const metadata = { merchantName: 'Test Store', total: 50 };
const { buffer, contentType } = createFormData(metadata, file);
```

---

## 🔄 CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

Workflow file: `.github/workflows/test.yml`

**What it does:**
1. ✅ Checks out code
2. ✅ Sets up Node.js (20.x, 22.x)
3. ✅ Installs dependencies
4. ✅ Builds backend
5. ✅ Runs tests
6. ✅ Uploads coverage report
7. ✅ Runs TypeScript checks

### Local Pre-commit Hook (Optional)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
npm test
```

Make it executable:

```powershell
chmod +x .git/hooks/pre-commit
```

---

## ✅ Best Practices

### DO

- ✅ **Write tests first** (TDD approach)
- ✅ **Test error cases**, not just happy paths
- ✅ **Use descriptive test names** that explain intent
- ✅ **Keep tests independent** (no shared state)
- ✅ **Mock external services** (AWS, Mistral AI)
- ✅ **Run tests before committing**
- ✅ **Update tests when changing code**

### DON'T

- ❌ **Don't make real API calls** to external services in tests
- ❌ **Don't depend on test execution order**
- ❌ **Don't leave test data in production**
- ❌ **Don't skip error testing**
- ❌ **Don't commit sensitive credentials**
- ❌ **Don't test implementation details** (test behavior)

### Test Naming Convention

```typescript
// Good ✅
it('should return 400 when id is missing')
it('should create receipt with valid metadata')
it('should delete receipt and return 204')

// Bad ❌
it('test1')
it('works')
it('receipt stuff')
```

### Arrange-Act-Assert Pattern

```typescript
it('should do something', async () => {
  // Arrange: Set up test data and mocks
  const input = { ... };
  const expected = { ... };

  // Act: Execute the code under test
  const result = await functionUnderTest(input);

  // Assert: Verify the results
  expect(result).toEqual(expected);
});
```

---

## 🐛 Troubleshooting

### "Cannot find module 'vitest'"

Install dependencies:
```powershell
npm install
```

### "Module not found: backend/dist/..."

Build the backend first:
```powershell
cd backend && npm run build && cd ..
```

### Tests Timing Out

Increase timeout in test file:
```typescript
it('slow test', async () => {
  // Test code
}, 60000); // 60 seconds
```

Or globally in `vitest.config.ts`:
```typescript
testTimeout: 30000
```

### E2E Tests Failing

Make sure server is running:
```powershell
npm run dev
```

Or set correct API URL:
```powershell
$env:API_URL="http://localhost:3000"
npm run test:e2e
```

### Coverage Not Generated

Install coverage provider:
```powershell
npm install --save-dev @vitest/coverage-v8
```

---

## 📊 Coverage Reports

### Generate Coverage

```powershell
npm run test:coverage
```

### View HTML Report

```powershell
# Open in browser (Windows)
start coverage/index.html

# Or just open the file manually
```

### Coverage Thresholds

Set in `vitest.config.ts`:

```typescript
coverage: {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
}
```

---

## 🔗 Related Documentation

- [VERCEL_DEVELOPMENT_GUIDE.md](./VERCEL_DEVELOPMENT_GUIDE.md) - Development practices
- [tests/README.md](./tests/README.md) - Detailed test documentation
- [Vitest Documentation](https://vitest.dev/) - Official docs
- [Testing Best Practices](https://testingjavascript.com/) - Kent C. Dodds

---

## 📈 Future Improvements

### Planned

- [ ] Unit tests for React components
- [ ] Unit tests for services (DynamoDB, S3, Mistral)
- [ ] Mock AWS SDK for isolated testing
- [ ] Performance testing (load tests)
- [ ] Visual regression testing (Chromatic/Percy)
- [ ] Contract testing (Pact)

### Ideas

- Automated screenshot testing
- Mutation testing (Stryker)
- Property-based testing (fast-check)
- Integration with code review tools

---

## 🤝 Contributing

When adding new features:

1. **Write tests first** (TDD)
2. **Ensure all tests pass** before committing
3. **Update documentation** if needed
4. **Maintain coverage** above thresholds
5. **Include tests in PR**

---

<div align="center">

**Happy Testing! 🎉**

Questions? Check the [tests/README.md](./tests/README.md) or ask in discussions.

</div>
