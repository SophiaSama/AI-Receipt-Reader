# TypeScript Configuration Structure

This document explains the TypeScript configuration hierarchy in the SmartReceiptReader project.

## 📁 Configuration Files

```
SmartReceiptReader/
├── tsconfig.json              ← Frontend/API configuration (React, Vite)
├── tests/
│   └── tsconfig.json         ← Test configuration (extends root)
└── backend/
    └── tsconfig.json         ← Backend configuration (Node.js, Lambda)
```

---

## 🔧 Configuration Details

### 1. Root `tsconfig.json` (Frontend & API)

**Location:** `./tsconfig.json`

**Purpose:** Configures TypeScript for:
- React frontend components
- Vercel API functions in `api/` folder
- Frontend services

**Key Settings:**
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",           // Modern JavaScript
    "module": "ESNext",            // ES modules
    "jsx": "react-jsx",            // React 17+ JSX transform
    "moduleResolution": "bundler", // Vite bundler resolution
    "lib": ["ES2022", "DOM"],      // Browser APIs
    "noEmit": true,                // Vite handles compilation
    "types": ["node"]              // Node.js types for API functions
  }
}
```

**Used by:**
- `App.tsx`, `index.tsx`
- `components/*.tsx`
- `services/*.ts`
- `api/**/*.ts`

---

### 2. Tests `tsconfig.json`

**Location:** `./tests/tsconfig.json`

**Purpose:** Extends root config with test-specific settings

**Key Settings:**
```jsonc
{
  "extends": "../tsconfig.json",   // Inherit root config
  "compilerOptions": {
    "types": [
      "vitest/globals",             // Vitest test globals (describe, it, expect)
      "node"                        // Node.js types
    ],
    "moduleResolution": "node",     // Standard Node resolution for tests
    "esModuleInterop": true         // Better CommonJS interop
  },
  "include": [
    "**/*.ts",                      // All test files
    "../api/**/*.ts"                // Include API functions for testing
  ]
}
```

**Used by:**
- `tests/**/*.test.ts`
- `tests/helpers/*.ts`
- `tests/setup.ts`

---

### 3. Backend `tsconfig.json`

**Location:** `./backend/tsconfig.json`

**Purpose:** Separate configuration for backend Lambda functions

**Key Settings:**
```jsonc
{
  "compilerOptions": {
    "target": "ES2020",             // Node.js 18+ support
    "module": "commonjs",           // Lambda requires CommonJS
    "outDir": "./dist",             // Output directory
    "rootDir": "./",                // Source root
    "strict": true,                 // Strict type checking
    "sourceMap": true,              // Debug support
    "declaration": true             // Generate .d.ts files
  },
  "include": [
    "src/**/*",                     // All source files
    "local/**/*"                    // Local dev server
  ]
}
```

**Used by:**
- `backend/src/**/*.ts`
- `backend/local/server.ts`
- Compiled to `backend/dist/`

---

## 🎯 Why Multiple Configs?

### Different Environments

| Config | Environment | Module System | Target |
|--------|-------------|---------------|--------|
| Root | Browser + Vercel | ESNext | ES2022 |
| Tests | Node.js (Vitest) | ESNext/Node | ES2022 |
| Backend | AWS Lambda | CommonJS | ES2020 |

### Different Requirements

**Frontend/API:**
- ✅ React JSX support
- ✅ DOM types
- ✅ Vite bundler resolution
- ✅ No emit (Vite handles build)

**Tests:**
- ✅ Vitest globals
- ✅ Access to API functions
- ✅ Node module resolution
- ✅ No emit (Vitest handles execution)

**Backend:**
- ✅ CommonJS for Lambda
- ✅ Emit compiled JavaScript
- ✅ Source maps for debugging
- ✅ Declaration files for types

---

## ⚠️ Common Issues

### Issue 1: "Cannot find module"

**Cause:** Using wrong moduleResolution

**Solution:** 
- Frontend: Use `"bundler"`
- Backend: Use `"node"`
- Tests: Use `"node"`

### Issue 2: "Cannot find type 'describe'"

**Cause:** Missing Vitest types in tests config

**Solution:**
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "node"]
  }
}
```

### Issue 3: Backend imports fail in API functions

**Cause:** API functions try to import from `backend/src/` instead of `backend/dist/`

**Solution:**
Always import from compiled code:
```typescript
// ✅ Correct
import { handler } from '../backend/dist/handlers/processReceipt';

// ❌ Wrong
import { handler } from '../backend/src/handlers/processReceipt';
```

---

## 🔍 Verification

### Check Root Config

```powershell
npx tsc --noEmit
```

Should compile frontend and API files without errors.

### Check Backend Config

```powershell
cd backend
npx tsc --noEmit
```

Should compile backend files without errors.

### Check Tests Config

```powershell
cd tests
npx tsc --noEmit
```

Should compile test files without errors.

---

## 📝 Best Practices

### DO

- ✅ Keep root config for frontend/API
- ✅ Use separate backend config for Lambda
- ✅ Extend root config in tests
- ✅ Use `strict: true` in backend
- ✅ Keep configs in their respective folders

### DON'T

- ❌ Don't duplicate configs unnecessarily
- ❌ Don't use same config for different environments
- ❌ Don't put all configs in a `config/` folder
- ❌ Don't forget to build backend before testing

---

## 🔄 When to Update

### Update Root Config When:
- Adding new frontend dependencies
- Changing React version
- Adding new path aliases
- Upgrading Vite

### Update Backend Config When:
- Changing Node.js version
- Adding backend dependencies
- Changing output structure
- Upgrading AWS Lambda runtime

### Update Tests Config When:
- Changing test framework
- Adding test utilities
- Needing different module resolution

---

## 🔗 Related Files

- `vite.config.ts` - Uses root tsconfig
- `vitest.config.ts` - Uses tests tsconfig
- `backend/package.json` - Uses backend tsconfig

---

<div align="center">

**Last Updated:** January 2026

For questions, see [VERCEL_DEVELOPMENT_GUIDE.md](./VERCEL_DEVELOPMENT_GUIDE.md)

</div>
