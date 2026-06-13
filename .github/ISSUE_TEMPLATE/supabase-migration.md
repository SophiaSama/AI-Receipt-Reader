---
name: Supabase Migration Issue
about: Track the frontend blank screen issue after migrating to Supabase
title: "Frontend shows blank screen after Supabase migration"
labels: bug, database, migration
assignees: SophiaSama
---

## 🐛 Problem

The frontend application displays a **blank screen** after migrating from AWS DynamoDB to Supabase. No receipts are shown and there's no error feedback to the user.

## 📍 Root Cause Analysis

The frontend service layer (`services/awsService.ts`) is still hardcoded to call **AWS Lambda endpoints** and expects **DynamoDB response formats**. There is **no Supabase client integration**.

### Specific Issues:

1. **`fetchReceiptsFromDB()` (line 156-166)** - Returns empty array on failure silently
2. **No Supabase SDK** - No `@supabase/supabase-js` integration
3. **AWS endpoints** - Still calling `/api/receipts`, `/api/process`, `/api/receipts/manual`
4. **Silent failures** - No error messages displayed to user
5. **Environment variables** - No `VITE_SUPABASE_URL` or `VITE_SUPABASE_KEY` configuration

## 🔍 Affected Components

| Component | File | Issue |
|-----------|------|-------|
| **Frontend Service Layer** | `services/awsService.ts` | Still calls AWS Lambda endpoints |
| **Receipt Fetching** | `services/awsService.ts:156-166` | Returns `[]` on error |
| **App Initialization** | `App.tsx:68-78` | Calls `fetchReceiptsFromDB()` with no error handling |
| **API Endpoints** | `/api/receipts`, `/api/process` | Expect AWS/DynamoDB backend |
| **Environment Config** | `vite.config.ts` | No Supabase environment variables |

## 🔄 Current Behavior

```
User opens app
    ↓
App calls fetchReceiptsFromDB() 
    ↓
Request to /api/receipts fails (AWS endpoint not available)
    ↓
Function catches error and silently returns []
    ↓
App renders with empty receipts list
    ↓
User sees blank screen with no explanation
```

## ✅ Expected Behavior

```
User opens app
    ↓
App connects to Supabase 
    ↓
Fetches receipts from Supabase table
    ↓
Displays receipt list on screen
    ↓
User can upload, create, and manage receipts
```

## 📋 Required Changes

### Option A: Keep Vercel Backend, Swap Database
- Update `/api/receipts`, `/api/process`, `/api/receipts/manual` endpoints to use Supabase
- Frontend calls remain unchanged
- Backend handles Supabase authentication

### Option B: Direct Supabase Integration (Recommended)
- Create new `services/supabaseService.ts` with Supabase client
- Update `App.tsx` to import from new service
- Add Supabase environment variables to `.env` and Vercel
- Replace all API calls in `awsService.ts`
- Add proper error handling and user feedback

## 📝 Files That Need Updates

- [ ] `services/awsService.ts` → Create `supabaseService.ts` or update API calls
- [ ] `App.tsx` → Import from new service, add error handling
- [ ] `vite.config.ts` → Add Supabase environment variables
- [ ] `api/` routes → Integrate Supabase SDK if keeping backend
- [ ] `.env.example` → Document Supabase environment variables
- [ ] `vercel.json` or dashboard → Set Supabase env vars in Vercel

## 🔗 Related Code References

- **Service layer**: `services/awsService.ts` (lines 156-166)
- **App initialization**: `App.tsx` (lines 68-78)
- **Vite config**: `vite.config.ts`
- **API base**: `services/awsService.ts` (lines 3-6)

## 🚀 Steps to Reproduce

1. Set up Supabase project
2. Deploy backend changes to use Supabase
3. Open https://smart-receipt-reader.vercel.app
4. Observe blank screen instead of receipt list

## 📌 Notes

- Error handling needs improvement - show meaningful messages to users
- No loading state currently shown while fetching receipts
- Consider adding retry logic for failed API calls
- Add console logging for debugging Supabase connection issues

## 📚 References

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [React Error Handling Best Practices](https://react.dev/reference/react/useEffect#removing-unnecessary-object-dependencies)
