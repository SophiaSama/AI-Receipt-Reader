# Vercel Development Guide - Best Practices & Lessons Learned

This guide consolidates lessons learned from developing and deploying SmartReceiptReader on Vercel. It covers common pitfalls, debugging strategies, and best practices for building Vercel-deployed applications.

---

## 📚 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Vercel Serverless Functions](#vercel-serverless-functions)
- [API Route Design](#api-route-design)
- [Module Resolution](#module-resolution)
- [Common Pitfalls](#common-pitfalls)
- [Debugging Strategies](#debugging-strategies)
- [AWS Integration](#aws-integration)
- [Best Practices](#best-practices)

---

## 🏗️ Architecture Overview

### Hybrid Deployment Model

SmartReceiptReader uses a **hybrid architecture**:
- **Frontend**: React SPA built with Vite → Static files on Vercel CDN
- **Backend Logic**: TypeScript source in `backend/src/` → Compiled to `backend/dist/`
- **API Layer**: Vercel Serverless Functions in `api/` → Thin wrappers calling backend logic

```
┌─────────────────────────────────────────────────────┐
│                   Vercel Platform                   │
│                                                     │
│  ┌─────────────┐         ┌─────────────────────┐  │
│  │   dist/     │         │   api/ (Functions)  │  │
│  │  (Static)   │         │  ┌──────────────┐   │  │
│  │             │────────▶│  │ Thin wrapper │   │  │
│  │  React SPA  │  Calls  │  │ import from  │   │  │
│  │             │         │  │ backend/dist │   │  │
│  └─────────────┘         │  └──────┬───────┘   │  │
│                          │         │           │  │
│                          │         ▼           │  │
│                          │  ┌──────────────┐   │  │
│                          │  │ Backend      │   │  │
│                          │  │ Logic (JS)   │   │  │
│                          │  └──────┬───────┘   │  │
│                          └─────────┼───────────┘  │
└────────────────────────────────────┼──────────────┘
                                     │
                                     ▼
                           ┌──────────────────┐
                           │  AWS Services    │
                           │  DynamoDB + S3   │
                           └──────────────────┘
```

### Why This Architecture?

**Separation of Concerns:**
- Business logic lives in `backend/src/` (reusable for AWS Lambda or Vercel)
- API functions in `api/` are deployment-specific adapters
- Frontend in root is independent of backend implementation

**Benefits:**
✅ Easier testing (test business logic separately)
✅ Portable (can switch from Vercel to AWS Lambda)
✅ Type-safe (TypeScript end-to-end)
✅ Maintainable (clear boundaries)

---

## ⚡ Vercel Serverless Functions

### Function Structure

Vercel Serverless Functions follow a specific pattern:

```typescript
// api/example.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handler } from '../backend/dist/handlers/example';

export default async function(req: VercelRequest, res: VercelResponse) {
  try {
    // Adapt Vercel request to backend handler
    const result = await handler({
      body: req.body,
      headers: req.headers,
      method: req.method,
    });
    
    return res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

**Key Points:**
- Default export required: `export default async function(...)`
- Parameters: `VercelRequest` and `VercelResponse`
- Import from `../backend/dist/...` (compiled JS, not `src/`)
- Handle errors gracefully (Vercel logs go to dashboard)

### Function Placement

```
api/
├── process.ts              → /api/process
├── health.ts               → /api/health
└── receipts/
    ├── receipts.ts         → /api/receipts (note: file named receipts.ts)
    ├── manual.ts           → /api/receipts/manual
    └── delete.ts           → /api/receipts/delete
```

**⚠️ Critical Lesson: Folder vs File**
- `api/receipts.ts` → endpoint: `/api/receipts` ✅
- `api/receipts/` (folder) → folder for sub-routes
- `api/receipts/receipts.ts` → endpoint: `/api/receipts/receipts` (wrong!)

**To create `/api/receipts` endpoint when you also have `/api/receipts/*` sub-routes:**
Option 1: Keep `receipts.ts` in root `api/` folder ✅ (current approach)
Option 2: Create `api/receipts/index.ts` for the base route

---

## 🔀 API Route Design

### Static vs Dynamic Routes

**Problem with Dynamic Routes:**
Dynamic routes like `[id].ts` or `[id]/index.ts` can be unreliable on Vercel:
- ❌ `DELETE /api/receipts/abc-123` → unpredictable routing
- ❌ Vercel may not correctly parse path parameters
- ❌ 404/405 errors due to routing ambiguity

**Solution: Use Query Parameters**
✅ `DELETE /api/receipts/delete?id=abc-123`
```typescript
// api/receipts/delete.ts
export default async function(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query; // Extract from query string
  // ... handle deletion
}
```

**Lessons Learned:**
1. **Prefer query parameters over path parameters** for serverless functions
2. **Static routes are more reliable** than dynamic `[param]` routes
3. **Test routing thoroughly** before deploying

### RESTful Alternatives

If you need RESTful paths with dynamic IDs:
```typescript
// Option: Single handler with method switching
// api/receipts.ts
export default async function(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // List all receipts
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    // Delete specific receipt
  }
}
```

---

## 📦 Module Resolution

### Import Paths

**Critical Rule: Import from `backend/dist/`, NOT `backend/src/`**

```typescript
// ✅ CORRECT
import { processReceipt } from '../backend/dist/handlers/processReceipt';

// ❌ WRONG - TypeScript source files don't work in production
import { processReceipt } from '../backend/src/handlers/processReceipt';
```

**Why?**
- Vercel runs Node.js, which only understands JavaScript
- `backend/src/` contains TypeScript source (`.ts` files)
- `backend/dist/` contains compiled JavaScript (`.js` files)
- Build step: `cd backend && npm run build` creates `dist/` from `src/`

### Build Order

Ensure backend is built **before** deploying:

```json
// package.json (root)
{
  "scripts": {
    "build": "tsc && vite build",
    "vercel-build": "npm run build && cd backend && npm install && npm run build"
  }
}
```

**Build Sequence:**
1. Frontend: `vite build` → `dist/`
2. Backend: `cd backend && npm run build` → `backend/dist/`
3. Vercel deploys both static files and API functions

### Type Imports

Use `type` imports for type-only imports (optimizes bundle size):

```typescript
// Good
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Also good (for values)
import { processReceipt } from '../backend/dist/handlers/processReceipt';
```

---

## ⚠️ Common Pitfalls

### 1. 405 Method Not Allowed

**Causes:**
- ❌ Dynamic route confusion (`[id].ts` routing issues)
- ❌ Multiple files claiming the same route
- ❌ SPA fallback catching API routes

**Solutions:**
✅ Use static routes with query params
✅ Ensure `/api/(.*)` route comes **before** SPA fallback in `vercel.json`
✅ Remove conflicting route files

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },  // API first
    { "source": "/(.*)", "destination": "/index.html" }   // SPA last
  ]
}
```

### 2. 404 Not Found

**Causes:**
- ❌ API function file not deployed
- ❌ Wrong function file name/path
- ❌ Build failed silently

**Solutions:**
✅ Check Vercel deployment logs for build errors
✅ Verify function file exists at expected path
✅ Test locally first: `vercel dev`

### 3. Module Not Found

**Causes:**
- ❌ Importing from `backend/src/` instead of `backend/dist/`
- ❌ Backend not built before deployment
- ❌ Missing dependencies in `backend/package.json`

**Solutions:**
✅ Always import from `backend/dist/`
✅ Ensure `vercel-build` script builds backend
✅ Run `npm install` in backend folder

### 4. S3 Upload Errors (403 Forbidden)

**Causes:**
- ❌ Using `ACL: 'public-read'` (deprecated in newer AWS SDKs)
- ❌ Missing bucket policy for public read
- ❌ Wrong IAM permissions

**Solutions:**
✅ Remove ACL from S3 `putObject` call
✅ Use bucket policy for public read access
✅ Verify IAM user has `s3:PutObject` permission

```typescript
// ✅ CORRECT
await s3Client.send(new PutObjectCommand({
  Bucket: bucketName,
  Key: key,
  Body: buffer,
  ContentType: file.mimetype,
  // No ACL parameter
}));
```

```json
// Bucket policy
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::your-bucket/*"
  }]
}
```

---

## 🐛 Debugging Strategies

### Local Testing First

**Use `vercel dev` for local testing:**
```powershell
# Install Vercel CLI
npm install -g vercel

# Run local dev server (simulates Vercel environment)
vercel dev
```

**Benefits:**
✅ Tests serverless functions locally
✅ Simulates Vercel routing
✅ Faster feedback than deploying
✅ See console logs immediately

### Vercel Deployment Logs

**Check logs after deployment:**
1. Go to Vercel Dashboard → Your Project
2. Click on latest deployment
3. Check "Build Logs" for compilation errors
4. Check "Function Logs" for runtime errors

**Common Log Patterns:**
```
❌ "Module not found: backend/src/..." → Import path issue
❌ "Cannot find module '@aws-sdk/...'" → Missing dependency
✅ "Build completed" → Successful deployment
```

### Network Debugging

**Use browser DevTools:**
1. Open Network tab in Chrome DevTools
2. Upload receipt or call API
3. Check request details:
   - Method: `POST`, `GET`, `DELETE`
   - Status: `200` (success), `405` (method), `404` (not found)
   - Response: Error message or data

**Common Error Responses:**
```json
// 405 Method Not Allowed
{ "error": "Method DELETE not allowed" }

// 404 Not Found
{ "error": "NOT_FOUND" }

// 500 Internal Server Error
{ "error": "Internal server error" }
```

### Git History as Reference

**Track changes systematically:**
```powershell
# Before making changes
git checkout -b feature/new-api-route

# After working changes
git commit -m "fix: migrate delete endpoint to query param"

# Document in commit messages
git log --oneline
```

**Benefits:**
✅ Revert to last working state if needed
✅ Compare working vs broken code
✅ Document what fixed the issue

---

## ☁️ AWS Integration

### Environment Variables

**Required for Vercel:**
```
MISTRAL_API_KEY=xxx
OPENROUTER_API_KEY=xxx  # optional; missing key falls back to Mistral
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1  # optional
OPENROUTER_HTTP_REFERER=http://localhost:3000  # optional
OPENROUTER_APP_NAME=SmartReceiptReader  # optional
USE_LOCAL_STORAGE=false
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET_NAME=smart-receipt-images-xxx
DYNAMODB_TABLE_NAME=smart-receipts
```

**Configure in Vercel Dashboard:**
1. Project Settings → Environment Variables
2. Add each variable
3. Select scopes: Production, Preview, Development
4. Save and redeploy

### IAM Best Practices

**Least Privilege Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Scan",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/smart-receipts"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::smart-receipt-images-*/*"
    }
  ]
}
```

**Security Tips:**
✅ Use IAM user specifically for Vercel
✅ Rotate access keys every 90 days
✅ Monitor CloudTrail for unusual activity
✅ Never commit credentials to Git

---

## ✅ Best Practices

### 1. Project Structure

**Keep concerns separated:**
```
api/           → Vercel-specific adapters
backend/src/   → Reusable business logic
components/    → React components
services/      → Frontend API clients
```

### 2. TypeScript Configuration

**Use strict mode:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### 3. Error Handling

**Always handle errors gracefully:**
```typescript
export default async function(req: VercelRequest, res: VercelResponse) {
  try {
    // Your logic
  } catch (error) {
    console.error('Error in API function:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 4. CORS Configuration

**If needed, add CORS headers:**
```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') {
  return res.status(200).end();
}
```

### 5. Testing Before Deploying

**Local testing workflow:**
```powershell
# 1. Build backend
cd backend
npm run build

# 2. Test with vercel dev
cd ..
vercel dev

# 3. Test endpoints
# POST http://localhost:3000/api/process
# GET http://localhost:3000/api/receipts
# POST http://localhost:3000/api/receipts/confirm
# DELETE http://localhost:3000/api/receipts/delete?id=xxx

# 4. If all works, deploy
vercel --prod
```

### 6. Documentation

**Document key decisions:**
- Why you chose query params over path params
- Why imports are from `dist/` not `src/`
- Environment variables needed
- Deployment steps

**Keep guides updated:**
- README.md → High-level overview
- VERCEL_DEPLOYMENT_GUIDE.md → Deployment steps
- VERCEL_DEVELOPMENT_GUIDE.md → Development practices (this file)

---

## 🎓 Key Takeaways

### What We Learned

1. **Vercel routing is sensitive** - Use static routes with query params for reliability
2. **Module resolution matters** - Always import from compiled `dist/`, not source `src/`
3. **Build order is critical** - Backend must build before deployment
4. **S3 ACLs are deprecated** - Use bucket policies instead
5. **Test locally first** - `vercel dev` catches issues before production
6. **Git history helps** - Track changes to understand what broke/fixed issues

### Migration Checklist

When moving from dynamic to static routes:
- [ ] Create new static route file (e.g., `delete.ts`)
- [ ] Update to use query parameters (`req.query.id`)
- [ ] Update frontend to use new endpoint
- [ ] Test locally with `vercel dev`
- [ ] Deploy and verify in production
- [ ] Delete old dynamic route files
- [ ] Update documentation

### Debugging Workflow

When something breaks:
1. **Check Vercel logs** - Build and function logs
2. **Test locally** - `vercel dev` to reproduce
3. **Check browser DevTools** - Network tab for API errors
4. **Review recent changes** - `git diff` to see what changed
5. **Consult documentation** - Vercel docs, AWS SDK docs
6. **Search issues** - GitHub issues, Stack Overflow
7. **Document solution** - Update guides for next time

---

## 📚 Additional Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Vercel Serverless Functions:** https://vercel.com/docs/functions/serverless-functions
- **AWS SDK for JavaScript v3:** https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/intro.html
- **React Documentation:** https://react.dev/

---

## 🔄 Continuous Improvement

This guide is a living document. As you encounter new issues or discover better practices:

1. **Document the issue** - What went wrong?
2. **Document the solution** - How did you fix it?
3. **Update this guide** - Add to relevant section
4. **Share learnings** - Help future developers (including yourself!)

**Remember:** Every bug is a learning opportunity. Document it well, and you won't face it again.

---

<div align="center">

**Built with experience from real debugging sessions**

Last Updated: January 2026

</div>
