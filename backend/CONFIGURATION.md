# Backend Configuration Guide

## Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

### Required Variables

```bash
# Mistral AI API Key (get from https://console.mistral.ai/)
MISTRAL_API_KEY=your_actual_mistral_api_key_here

# Local Development Mode
USE_LOCAL_STORAGE=true

# Server Port
PORT=3001
```

### AWS Deployment Variables

When deploying to AWS, these are managed by the SAM template:

```bash
AWS_REGION=us-east-1
S3_BUCKET_NAME=smart-receipt-images-<your-account-id>
DYNAMODB_TABLE_NAME=smart-receipts
```

### Vercel Deployment Variables

When deploying to Vercel, set these in the Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `MISTRAL_API_KEY` (your API key)
   - `USE_LOCAL_STORAGE` = `false` (use cloud storage)
   - `AWS_REGION` = `us-east-1`
   - `S3_BUCKET_NAME` = your bucket name
   - `DYNAMODB_TABLE_NAME` = `smart-receipts`

**Note:** For Vercel, you need AWS credentials configured as well:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

## Local Development

1. Copy `.env.example` to `.env`
2. Update `MISTRAL_API_KEY` with your actual key
3. Keep `USE_LOCAL_STORAGE=true` for development
4. Run: `npm run dev`

## Testing Without Mistral API Key

The backend includes mock responses for development without an API key. Just keep `MISTRAL_API_KEY` as the default value or don't set it.
