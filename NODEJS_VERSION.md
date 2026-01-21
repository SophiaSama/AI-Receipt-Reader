# Node.js Version Guide for SmartReceiptReader

## 🎯 Recommended Version

### **Use Node.js 20.x LTS**

**Why Node.js 20?**
- ✅ Current LTS (Long Term Support) until April 2026
- ✅ Best performance and security
- ✅ Supported by AWS Lambda
- ✅ Supported by Vercel
- ✅ Compatible with all dependencies
- ✅ TypeScript 5.x works perfectly

---

## 📋 Version Configuration

### Current Status

Your project is configured for:
- **AWS Lambda:** `nodejs18.x` (in template.yaml)
- **Local Dev:** Uses your installed Node.js version
- **Dependencies:** Compatible with Node.js 18+

### Recommended Update

**Update to Node.js 20 for better performance and longer support:**

#### 1. Update AWS SAM Template

File: `backend/template.yaml`

Change:
```yaml
Globals:
  Function:
    Runtime: nodejs18.x  # OLD
```

To:
```yaml
Globals:
  Function:
    Runtime: nodejs20.x  # RECOMMENDED
```

#### 2. Add Engine Specification

File: `backend/package.json`

Add after "version":
```json
{
  "name": "smart-receipt-backend",
  "version": "1.0.0",
  "engines": {
    "node": ">=20.0.0"
  },
  "description": "..."
}
```

File: `package.json` (root)

Add:
```json
{
  "name": "smartreceipt---ai-expense-tracker",
  "version": "0.0.0",
  "engines": {
    "node": ">=20.0.0"
  },
  "type": "module",
  ...
}
```

---

## 🔧 Installation Instructions

### Windows (Current System)

#### Option 1: Official Installer (Recommended)
1. Download from: https://nodejs.org/
2. Choose "20.x LTS (Recommended For Most Users)"
3. Run installer
4. Verify: `node --version` (should show v20.x.x)

#### Option 2: Using nvm-windows
```powershell
# Install nvm-windows from: https://github.com/coreybutler/nvm-windows

# Install Node.js 20
nvm install 20

# Use Node.js 20
nvm use 20

# Verify
node --version
```

#### Option 3: Using Chocolatey
```powershell
# If you have Chocolatey installed
choco install nodejs-lts

# Verify
node --version
```

### Linux/macOS

#### Using nvm (Recommended)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20
nvm install 20

# Use Node.js 20
nvm use 20

# Set as default
nvm alias default 20

# Verify
node --version
```

---

## 📊 Version Compatibility Matrix

| Component | Node 18.x | Node 20.x | Node 22.x |
|-----------|-----------|-----------|-----------|
| **AWS Lambda** | ✅ Supported | ✅ Supported | ⚠️ Not yet |
| **Vercel** | ✅ Supported | ✅ Supported | ✅ Beta |
| **TypeScript 5.8** | ✅ Compatible | ✅ Compatible | ✅ Compatible |
| **React 19** | ✅ Compatible | ✅ Compatible | ✅ Compatible |
| **AWS SDK v3** | ✅ Compatible | ✅ Compatible | ✅ Compatible |
| **Mistral AI SDK** | ✅ Compatible | ✅ Compatible | ✅ Compatible |
| **Express 4** | ✅ Compatible | ✅ Compatible | ✅ Compatible |
| **Vite 6** | ✅ Compatible | ✅ Compatible | ✅ Compatible |

---

## 🚀 Deployment Platforms

### AWS Lambda

**Available Runtimes:**
- `nodejs18.x` - Node.js 18 (Supported until May 2025)
- `nodejs20.x` - Node.js 20 ✅ **RECOMMENDED**
- `nodejs22.x` - Coming soon

**Current Status:**
- Your template.yaml uses `nodejs18.x`
- Recommend updating to `nodejs20.x`

### Vercel

**Default:** Automatically detects from `package.json` engines field

**Specify in vercel.json:**
```json
{
  "version": 2,
  "functions": {
    "backend/dist/local/server.js": {
      "runtime": "nodejs20.x"
    }
  }
}
```

Or in Vercel Dashboard:
- Project Settings → General → Node.js Version → 20.x

---

## ⚙️ After Installing Node.js 20

### 1. Verify Installation
```powershell
node --version
# Should show: v20.x.x

npm --version
# Should show: 10.x.x or higher
```

### 2. Clean Install Dependencies
```powershell
# Frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Backend
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
cd ..
```

### 3. Test Local Development
```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm run dev
```

---

## 🔍 Checking Current Version

### Check System Node.js
```powershell
node --version
npm --version
```

### Check Project Requirements
```powershell
# Check if engines field exists
type package.json | findstr "engines"
type backend\package.json | findstr "engines"
```

---

## 🐛 Troubleshooting

### Issue: "Unsupported engine" warning
**Solution:** Your Node.js version doesn't meet requirements
```powershell
# Check required version
type package.json | findstr "engines"

# Install correct version
nvm install 20
nvm use 20
```

### Issue: npm commands fail
**Solution:** Clear npm cache
```powershell
npm cache clean --force
Remove-Item -Recurse -Force node_modules
npm install
```

### Issue: Different versions in different terminals
**Solution:** Set Node.js 20 as default
```powershell
# With nvm-windows
nvm use 20
nvm alias default 20
```

### Issue: Lambda deployment fails with "Runtime not supported"
**Solution:** Update template.yaml
```yaml
Runtime: nodejs20.x  # Change from nodejs18.x
```

---

## 📝 Summary

### For Development (Local)
- **Minimum:** Node.js 18.x
- **Recommended:** Node.js 20.x LTS ✅
- **Maximum:** Node.js 22.x (may have compatibility issues)

### For AWS Lambda Deployment
- **Current:** nodejs18.x (in your template)
- **Recommended:** nodejs20.x ✅
- **Action Required:** Update `backend/template.yaml`

### For Vercel Deployment
- **Recommended:** Node.js 20.x
- **Action Required:** Add engines field to `package.json` files

---

## ✅ Quick Action Checklist

To prepare your project for optimal deployment:

- [ ] Install Node.js 20.x LTS on your system
- [ ] Update `backend/template.yaml` runtime to `nodejs20.x`
- [ ] Add `"engines": { "node": ">=20.0.0" }` to both package.json files
- [ ] Clean install dependencies (`npm install`)
- [ ] Test locally to ensure everything works
- [ ] Commit changes to git
- [ ] Deploy to AWS/Vercel

---

## 🔗 Official Resources

- **Node.js Downloads:** https://nodejs.org/
- **Node.js LTS Schedule:** https://github.com/nodejs/release#release-schedule
- **AWS Lambda Runtimes:** https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- **Vercel Node.js:** https://vercel.com/docs/runtimes#official-runtimes/node-js
- **nvm-windows:** https://github.com/coreybutler/nvm-windows
