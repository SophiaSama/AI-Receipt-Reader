# 🧾 SmartReceipt - AI-Powered Expense Tracker

<div align="center">

![SmartReceipt](https://img.shields.io/badge/AI-Mistral%20Powered-purple?style=for-the-badge)
![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![AWS](https://img.shields.io/badge/AWS-Lambda-orange?style=for-the-badge&logo=amazonaws)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-black?style=for-the-badge&logo=vercel)

**Transform receipt images into structured expense data with AI-powered OCR**

[Demo](#-demo) • [Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 📖 Overview

SmartReceipt is a modern, cloud-native expense tracking application that uses **Mistral AI** to automatically extract and structure receipt data. Simply upload a receipt image, and let AI handle the rest - no manual data entry required!

### 🎯 Key Highlights

- 🤖 **AI-Powered OCR** - Mistral AI extracts text from receipt images
- 🧠 **Smart Parsing** - LLM structures data automatically (merchant, date, items, total)
- ☁️ **Cloud Backend** - Serverless architecture on AWS Lambda or Vercel
- 📊 **Rich Dashboard** - Beautiful statistics and expense visualization
- 🔍 **Advanced Filtering** - Search and filter by merchant, amount, date range
- 📥 **CSV Export** - Download your expense data anytime
- ✍️ **Manual Entry** - Optionally add receipts manually
- 💾 **Persistent Storage** - DynamoDB for data, S3 for images

---

## ✨ Features

### 🎨 Frontend
- **Modern React UI** with TypeScript
- **Responsive Design** - Works on desktop and mobile
- **Real-time Processing** - See results instantly
- **Interactive Charts** - Expense statistics with Recharts
- **Filter & Search** - Find receipts quickly
- **Drag & Drop Upload** - Easy image handling

### 🚀 Backend
- **Serverless Architecture** - AWS Lambda or Vercel Functions
- **Mistral AI Integration** - Vision API for OCR + LLM for parsing
- **AWS Services** - DynamoDB + S3 for storage
- **RESTful API** - Clean endpoint design
- **Local Dev Mode** - In-memory storage for development
- **CORS Enabled** - Ready for frontend integration

### 🔒 Production Ready
- ✅ Environment-based configuration
- ✅ Error handling and validation
- ✅ TypeScript for type safety
- ✅ Optimized build pipeline
- ✅ Secure AWS IAM policies
- ✅ Public S3 bucket for images

---

## 🏗️ Architecture

```
┌─────────────┐
│   User App  │
│  (React)    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  API Gateway    │
│  /api/*         │
└──────┬──────────┘
       │
       ▼
┌─────────────────────────────────────┐
│         Lambda Functions            │
│  ┌─────────────────────────────┐   │
│  │  Process Receipt            │   │
│  │  (OCR + Parse + Save)       │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  Manual Entry / Get / Delete│   │
│  └─────────────────────────────┘   │
└──────┬──────────────────┬───────────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│  Mistral AI │    │  DynamoDB   │
│  OCR + LLM  │    │  + S3       │
└─────────────┘    └─────────────┘
```

### Data Flow

1. **Upload** → User uploads receipt image
2. **S3 Storage** → Backend saves image to S3
3. **OCR** → Mistral AI extracts text from image
4. **Parse** → Mistral LLM structures text into JSON
5. **Store** → Receipt data saved to DynamoDB
6. **Display** → Frontend shows structured receipt

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- AWS Account (for production) or local development mode
- Mistral AI API Key ([Get one here](https://console.mistral.ai/))

### 1️⃣ Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd SmartReceiptReader

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2️⃣ Configure Environment

```bash
# Navigate to backend directory
cd backend

# Copy environment template
copy .env.example .env

# Edit .env file
notepad .env
```

**Add your Mistral API key:**
```bash
MISTRAL_API_KEY=your_actual_mistral_api_key_here
USE_LOCAL_STORAGE=true
PORT=3001
```

### 3️⃣ Build Backend

```bash
# From backend directory
npm run build
```

### 4️⃣ Run Development Servers

```bash
# Terminal 1: Start backend (from backend directory)
npm run dev

# Terminal 2: Start frontend (from project root)
cd ..
npm run dev
```

### 5️⃣ Open Application

Navigate to: **http://localhost:3000**

---

## 📦 Project Structure

```
SmartReceiptReader/
├── 📄 App.tsx                    # Main React application
├── 📄 index.tsx                  # React entry point
├── 📄 types.ts                   # TypeScript definitions
├── 📄 vite.config.ts             # Vite configuration
├── 📄 package.json               # Frontend dependencies
├── 📄 vercel.json                # Vercel deployment config
│
├── 📁 components/                # React components
│   ├── UploadSection.tsx         # File upload UI
│   ├── ReceiptList.tsx           # Receipt display
│   ├── StatsOverview.tsx         # Expense charts
│   ├── ManualEntryForm.tsx       # Manual input
│   └── ReceiptFilters.tsx        # Search & filter
│
├── 📁 services/                  # Frontend services
│   ├── awsService.ts             # API communication
│   └── geminiService.ts          # (Legacy)
│
└── 📁 backend/                   # Backend code
    ├── 📄 package.json           # Backend dependencies
    ├── 📄 template.yaml          # AWS SAM template
    ├── 📄 tsconfig.json          # TypeScript config
    ├── 📄 .env.example           # Environment template
    │
    ├── 📁 src/
    │   ├── 📁 handlers/          # Lambda functions
    │   │   ├── processReceipt.ts # Main OCR endpoint
    │   │   ├── manualSave.ts     # Manual entry
    │   │   ├── getReceipts.ts    # Fetch all
    │   │   └── deleteReceipt.ts  # Delete receipt
    │   │
    │   ├── 📁 services/          # Business logic
    │   │   ├── mistralService.ts # AI integration
    │   │   ├── s3Service.ts      # Image storage
    │   │   └── dynamoService.ts  # Database
    │   │
    │   └── 📁 utils/             # Helpers
    │       ├── parseMultipart.ts # Form parsing
    │       └── responseHelper.ts # API responses
    │
    └── 📁 local/                 # Local development
        └── server.ts             # Express server
```

---

## 🔌 API Endpoints

### `POST /api/process`
Process receipt image with AI

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image)

**Response:**
```json
{
  "id": "uuid",
  "merchantName": "Whole Foods",
  "date": "2026-01-21",
  "total": 87.45,
  "currency": "USD",
  "items": [...],
  "imageUrl": "https://...",
  "createdAt": 1737475200000
}
```

### `POST /api/receipts/manual`
Save manual receipt entry

**Request:**
- Content-Type: `multipart/form-data`
- Body: `metadata` (JSON string), `file` (optional)

### `GET /api/receipts`
Get all receipts

**Response:** Array of receipt objects

### `DELETE /api/receipts/:id`
Delete receipt and image

**Response:** 204 No Content

---

## 🌐 Deployment

### Deploy to AWS Lambda

```bash
# Build the backend
cd backend
npm run build

# Deploy with SAM CLI
sam build
sam deploy --guided
```

**Configure:**
- Stack name: `smart-receipt-stack`
- AWS Region: `us-east-1`
- Mistral API Key: Your key
- Confirm changes: Y

**After deployment:**
- Note the API Gateway endpoint URL
- Update frontend to use production API

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel
```

**Configure Environment Variables in Vercel Dashboard:**
- `MISTRAL_API_KEY` - Your Mistral API key
- `USE_LOCAL_STORAGE` - `false`
- `AWS_REGION` - `us-east-1`
- `S3_BUCKET_NAME` - Your S3 bucket name
- `DYNAMODB_TABLE_NAME` - `smart-receipts`
- `AWS_ACCESS_KEY_ID` - Your AWS key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret

---

## 🛠️ Technology Stack

### Frontend
- **React 19.2** - UI framework
- **TypeScript 5.8** - Type safety
- **Vite 6.2** - Build tool & dev server
- **Recharts 3.6** - Charts & visualization
- **Tailwind CSS** - Styling (utility-first)

### Backend
- **Node.js 18+** - Runtime
- **Express 4.18** - Local development server
- **TypeScript 5.3** - Type safety
- **Mistral AI SDK** - AI integration
- **AWS SDK v3** - DynamoDB & S3
- **Busboy** - Multipart form parsing
- **Multer** - File upload handling

### Infrastructure
- **AWS Lambda** - Serverless compute
- **AWS API Gateway** - REST API
- **AWS DynamoDB** - NoSQL database
- **AWS S3** - Image storage
- **AWS SAM** - Infrastructure as Code
- **Vercel** - Alternative deployment

---

## 📚 Documentation

Detailed documentation is available in these files:

- **[BACKEND_API_GUIDE.md](./BACKEND_API_GUIDE.md)** - Backend development guidelines
- **[DYNAMODB_SCHEMA.md](./DYNAMODB_SCHEMA.md)** - Database schema & format
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment checklist & troubleshooting
- **[backend/CONFIGURATION.md](./backend/CONFIGURATION.md)** - Environment setup
- **[REVIEW_SUMMARY.md](./REVIEW_SUMMARY.md)** - Code review findings

---

## 🎮 Usage Examples

### Upload Receipt
1. Click "Add Receipt" area or drag & drop image
2. Wait for AI processing (~3-5 seconds)
3. Review extracted data
4. Receipt appears in history

### Manual Entry
1. Click "Add Manually" button
2. Fill in merchant, date, total
3. Optionally add items
4. Optionally attach image
5. Click "Save Receipt"

### Filter Receipts
1. Use search box for merchant names
2. Set amount range (min/max)
3. Select date range
4. Click "Clear Filters" to reset

### Export Data
1. Click "Export CSV" button
2. CSV file downloads automatically
3. Open in Excel or Google Sheets

---

## 🔧 Development

### Run Tests

```bash
# Frontend tests (if configured)
npm test

# Backend tests (if configured)
cd backend
npm test
```

### Build for Production

```bash
# Build frontend
npm run build

# Build backend
cd backend
npm run build
```

### Local Storage Mode

For development without AWS:
```bash
# In backend/.env
USE_LOCAL_STORAGE=true
```

This uses in-memory storage - data is lost on server restart.

### Mock AI Mode

For development without Mistral API key:
```bash
# In backend/.env
MISTRAL_API_KEY=your_mistral_api_key_here
# (Keep default value)
```

Backend will return mock OCR results.

---

## 🐛 Troubleshooting

### Frontend loads but API fails
- ✅ Check backend is running on port 3001
- ✅ Verify Vite proxy in `vite.config.ts`
- ✅ Check browser console for errors

### Images not loading
- ✅ Verify S3 bucket CORS configuration
- ✅ Check S3 bucket policy allows public read
- ✅ In local mode: images stored in memory

### AI processing fails
- ✅ Verify Mistral API key is correct
- ✅ Check API quota/limits
- ✅ View backend logs for details

### Data doesn't persist
- ✅ Check `USE_LOCAL_STORAGE` setting
- ✅ For production: use AWS services
- ✅ Verify DynamoDB table exists

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for comprehensive troubleshooting.

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add error handling for new features
- Update documentation for API changes
- Test locally before deploying
- Keep dependencies up to date

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Mistral AI** - For powerful OCR and LLM capabilities
- **AWS** - For serverless infrastructure
- **Vercel** - For seamless deployment
- **React Team** - For amazing UI framework
- **TypeScript** - For type safety

---

## 📞 Support

Need help? Check these resources:

- 📖 [Documentation](#-documentation)
- 🐛 [Issue Tracker](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)
- 📧 Email: your-email@example.com

---

## 🗺️ Roadmap

### Planned Features

- [ ] Multi-user support with authentication
- [ ] Mobile app (React Native)
- [ ] Receipt categories & tags
- [ ] Budget tracking & alerts
- [ ] Integration with accounting software
- [ ] Advanced analytics & reports
- [ ] Receipt splitting for shared expenses
- [ ] Multiple currency support
- [ ] Dark mode theme

---

## 📊 Stats

![GitHub Stars](https://img.shields.io/github/stars/your-repo?style=social)
![GitHub Forks](https://img.shields.io/github/forks/your-repo?style=social)
![GitHub Issues](https://img.shields.io/github/issues/your-repo)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/your-repo)

---

<div align="center">

**Built with ❤️ using Mistral AI, React, and AWS**

Made by [Your Name](https://github.com/your-profile) | January 2026

[⬆ Back to Top](#-smartreceipt---ai-powered-expense-tracker)

</div>
