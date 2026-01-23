# Testing Guide for SmartReceiptReader

This document describes the testing infrastructure and practices for the SmartReceiptReader application.

## ✨ Quick Start (New!)

**Just run tests - everything else is automatic:**
```powershell
npm test
```

The automated test setup system handles all dependency building for you! See [Automated Test Setup System](#-automated-test-setup-system) for details.

---

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

### Automated Build Setup ✨

**Good news!** You don't need to manually build the backend before running tests anymore. The project now includes an automated pre-test build system.

#### How It Works

When you run `npm test`, the system automatically:

1. **Checks Dependencies** - Verifies all required packages are installed
2. **Builds Backend** - Compiles TypeScript (`backend/src/` → `backend/dist/`)
3. **Verifies Build** - Ensures compiled handlers exist
4. **Runs Tests** - Executes your test suite

This is powered by npm's `pretest` lifecycle hook:

```json
{
  "scripts": {
    "pretest": "npm run build:backend",
    "build:backend": "cd backend && npm install && npm run build",
    "test": "vitest"
  }
}
```

#### Why This Matters

Tests depend on compiled backend code because:

```
tests/integration/api.test.ts
    ↓ imports
api/process.ts (Vercel serverless function)
    ↓ dynamically imports at runtime
backend/dist/src/handlers/processReceipt.js
    ↑
    Must exist before tests run!
```

**Without automated build:**
- ❌ Developers must remember to run `npm run build:backend`
- ❌ Tests fail with "Cannot find module" errors
- ❌ Confusing for new contributors

**With automated build:**
- ✅ Just run `npm test` - it handles everything
- ✅ Works in CI/CD pipelines automatically
- ✅ Consistent across all environments

#### Manual Build (If Needed)

You can still build manually:

```powershell
# Build backend only
npm run build:backend

# Build everything (frontend + backend)
npm run build
```

---

## 🏃 Running Tests

### Quick Start

```powershell
# Run all tests (automatically builds backend first!)
npm test
```

That's it! The `pretest` script handles all dependencies automatically.

### All Tests (with automatic build)

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

## 🔧 Automated Test Setup System

### Overview

SmartReceiptReader includes an automated test setup system that ensures all dependencies are built before tests run. This eliminates the common "Cannot find module" errors and makes testing seamless.

### Architecture

```
npm test
    ↓
pretest hook (automatic)
    ↓
build:backend script
    ├─ cd backend
    ├─ npm install (if needed)
    ├─ npm run build (TypeScript compilation)
    └─ Creates backend/dist/src/handlers/*.js
    ↓
test script (vitest)
    ├─ Runs all tests
    └─ Tests can import from backend/dist/ ✅
```

### What Gets Built Automatically

When you run any test command (`npm test`, `npm run test:integration`, etc.), the system:

1. **Installs Backend Dependencies**
   - Runs `npm install` in `backend/` directory
   - Only installs if `node_modules/` is missing or outdated

2. **Compiles TypeScript**
   - Compiles `backend/src/**/*.ts` → `backend/dist/src/**/*.js`
   - Includes handlers, services, and utilities
   - Uses `backend/tsconfig.json` configuration

3. **Verifies Build Output**
   - Ensures all handler files are created
   - Validates directory structure

### Commands Affected

All test commands automatically trigger the build:

```powershell
npm test                    # ✅ Builds backend first
npm run test:integration    # ✅ Builds backend first
npm run test:e2e           # ✅ Builds backend first
npm run test:coverage      # ✅ Builds backend first
npm run test:ui            # ✅ Builds backend first
```

### Skipping the Build (Advanced)

If you're making rapid test changes and want to skip the build:

```powershell
# Run vitest directly (skips pretest hook)
npx vitest

# Or use the underlying vitest command
./node_modules/.bin/vitest
```

**⚠️ Warning:** Only skip the build if you're certain the backend hasn't changed!

### Build Performance

**First run:** ~10-20 seconds (installs dependencies + compiles)
**Subsequent runs:** ~2-5 seconds (only recompiles changed files)

**Tips for faster testing:**
- Use watch mode: `npm test -- --watch`
- Run specific tests: `npm test api.test.ts`
- Keep backend changes separate from frontend changes

### Debugging Build Issues

If the automatic build fails:

1. **Check backend dependencies:**
   ```powershell
   cd backend
   npm install
   cd ..
   ```

2. **Try manual build:**
   ```powershell
   npm run build:backend
   ```

3. **Check TypeScript errors:**
   ```powershell
   cd backend
   npm run build -- --noEmit
   cd ..
   ```

4. **Verify tsconfig.json:**
   - Check `backend/tsconfig.json` exists
   - Verify `"rootDir": "./"` and `"outDir": "./dist"`
   - Ensure `"include": ["src/**/*"]`

### Test Setup File

The `tests/setup.ts` file runs before all tests and:
- Sets environment variables (`USE_LOCAL_STORAGE=true`)
- Configures test timeouts
- Imports necessary globals from Vitest

**Location:** `tests/setup.ts`

**Configured in:** `vitest.config.ts`
```typescript
export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    // ...
  }
});
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
4. ✅ **Automatically builds backend** (via `pretest` hook)
5. ✅ Runs tests
6. ✅ Uploads coverage report
7. ✅ Runs TypeScript checks

**Note:** The CI pipeline benefits from the automated build system - no need to manually add build steps!

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

### "Cannot find module 'backend/dist/...'" (RESOLVED ✅)

**This issue is now automatically fixed!** The `pretest` script builds the backend before tests run.

If you still see this error:
1. Make sure you have the latest `package.json` with `"pretest": "npm run build:backend"`
2. Try running manually: `npm run build:backend`
3. Check that `backend/dist/src/handlers/` contains `.js` files

**Why this happens:**
- Tests import API functions from `/api/*.ts`
- API functions dynamically import handlers from `backend/dist/src/handlers/`
- If backend isn't compiled, these imports fail

**How it's fixed:**
- The `pretest` lifecycle script runs `npm run build:backend` before every test
- This ensures `backend/dist/` always exists and is up-to-date

### "Module not found: backend/dist/..."

**Old Solution (manual):**
```powershell
cd backend && npm run build && cd ..
```

**New Solution (automatic):**
Just run `npm test` - the build happens automatically!

### Missing Dependencies in Lock File

If you see errors like "Missing: @vitest/spy@2.1.9 from lock file":

```powershell
# Regenerate package-lock.json
npm install

# Or clean install
rm package-lock.json
npm install
```

This typically happens after:
- Updating dependencies
- Pulling changes from Git
- Switching branches

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
