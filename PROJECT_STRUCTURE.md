# 📂 SmartReceiptReader - Project Structure

This document provides an overview of the project's organized file structure.

```
SmartReceiptReader/
│
├── 📁 api/                           # Vercel Serverless Functions
│   ├── process.ts                    # POST /api/process (receipt OCR)
│   ├── health.ts                     # GET /api/health (health check)
│   ├── receipts.ts                   # GET /api/receipts (list all)
│   ├── receipts/
│   │   ├── manual.ts                 # POST /api/receipts/manual
│   │   ├── confirm.ts                # POST /api/receipts/confirm
│   │   └── delete.ts                 # DELETE /api/receipts/delete
│   └── _lib/                         # Shared utilities for API
│       ├── readRawBody.ts            # Request body reader (streams/objects/buffers)
│       └── receiptsStore.ts          # In-memory storage for tests
│
├── 📁 backend/                       # Backend Source Code
│   ├── package.json                  # Backend dependencies
│   ├── template.yaml                 # AWS SAM template
│   ├── .env.example                  # Environment template
│   │
│   ├── src/                          # Source code (TypeScript)
│   │   ├── handlers/                 # API handlers
│   │   │   └── confirmReceipt.ts      # Confirm/ignore duplicate receipt
│   │   ├── services/                 # Business logic
│   │   └── utils/                    # Utilities
│   │       └── duplicateDetection.ts  # Receipt duplicate matching
│   │
│   ├── dist/                         # Compiled JavaScript (generated)
│   └── local/                        # Local dev server
│       └── server.ts
│
├── 📁 components/                    # React Components
│   ├── UploadSection.tsx
│   ├── ReceiptList.tsx
│   ├── StatsOverview.tsx
│   ├── ManualEntryForm.tsx
│   └── ReceiptFilters.tsx
│
├── 📁 services/                      # Frontend Services
│   ├── awsService.ts                 # API client
│   └── geminiService.ts              # (Legacy)
│
├── 📁 tests/                         # Test Files
│   ├── tsconfig.json                 # Test TypeScript config
│   ├── setup.ts                      # Test setup (clears in-memory store)
│   ├── README.md                     # Test documentation
│   ├── integration/                  # API integration tests
│   │   └── api.test.ts               # Test mode integration tests
│   ├── e2e/                          # End-to-end tests
│   │   └── api.e2e.test.ts           # Tests against live server
│   └── helpers/                      # Test utilities
│       └── testUtils.ts              # Mock helpers
│
├── 📁 scripts/                       # Build and utility scripts
│   └── pre-test-build.cjs            # Pre-test backend build script
│
├── 📁 docs/                          # Documentation
│   ├── assets/                       # Images and media
│   │   ├── AddReceiptUI.png
│   │   └── HistoryUI.png
│   │
│   ├── deployment/                   # Deployment guides
│   │   ├── AWS_DEPLOYMENT_GUIDE.md   # AWS Lambda deployment
│   │   ├── VERCEL_DEPLOYMENT_GUIDE.md # Vercel deployment
│   │   └── DEPLOYMENT.md             # General deployment
│   │
│   ├── development/                  # Development guides
│   │   ├── BACKEND_API_GUIDE.md      # Backend API guide
│   │   ├── VERCEL_DEVELOPMENT_GUIDE.md # Best practices
│   │   ├── TESTING_GUIDE.md          # Testing documentation
│   │   └── DYNAMODB_SCHEMA.md        # Database schema
│   │
│   ├── my_local_doc/                 # Local documentation
│   │   └── CI_CD_TESTING.md          # CI/CD test setup guide
│   │
│   ├── CONFIG_ORGANIZATION.md        # Config file guide
│   ├── TEST_SETUP.md                 # Test setup and prerequisites
│   └── TSCONFIG_STRUCTURE.md         # TypeScript config guide
│
├── 📁 .github/                       # GitHub Config
│   └── workflows/
│       └── test.yml                  # CI/CD pipeline
│
├── 📄 App.tsx                        # Main React app
├── 📄 index.tsx                      # React entry point
├── 📄 index.html                     # HTML template
├── 📄 styles.css                     # Global styles
├── 📄 types.ts                       # TypeScript definitions
│
├── 📄 tsconfig.json                  # TypeScript config (frontend/API)
├── 📄 postcss.config.cjs             # PostCSS config
├── 📄 tailwind.config.cjs            # Tailwind CSS config
├── 📄 vite.config.ts                 # Vite build config
├── 📄 vitest.config.ts               # Vitest test config
│
├── 📄 package.json                   # Frontend dependencies
├── 📄 package-lock.json              # Lockfile
├── 📄 vercel.json                    # Vercel config
├── 📄 .vercelignore                  # Vercel ignore patterns
├── 📄 .gitignore                     # Git ignore patterns
├── 📄 metadata.json                  # Project metadata
├── 📄 LICENSE                        # MIT License
│
├── 📄 README.md                      # Main readme
├── 📄 PROJECT_STRUCTURE.md           # This file
└── 📄 TEST_MODE_ARCHITECTURE.md      # Test mode documentation
```

---

## 🏗️ Architecture Highlights

### Test Mode System

The project uses a **dual-mode architecture** for API endpoints:

- **Production Mode**: Uses AWS services, processes streams, requires multipart data
- **Test Mode**: Uses in-memory storage, handles pre-parsed bodies, no external dependencies

Key files:
- `api/_lib/receiptsStore.ts` - In-memory storage for tests
- `api/_lib/readRawBody.ts` - Universal request body reader
- `scripts/pre-test-build.cjs` - Automated backend build before tests

Benefits:
- ✅ Fast, reliable integration tests (~2-5 seconds)
- ✅ No AWS credentials needed for tests
- ✅ CI/CD friendly
- ✅ Same code handles both modes

See `TEST_MODE_ARCHITECTURE.md` for detailed documentation.

## 📚 Quick Navigation

### 🚀 Getting Started
- [README.md](../README.md) - Main project documentation

### 🔧 Development
- [docs/development/BACKEND_API_GUIDE.md](docs/development/BACKEND_API_GUIDE.md) - Backend API development
- [docs/development/VERCEL_DEVELOPMENT_GUIDE.md](docs/development/VERCEL_DEVELOPMENT_GUIDE.md) - Vercel best practices
- [docs/development/TESTING_GUIDE.md](docs/development/TESTING_GUIDE.md) - Testing documentation
- [docs/development/DYNAMODB_SCHEMA.md](docs/development/DYNAMODB_SCHEMA.md) - Database schema

### 🚢 Deployment
- [docs/deployment/AWS_DEPLOYMENT_GUIDE.md](docs/deployment/AWS_DEPLOYMENT_GUIDE.md) - AWS Lambda deployment
- [docs/deployment/VERCEL_DEPLOYMENT_GUIDE.md](docs/deployment/VERCEL_DEPLOYMENT_GUIDE.md) - Vercel deployment
- [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md) - General deployment checklist

### 🧪 Testing
- [tests/README.md](tests/README.md) - Test suite overview
- Run tests: `npm test`
- Run E2E: `npm run test:e2e`

---

## 🎯 Key Design Decisions

### Why This Structure?

1. **`docs/` folder** - All documentation in one place
   - `deployment/` - Deployment-specific guides
   - `development/` - Developer guides
   - `assets/` - Images and media

2. **Root configs** - Build tools expect them here
   - Vite, Vitest, TypeScript, Tailwind, PostCSS
   - Following standard conventions
   - Better IDE support

3. **`tests/` folder** - All test files
   - `integration/` - API tests
   - `e2e/` - End-to-end tests
   - `utils/` - Test helpers

4. **`api/` folder** - Vercel serverless functions
   - Auto-deployed as API routes
   - Thin wrappers around backend logic

5. **`backend/` folder** - Backend source
   - Reusable across AWS/Vercel
   - Clear separation of concerns

---

## 🔄 File Organization Benefits

### Before (Cluttered Root)
```
SmartReceiptReader/
├── AWS_DEPLOYMENT_GUIDE.md
├── VERCEL_DEPLOYMENT_GUIDE.md
├── BACKEND_API_GUIDE.md
├── TESTING_GUIDE.md
├── NODEJS_VERSION.md
├── REVIEW_SUMMARY.md
├── AddReceiptUI.png
├── HistoryUI.png
└── ... 25+ files in root
```

### After (Organized)
```
SmartReceiptReader/
├── docs/           # All documentation (deployment, development, assets)
├── tests/          # All tests (integration, e2e, helpers)
├── api/            # Vercel serverless functions
├── backend/        # Backend source code
├── components/     # React components
├── services/       # Frontend services
└── Essential configs only in root
```

---

## 📝 Maintenance

When adding new files:
- **Documentation?** → `docs/deployment/` or `docs/development/`
- **Images/Assets?** → `docs/assets/`
- **Test file?** → `tests/integration/` or `tests/e2e/`
- **Component?** → `components/`
- **API route?** → `api/`
- **Config file?** → Root (if tool requires it) or create `config/` if many custom configs

Keep the root clean and organized! ✨
