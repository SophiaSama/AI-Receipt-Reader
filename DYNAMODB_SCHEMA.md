# DynamoDB Table Format Guide

## 📋 Current Table Configuration

### Table Name
```
smart-receipts
```

### Primary Key Structure
- **Partition Key:** `id` (String)
- **Sort Key:** None (simple primary key)
- **Billing Mode:** PAY_PER_REQUEST (on-demand)

---

## 🗂️ Item Schema

Each receipt item in DynamoDB follows this exact format:

### Required Attributes

```json
{
  "id": "string (UUID)",
  "merchantName": "string",
  "date": "string (YYYY-MM-DD format)",
  "total": "number",
  "currency": "string",
  "items": [
    {
      "description": "string",
      "price": "number"
    }
  ],
  "createdAt": "number (Unix timestamp in milliseconds)"
}
```

### Optional Attributes

```json
{
  "imageUrl": "string (S3 URL or local URL)",
  "rawText": "string (OCR extracted text)"
}
```

---

## 📝 Complete Example Item

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "merchantName": "Whole Foods Market",
  "date": "2026-01-21",
  "total": 87.45,
  "currency": "USD",
  "items": [
    {
      "description": "Organic Bananas 2lb",
      "price": 3.99
    },
    {
      "description": "Greek Yogurt",
      "price": 5.49
    },
    {
      "description": "Whole Wheat Bread",
      "price": 4.99
    },
    {
      "description": "Mixed Vegetables",
      "price": 6.99
    },
    {
      "description": "Chicken Breast 2lb",
      "price": 12.99
    }
  ],
  "imageUrl": "https://smart-receipt-images-123456789.s3.us-east-1.amazonaws.com/receipts/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpg",
  "rawText": "WHOLE FOODS MARKET\\n123 Main St\\nDate: 01/21/2026\\n\\nOrganic Bananas 2lb $3.99\\nGreek Yogurt $5.49\\n...",
  "createdAt": 1737475200000
}
```

---

## 🔍 Attribute Details

### `id` (String, Required)
- **Type:** UUID v4
- **Purpose:** Unique identifier for each receipt
- **Format:** `"f47ac10b-58cc-4372-a567-0e02b2c3d479"`
- **Generated:** Automatically by backend using `uuid` package
- **Partition Key:** Used for direct lookups

### `merchantName` (String, Required)
- **Type:** String
- **Purpose:** Name of the store/merchant
- **Examples:** 
  - `"Whole Foods Market"`
  - `"Target"`
  - `"Starbucks Coffee"`
- **Max Length:** Recommend 100 characters

### `date` (String, Required)
- **Type:** String (ISO 8601 date format)
- **Format:** `YYYY-MM-DD`
- **Examples:** 
  - `"2026-01-21"`
  - `"2025-12-31"`
- **Validation:** Must be valid date
- **Sorting:** Lexicographically sortable

### `total` (Number, Required)
- **Type:** Number (float)
- **Purpose:** Final receipt total amount
- **Examples:** 
  - `87.45`
  - `12.99`
  - `1234.56`
- **Precision:** 2 decimal places recommended
- **Currency:** Defined in `currency` field

### `currency` (String, Required)
- **Type:** String (ISO 4217 currency code)
- **Default:** `"USD"`
- **Examples:**
  - `"USD"` (US Dollar)
  - `"EUR"` (Euro)
  - `"GBP"` (British Pound)
  - `"JPY"` (Japanese Yen)
- **Length:** Always 3 characters

### `items` (List, Required)
- **Type:** Array of objects
- **Purpose:** List of purchased items
- **Structure:** Each item contains:
  ```json
  {
    "description": "string",
    "price": "number"
  }
  ```
- **Can be empty:** Yes `[]`
- **Example:**
  ```json
  [
    {"description": "Coffee", "price": 4.99},
    {"description": "Croissant", "price": 3.50}
  ]
  ```

### `imageUrl` (String, Optional)
- **Type:** String (URL)
- **Purpose:** Link to stored receipt image
- **AWS Format:** `https://bucket-name.s3.region.amazonaws.com/receipts/uuid.jpg`
- **Local Format:** `http://localhost:3001/images/receipts/uuid.jpg`
- **Examples:**
  - `"https://smart-receipt-images-123456789.s3.us-east-1.amazonaws.com/receipts/abc123.jpg"`
  - `"http://localhost:3001/images/receipts/xyz789.png"`

### `rawText` (String, Optional)
- **Type:** String (multiline text)
- **Purpose:** Raw OCR text extracted from image
- **Used for:** Debugging, audit trail
- **Example:**
  ```
  "WHOLE FOODS MARKET\n123 Main Street\nDate: 01/21/2026\n\nOrganic Bananas    $3.99\nGreek Yogurt       $5.49\n..."
  ```
- **Max Length:** Recommend 10,000 characters

### `createdAt` (Number, Required)
- **Type:** Number (Unix timestamp)
- **Format:** Milliseconds since epoch
- **Purpose:** Track when receipt was added
- **Example:** `1737475200000` (Jan 21, 2026)
- **Generated:** `Date.now()` in JavaScript
- **Sorting:** Easy to sort chronologically

---

## 🎯 Query Patterns

### Get Single Receipt
```typescript
// By ID (Partition Key)
const params = {
  TableName: 'smart-receipts',
  Key: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }
};
```

### Get All Receipts
```typescript
// Scan all items
const params = {
  TableName: 'smart-receipts'
};
```

### Filter by Date Range (Application-Side)
```typescript
// Note: Requires scan then filter in application
// DynamoDB doesn't have date as key
const receipts = await scanAll();
const filtered = receipts.filter(r => 
  r.date >= '2026-01-01' && r.date <= '2026-01-31'
);
```

---

## 🚀 Optimization Recommendations

### Current Setup (Simple)
✅ **Good for:**
- Small to medium datasets (< 10,000 receipts)
- Simple CRUD operations
- Cost-effective with PAY_PER_REQUEST

### For Production Scale (Optional Enhancements)

#### Add GSI for Date Queries
If you need efficient date-range queries, add a Global Secondary Index:

```yaml
GlobalSecondaryIndexes:
  - IndexName: date-index
    KeySchema:
      - AttributeName: date
        KeyType: HASH
    Projection:
      ProjectionType: ALL
    BillingMode: PAY_PER_REQUEST
```

#### Add GSI for User Support (Multi-User)
If you plan to support multiple users:

```yaml
# Add to AttributeDefinitions
- AttributeName: userId
  AttributeType: S

# Add GSI
GlobalSecondaryIndexes:
  - IndexName: user-date-index
    KeySchema:
      - AttributeName: userId
        KeyType: HASH
      - AttributeName: createdAt
        KeyType: RANGE
    Projection:
      ProjectionType: ALL
```

Then update schema:
```typescript
export interface ReceiptData {
  id: string;
  userId: string; // Add this
  // ...existing fields
}
```

---

## 📊 Size & Cost Considerations

### Item Size Calculation

**Typical item size breakdown:**
- Fixed attributes: ~200 bytes
- `items` array: ~50 bytes per item
- `rawText`: 500-2000 bytes
- `imageUrl`: ~100 bytes

**Example:** Receipt with 5 items + OCR text = ~1 KB per item

### Cost Estimate (AWS Pricing)

**PAY_PER_REQUEST (Current):**
- Write: $1.25 per million requests
- Read: $0.25 per million requests
- Storage: $0.25 per GB-month

**Example for 1,000 receipts/month:**
- Storage: ~1 MB = $0.0003/month
- Writes: 1,000 = $0.00125
- Reads: ~10,000 = $0.0025
- **Total: < $0.01/month** 💰

---

## 🔒 Security Best Practices

### 1. Attribute-Level Encryption
```yaml
# Add to table definition
SSESpecification:
  SSEEnabled: true
  SSEType: KMS
```

### 2. Point-in-Time Recovery
```yaml
PointInTimeRecoverySpecification:
  PointInTimeRecoveryEnabled: true
```

### 3. Backup Plan
```yaml
# Enable automatic backups
BackupPolicy:
  BackupPlanName: DailyBackup
```

---

## 📝 Manual Table Creation (AWS Console)

If creating manually instead of using SAM:

1. **Go to DynamoDB Console**
2. **Create Table:**
   - Table name: `smart-receipts`
   - Partition key: `id` (String)
   - Table settings: On-demand
3. **No sort key needed**
4. **Default settings for everything else**

---

## ✅ Validation Rules

### Backend Validation
```typescript
function validateReceiptData(data: Partial<ReceiptData>): boolean {
  // Required fields
  if (!data.merchantName || !data.date || data.total === undefined) {
    return false;
  }
  
  // Date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return false;
  }
  
  // Total must be positive
  if (data.total < 0) {
    return false;
  }
  
  // Currency must be 3 chars
  if (data.currency && data.currency.length !== 3) {
    return false;
  }
  
  return true;
}
```

---

## 🎯 Summary

**Keep this format for your DynamoDB table:**

```typescript
{
  id: string (UUID)           // PARTITION KEY
  merchantName: string        // REQUIRED
  date: string (YYYY-MM-DD)   // REQUIRED
  total: number               // REQUIRED
  currency: string            // REQUIRED (default: "USD")
  items: Array<{              // REQUIRED (can be empty [])
    description: string,
    price: number
  }>
  imageUrl?: string           // OPTIONAL
  rawText?: string            // OPTIONAL
  createdAt: number           // REQUIRED (timestamp)
}
```

**This format is:**
- ✅ Already implemented in your backend
- ✅ Optimized for your use case
- ✅ Cost-effective
- ✅ Scalable to thousands of receipts
- ✅ Compatible with all your existing code

**No changes needed!** Your current schema is perfect for the application. 🎉
