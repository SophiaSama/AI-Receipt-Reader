# Vercel Deployment Troubleshooting

## Current Issue: Module Not Found Errors

### Error Messages
```
Cannot find module '/var/task/backend/dist/src/handlers/processReceipt.js'
imported from /var/task/api/process.js
```

### Root Cause

The backend TypeScript compilation structure is:
- **Source:** `backend/src/handlers/processReceipt.ts`
- **Compiled:** `backend/dist/src/handlers/processReceipt.js`

Because `backend/tsconfig.json` has:
```json
{
  "compilerOptions": {
    "rootDir": "./",    // Root is backend folder
    "outDir": "./dist"  // Output to dist
  },
  "include": [
    "src/**/*"          // Include src subfolder
  ]
}
```

This preserves the `src/` folder structure in the output: `dist/src/handlers/`

### Solution Checklist

#### ✅ API Import Paths (Already Correct)
```typescript
// api/process.ts
import { processReceipt } from '../backend/dist/src/handlers/processReceipt';
```

#### ✅ .vercelignore Configuration
```
# Ignore source files (don't deploy TypeScript source)
backend/src
backend/local
backend/tsconfig.json

# Keep compiled files (MUST deploy these)
# backend/dist/      <- NOT ignored, needed by API functions
# backend/package.json <- NOT ignored, may be needed
```

#### ✅ Build Process
```json
{
  "scripts": {
    "vercel-build": "npm run build",
    "build": "vite build && npm run build:backend",
    "build:backend": "cd backend && npm install && npm run build"
  }
}
```

This runs during Vercel deployment:
1. `vite build` → Builds React frontend
2. `cd backend && npm install` → Installs backend dependencies
3. `npm run build` → Compiles TypeScript to `backend/dist/`

### Verification Steps

#### 1. Check Local Build
```powershell
# Build locally
npm run build

# Verify backend/dist structure
ls backend/dist/src/handlers/
# Should show: processReceipt.js, getReceipts.js, etc.
```

#### 2. Check Vercel Build Logs
In Vercel dashboard:
1. Go to Deployments
2. Click latest deployment
3. Check "Build Logs"
4. Look for:
   - ✅ "Building backend..."
   - ✅ "Backend compiled successfully"
   - ❌ Any TypeScript errors

#### 3. Check Deployed Files
After deployment, check if `backend/dist` exists:
- Vercel includes files NOT in `.vercelignore`
- `backend/dist` should be present
- `backend/src` should be absent (ignored)

### Common Issues

#### Issue 1: Backend Not Built
**Symptom:** Module not found errors
**Cause:** `backend/dist` doesn't exist
**Solution:** 
- Check Vercel build logs
- Ensure `vercel-build` script runs
- Verify no build errors

#### Issue 2: Wrong Import Paths
**Symptom:** Module not found
**Cause:** Importing from `backend/dist/handlers/` instead of `backend/dist/src/handlers/`
**Solution:** Update import paths to include `src/`

#### Issue 3: TypeScript Errors During Build
**Symptom:** Build fails
**Cause:** Type errors in API or backend code
**Solution:** 
- Fix TypeScript errors
- Run `npm run build` locally first
- Check backend compilation with `cd backend && npm run build`

#### Issue 4: Files Ignored by .vercelignore
**Symptom:** Module not found in production
**Cause:** `backend/dist` accidentally ignored
**Solution:** Remove `backend/dist` from `.vercelignore`

### Expected File Structure on Vercel

```
/var/task/
├── api/
│   ├── process.js          # Vercel serverless function
│   ├── receipts.js
│   └── receipts/
│       ├── manual.js
│       └── delete.js
│
├── backend/
│   ├── dist/               # ✅ Must exist
│   │   └── src/            # ✅ Must exist
│   │       ├── handlers/   # ✅ Must exist
│   │       │   ├── processReceipt.js
│   │       │   ├── getReceipts.js
│   │       │   ├── manualSave.js
│   │       │   └── deleteReceipt.js
│   │       ├── services/
│   │       │   ├── mistralService.js
│   │       │   ├── dynamoService.js
│   │       │   └── s3Service.js
│   │       └── utils/
│   └── package.json        # ✅ Should exist
│
└── dist/                   # Frontend build
    ├── index.html
    └── assets/
```

### Debug Commands

```powershell
# Local debugging
npm run build                  # Build everything
ls backend/dist/src/handlers/  # Verify backend compiled

# Check import paths
grep -r "from.*backend/dist" api/  # Should show backend/dist/src/

# Vercel debugging
vercel logs <deployment-url>   # Check runtime logs
vercel build                   # Test build locally
```

### Fixed TypeScript Errors

All API files now properly cast header values:
```typescript
// Before (caused error)
res.setHeader(k, v);  // v is 'unknown'

// After (fixed)
res.setHeader(k, String(v));  // v converted to string
```

Files fixed:
- ✅ `api/process.ts`
- ✅ `api/receipts.ts`
- ✅ `api/receipts/delete.ts`
- ✅ `api/receipts/manual.ts`

---

## Deployment Checklist

Before deploying:

- [ ] Run `npm run build` locally (should succeed)
- [ ] Verify `backend/dist/src/handlers/` exists
- [ ] Check all API imports use `backend/dist/src/`
- [ ] Ensure `.vercelignore` doesn't block `backend/dist`
- [ ] Test TypeScript compilation: `cd backend && npm run build`
- [ ] Commit and push changes
- [ ] Deploy to Vercel
- [ ] Check Vercel build logs for errors
- [ ] Test API endpoints in production

---

## Current Status

✅ TypeScript header errors fixed
✅ Import paths correct (`backend/dist/src/handlers/`)
✅ `.vercelignore` configured properly
✅ Build process correct
⏳ Awaiting deployment test

If errors persist after deployment, check:
1. Vercel build logs
2. Runtime logs (Vercel dashboard)
3. Verify `backend/dist` was deployed
