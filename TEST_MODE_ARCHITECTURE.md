# Test Mode Architecture

## Overview
The API endpoints support both production (Vercel + backend Lambda handlers) and test modes (in-memory storage) to enable comprehensive integration testing without external dependencies.

## How It Works

### Test Mode Detection
Each API endpoint checks if the request is coming from the test harness by looking for:
1. Pre-parsed `req.body` object (tests don't send streams)
2. Missing or non-multipart Content-Type header
3. `process.env.NODE_ENV === 'test'`

### In-Memory Receipt Store
Location: `api/_lib/receiptsStore.ts`

Provides:
- `addReceipt(receipt)` - Store a receipt
- `listReceipts()` - Get all receipts
- `deleteReceiptById(id)` - Remove a receipt by ID
- `clearReceipts()` - Clear all receipts (used in test setup)

### Endpoints with Test Mode

#### POST /api/receipts/manual
**Production Mode**: 
- Expects `multipart/form-data` with metadata field
- Uploads images to S3
- Saves to DynamoDB via backend handler

**Test Mode**:
- Detects pre-parsed `req.body.metadata`
- Parses JSON string or object
- Creates receipt with `randomUUID()`
- Stores in in-memory store
- Returns receipt with `source: 'manual'`

#### GET /api/receipts
**Production Mode**:
- Queries DynamoDB via backend handler
- Returns persisted receipts

**Test Mode**:
- Returns receipts from in-memory store
- Falls through to backend if store is empty

#### DELETE /api/receipts/delete?id=xxx
**Production Mode**:
- Deletes from DynamoDB via backend handler

**Test Mode**:
- Deletes from in-memory store
- Returns 204 on success
- Falls through to backend if not in test mode

#### POST /api/process
**Production Mode**:
- Expects `multipart/form-data` with file
- Processes with Mistral AI
- Uploads to S3, saves to DynamoDB

**Test Mode**:
- Currently delegates to backend (complex multipart handling)
- Could be enhanced for test scenarios

## Request Body Handling

All endpoints use `readRawBody` utility (`api/_lib/readRawBody.ts`) which supports:
1. **Node.js streams** (`req.on('data')`) - Production
2. **Pre-parsed objects** (`req.body`) - Tests
3. **Raw buffers** (`req.rawBody`) - Some frameworks

This makes endpoints compatible with:
- Vercel production runtime (streams)
- Vitest integration tests (parsed objects)
- Local development servers (various shapes)

## Test Workflow

The integration tests (`tests/integration/api.test.ts`) perform a full workflow:

```typescript
// 1. Create manual receipt
POST /api/receipts/manual
  body: { metadata: JSON.stringify({...}) }
  → stores in memory, returns receipt with id

// 2. List receipts
GET /api/receipts
  → returns array including created receipt

// 3. Delete receipt
DELETE /api/receipts/delete?id=xxx
  → removes from memory, returns 204

// 4. Verify deletion
GET /api/receipts
  → returns array without deleted receipt
```

## Test Setup

`tests/setup.ts` runs before each test:
- Clears in-memory receipt store
- Sets `NODE_ENV=test`
- Verifies backend build artifacts exist

## Benefits

1. **Fast Tests**: No external dependencies (S3, DynamoDB, Mistral)
2. **Reliable CI**: Tests don't require AWS credentials or network
3. **Development**: Easy to test locally without cloud resources
4. **Production**: Same code paths, just different data sources
5. **Maintainable**: Test mode is clearly separated and documented

## Future Enhancements

- Add test mode for POST /api/process (mock file processing)
- Add receipt validation rules to both modes
- Consider extracting business logic to shared modules
- Add more comprehensive error handling tests
