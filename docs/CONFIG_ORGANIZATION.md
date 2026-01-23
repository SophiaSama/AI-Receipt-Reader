# Configuration Files Organization

This document explains where each configuration file is located and why.

## 📁 Configuration Structure

```
SmartReceiptReader/
├── 📄 tsconfig.json              ← TypeScript (Frontend/API)
├── 📄 postcss.config.cjs         ← PostCSS (required in root)
├── 📄 tailwind.config.cjs        ← Tailwind CSS (required in root)
├── 📄 vite.config.ts             ← Vite build configuration
├── 📄 vitest.config.ts           ← Vitest test configuration
├── 📄 vercel.json                ← Vercel deployment config
├── 📄 .vercelignore              ← Vercel ignore patterns
├── 📄 .gitignore                 ← Git ignore patterns
├── 📄 package.json               ← Frontend dependencies & scripts
│
├── 📁 backend/
│   ├── 📄 tsconfig.json          ← TypeScript (Backend/Lambda)
│   └── 📄 package.json           ← Backend dependencies
│
└── 📁 tests/
    └── 📄 tsconfig.json          ← TypeScript (Tests, extends root)
```

---

## 🔍 Why This Structure?

All configuration files are in the **project root** because:

✅ **Standard Convention** - Most projects follow this pattern
✅ **Auto-Detection** - Tools (Vite, Vitest, TypeScript) automatically find configs in root
✅ **No Flags Needed** - No need for `--config` flags in package.json scripts
✅ **Better IDE Support** - IDEs expect configs in root
✅ **Deployment Reliability** - Vercel and other platforms expect standard structure
✅ **Simpler Maintenance** - One place to look for all configs

### Root Level Configs (All Required)

#### `tsconfig.json`
- **Used by:** TypeScript CLI, VS Code, Vite
- **Configures:** Frontend components, API functions
- **Why in root:** Standard TypeScript convention

#### `postcss.config.cjs`
- **Used by:** Vite build process
- **Configures:** Tailwind CSS processing
- **Why in root:** Vite looks for it here by default

#### `tailwind.config.cjs`
- **Used by:** Tailwind CSS plugin
- **Configures:** Content paths, theme, plugins
- **Why in root:** PostCSS plugin expects it here

#### `vite.config.ts`
- **Used by:** Vite CLI, dev server, build
- **Configures:** Server, plugins, aliases
- **Why in root:** Vite auto-detects it here

#### `vitest.config.ts`
- **Used by:** Vitest test runner
- **Configures:** Test environment, coverage
- **Why in root:** Vitest auto-detects it here

#### `vercel.json`
- **Used by:** Vercel CLI, deployment
- **Configures:** Routing, functions
- **Why in root:** Vercel requirement

#### `package.json`
- **Used by:** npm, Node.js, Vercel
- **Configures:** Dependencies, scripts
- **Why in root:** npm/Node.js requirement

### Subdirectory Configs

These configs are in subdirectories because they configure separate modules:

#### `backend/tsconfig.json`
- **Why:** Backend is a separate module with different requirements
- **Module system:** CommonJS (AWS Lambda requirement)
- **Target:** Node.js ES2020

#### `tests/tsconfig.json`
- **Why:** Tests need special type definitions
- **Extends:** Root tsconfig.json
- **Adds:** Vitest globals (`describe`, `it`, `expect`)

---

## ⚠️ Important: Keep Configs in Root

### ❌ DON'T Move These Anywhere

All config files should stay in the project root:

```
❌ config/vite.config.ts          # Vite won't auto-detect
❌ config/vitest.config.ts        # Vitest won't auto-detect
❌ config/postcss.config.cjs      # Vite won't find it
❌ config/tailwind.config.cjs     # PostCSS won't find it
❌ config/tsconfig.json           # VS Code won't find it
❌ config/package.json            # npm won't find it
❌ config/vercel.json             # Vercel won't find it
```

### ✅ DO Keep in Root

```
✅ vite.config.ts                 # Standard location
✅ vitest.config.ts               # Standard location
✅ postcss.config.cjs             # Required location
✅ tailwind.config.cjs            # Required location
✅ tsconfig.json                  # Required location
✅ package.json                   # Required location
✅ vercel.json                    # Required location
```

### Why Keep in Root?

1. **Tool Auto-Detection** - Most tools look in root by default
2. **No Extra Flags** - Don't need `--config` in every command
3. **Standard Convention** - Industry standard practice
4. **Deployment Reliability** - Platforms expect standard structure
5. **Better IDE Support** - IDEs configured for root configs
6. **Simpler Scripts** - No custom paths in package.json

---

## 📝 Configuration Summary

| File | Location | Why in Root |
|------|----------|-------------|
| `tsconfig.json` | Root | TypeScript standard |
| `postcss.config.cjs` | Root | Vite requires it |
| `tailwind.config.cjs` | Root | PostCSS requires it |
| `vite.config.ts` | Root | Vite auto-detection |
| `vitest.config.ts` | Root | Vitest auto-detection |
| `vercel.json` | Root | Vercel requirement |
| `package.json` | Root | npm/Node.js requirement |
| `.gitignore` | Root | Git requirement |
| `.vercelignore` | Root | Vercel requirement |
| `backend/tsconfig.json` | Backend | Separate module |
| `backend/package.json` | Backend | Separate module |
| `tests/tsconfig.json` | Tests | Test-specific config |

All root configs are **non-negotiable** - they must stay in root for the project to work correctly.

---

## 🔧 Configuration Examples

### Vite Config (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
});
```

### Vitest Config (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
```

---

## 🎯 Best Practices

### DO

- ✅ Keep all configs in root directory
- ✅ Follow standard naming conventions
- ✅ Document config changes in comments
- ✅ Test after modifying configs
- ✅ Use TypeScript for configs when possible

### DON'T

- ❌ Move configs to subdirectories (breaks tools)
- ❌ Use non-standard config names
- ❌ Add unnecessary `--config` flags to scripts
- ❌ Duplicate configs across directories
- ❌ Commit sensitive data in configs

---

## 🔍 Verification Checklist

After organizing configs, verify:

- [ ] `npm run dev` works (Vite finds configs)
- [ ] `npm test` works (Vitest finds config)
- [ ] `npm run build` works (All tools work)
- [ ] VS Code shows no TypeScript errors
- [ ] Tailwind CSS classes work in browser
- [ ] `vercel` command recognizes project

---

## 📚 Related Documentation

- [TSCONFIG_STRUCTURE.md](./TSCONFIG_STRUCTURE.md) - TypeScript config details
- [VERCEL_DEVELOPMENT_GUIDE.md](../VERCEL_DEVELOPMENT_GUIDE.md) - Development guide
- [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) - Overall project structure

---

<div align="center">

**Last Updated:** January 2026

Remember: Not all config files can be moved! Check tool docs first.

</div>
