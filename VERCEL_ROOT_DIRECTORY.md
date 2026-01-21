## 📂 Your Project Structure on Vercel

### Current Structure:

```
SmartReceiptReader/                    ← ROOT DIRECTORY (Vercel starts here)
├── package.json                       ← Frontend build config
├── vercel.json                        ← Vercel deployment config
├── vite.config.ts                     ← Vite configuration
├── index.html                         ← Entry HTML
├── App.tsx                            ← React app
├── index.tsx                          ← React entry point
│
├── dist/                              ← Generated (after build)
│   ├── index.html                     ← Built frontend
│   ├── assets/                        ← Built JS/CSS
│   └── ...
│
└── backend/                           ← Backend directory
    ├── package.json                   ← Backend dependencies
    ├── tsconfig.json                  ← TypeScript config
    ├── src/                           ← Source code
    └── dist/                          ← Generated (after build)
        └── local/
            └── server.js              ← Compiled Express server
```

---

## 🔍 Understanding Vercel's Root Directory

The **root directory** is:
- ✅ The folder where `vercel.json` is located
- ✅ The folder where the main `package.json` is located
- ✅ The starting point for all paths in `vercel.json`
- ✅ The directory you're in when you run `vercel` command

### In Your Case:

```powershell
# Navigate to root directory
cd d:\projects\SmartReceiptReader

# Deploy from here
vercel
```

**Root:** `SmartReceiptReader/`

---

## ⚙️ How Vercel Interprets Your Configuration

### 1. Root Directory Detection

When you run `vercel`, it:
1. Looks for `vercel.json` in current directory
2. If found, uses that directory as **root**
3. All paths in `vercel.json` are relative to this root

### 2. Your `vercel.json` Paths

```json
{
    "builds": [
        {
            "src": "package.json",              // Root: ./package.json
            "use": "@vercel/static-build"
        },
        {
            "src": "backend/dist/local/server.js",  // Root: ./backend/dist/local/server.js
            "use": "@vercel/node"
        }
    ],
    "rewrites": [
        {
            "source": "/api/(.*)",
            "destination": "backend/dist/local/server.js"  // Root: ./backend/dist/local/server.js
        }
    ]
}
```

**All paths are relative to `SmartReceiptReader/`**

### 3. Build Process

```
Step 1: Vercel detects root (SmartReceiptReader/)
   ↓
Step 2: Reads vercel.json
   ↓
Step 3: Runs "vercel-build" script from root package.json
   ├─ npm run build (builds frontend → dist/)
   └─ cd backend && npm install && npm run build (builds backend → backend/dist/)
   ↓
Step 4: Deploys:
   ├─ dist/ → Static files (React app)
   └─ backend/dist/local/server.js → Serverless function
```

---

## 🌐 Vercel Dashboard Configuration

### Option 1: Auto-Detection (Recommended)

When you import your project to Vercel:

1. **Root Directory:** Leave empty or use `.` (auto-detected)
2. **Framework Preset:** Vite
3. **Build Command:** `npm run vercel-build` (from package.json)
4. **Output Directory:** `dist` (from vercel.json)

### Option 2: Manual Configuration

If Vercel asks during setup:

| Setting | Value | Notes |
|---------|-------|-------|
| **Root Directory** | `.` or leave empty | Current directory |
| **Framework** | Vite | Auto-detected |
| **Build Command** | `npm run vercel-build` | Custom script |
| **Output Directory** | `dist` | Frontend output |
| **Install Command** | `npm install` | Default |

---

## 🎨 Deployment Scenarios

### Scenario 1: Deploying from Git (Recommended)

```bash
# 1. Push to GitHub/GitLab/Bitbucket
git add .
git commit -m "Deploy to Vercel"
git push origin main

# 2. Import project in Vercel Dashboard
# - Connect to your Git repository
# - Vercel auto-detects SmartReceiptReader as root
# - Leave "Root Directory" field empty (auto-detects)
# - Click "Deploy"
```

**Root Directory:** Auto-detected from repository root

### Scenario 2: Deploying with Vercel CLI

```powershell
# Navigate to project root
cd d:\projects\SmartReceiptReader

# Deploy
vercel

# Vercel uses current directory as root
```

**Root Directory:** Current working directory

### Scenario 3: Monorepo (Not Your Case)

If your project was in a monorepo:

```
monorepo/
├── frontend/              ← You'd set this as root
│   ├── package.json
│   └── vercel.json
└── backend/
    └── package.json
```

You would configure:
- **Root Directory:** `frontend`

---

## 📝 Your Current Setup is Correct

### Why Your Structure Works:

1. ✅ **Root is correct:** `SmartReceiptReader/` contains `vercel.json`
2. ✅ **Frontend in root:** React app at root level
3. ✅ **Backend in subdirectory:** `backend/` folder
4. ✅ **Build script:** `vercel-build` handles both
5. ✅ **Paths are relative:** All paths in `vercel.json` are from root

### File Locations After Build:

```
Root (SmartReceiptReader/)
│
├── dist/                              ← Frontend (serves at /)
│   ├── index.html                     → https://your-app.vercel.app/
│   └── assets/
│       └── index-abc123.js
│
└── backend/dist/local/server.js       ← Backend (serves /api/*)
                                       → https://your-app.vercel.app/api/*
```

---

## 🔧 Vercel Environment Context

### Directory Structure on Vercel Servers:

When deployed, Vercel creates:

```
/vercel/path0/                         ← Vercel's working directory
├── package.json                       ← Your root package.json
├── vercel.json                        ← Your vercel.json
├── dist/                              ← Built frontend
│   └── index.html
├── backend/
│   └── dist/
│       └── local/
│           └── server.js              ← Runs as serverless function
└── node_modules/                      ← Dependencies
```

**All your paths work relative to `/vercel/path0/`**

---

## 🚨 Common Issues & Solutions

### Issue 1: "Could not find package.json"

**Cause:** Running `vercel` from wrong directory

**Solution:**
```powershell
# Make sure you're in the root
cd d:\projects\SmartReceiptReader
pwd  # Should show: d:\projects\SmartReceiptReader
vercel
```

### Issue 2: "Build failed: Cannot find backend/dist/local/server.js"

**Cause:** Backend not built before deployment

**Solution:**
```powershell
# Ensure vercel-build script runs
# Check package.json has:
"vercel-build": "npm run build && cd backend && npm install && npm run build"
```

### Issue 3: API routes return 404

**Cause:** Incorrect paths in `vercel.json` rewrites

**Solution:** Verify paths are relative to root:
```json
{
    "rewrites": [
        {
            "source": "/api/(.*)",
            "destination": "backend/dist/local/server.js"  // ← Relative to root
        }
    ]
}
```

### Issue 4: Environment variables not working

**Cause:** Variables not set in Vercel Dashboard

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all required variables
3. Redeploy for changes to take effect

---

## 🎯 Best Practices

### 1. Keep Root Simple
✅ **DO:**
```
SmartReceiptReader/          ← Root
├── vercel.json              ← Deployment config
├── package.json             ← Frontend build
└── backend/                 ← Backend in subdirectory
    └── package.json         ← Backend dependencies
```

❌ **DON'T:**
```
SmartReceiptReader/
└── frontend/                ← Unnecessary nesting
    ├── vercel.json
    └── backend/
```

### 2. Use Relative Paths
✅ **DO:** `"src": "backend/dist/local/server.js"`
❌ **DON'T:** `"src": "./backend/dist/local/server.js"` (leading ./ not needed)
❌ **DON'T:** `"src": "/backend/dist/local/server.js"` (absolute path)

### 3. Test Locally First
```powershell
# Simulate Vercel's build process
cd d:\projects\SmartReceiptReader
npm run vercel-build

# Verify both dist/ and backend/dist/ exist
dir dist
dir backend\dist
```

### 4. Use .vercelignore (Optional)
Create `.vercelignore` to exclude files:
```
node_modules/
.git/
*.log
.env
backend/src/
backend/node_modules/
```

---

## 📊 Summary Table

| Concept | Value | Description |
|---------|-------|-------------|
| **Root Directory** | `SmartReceiptReader/` | Where vercel.json lives |
| **Working Directory** | `SmartReceiptReader/` | Where you run `vercel` |
| **Frontend Output** | `dist/` | Built React app |
| **Backend Output** | `backend/dist/local/server.js` | Compiled Node.js server |
| **API Route** | `/api/*` | Proxied to backend |
| **Static Files** | `/*` | Served from dist/ |
| **Build Command** | `npm run vercel-build` | Builds both frontend & backend |

---

## ✅ Quick Checklist

Before deploying to Vercel:

- [ ] You're in the root directory (`SmartReceiptReader/`)
- [ ] `vercel.json` exists in root
- [ ] `package.json` exists in root
- [ ] `vercel-build` script exists in root `package.json`
- [ ] Backend `package.json` exists in `backend/`
- [ ] All paths in `vercel.json` are relative to root
- [ ] Environment variables configured in Vercel Dashboard
- [ ] Tested build locally: `npm run vercel-build`

---

## 🚀 Deploy Commands

```powershell
# 1. Navigate to root
cd d:\projects\SmartReceiptReader

# 2. Verify you're in the right place
dir vercel.json  # Should exist

# 3. Deploy
vercel                    # Deploy to preview
# OR
vercel --prod            # Deploy to production

# 4. Vercel will use current directory as root
```

---

## 🔗 Additional Resources

- **Vercel Configuration:** https://vercel.com/docs/projects/project-configuration
- **Vercel Build Step:** https://vercel.com/docs/deployments/builds
- **Vercel Monorepos:** https://vercel.com/docs/monorepos

---

## 🎉 Your Setup is Optimal!

Your current root directory configuration is perfect:
- ✅ Root at project level
- ✅ Frontend at root
- ✅ Backend in subdirectory
- ✅ Single build command handles both
- ✅ Paths are clean and relative

**No changes needed - deploy with confidence!** 🚀
