## Infrastructure as Code (IaC)

Your project uses **AWS SAM** which automatically creates ALL infrastructure when you deploy:

1. ✅ **4 Lambda Functions** (automatically created)
2. ✅ **API Gateway** (automatically created)
3. ✅ **DynamoDB Table** (automatically created)
4. ✅ **S3 Bucket** (automatically created)
5. ✅ **IAM Roles & Policies** (automatically created)

### Single Command Deployment

```powershell
# This ONE command creates everything:
cd backend
sam build
sam deploy --guided
```

That's it! No manual AWS Console work needed. 🎉

---

## 📋 What Gets Created Automatically

### 1️⃣ Lambda Functions (4 Total)

The SAM template defines these functions that are **automatically created**:

#### **ProcessReceiptFunction**
- **Purpose:** Process receipt images with AI
- **Endpoint:** `POST /api/process`
- **Handler:** `src/handlers/processReceipt.handler`
- **Runtime:** Node.js 20.x
- **Memory:** 512 MB
- **Timeout:** 30 seconds
- **Permissions:** DynamoDB + S3 read/write

#### **ManualSaveFunction**
- **Purpose:** Save manual receipt entries
- **Endpoint:** `POST /api/receipts/manual`
- **Handler:** `src/handlers/manualSave.handler`
- **Runtime:** Node.js 20.x
- **Memory:** 512 MB
- **Timeout:** 30 seconds
- **Permissions:** DynamoDB + S3 read/write

#### **GetReceiptsFunction**
- **Purpose:** Retrieve all receipts
- **Endpoint:** `GET /api/receipts`
- **Handler:** `src/handlers/getReceipts.handler`
- **Runtime:** Node.js 20.x
- **Memory:** 512 MB
- **Timeout:** 30 seconds
- **Permissions:** DynamoDB read

#### **DeleteReceiptFunction**
- **Purpose:** Delete receipt and image
- **Endpoint:** `DELETE /api/receipts/{id}`
- **Handler:** `src/handlers/deleteReceipt.handler`
- **Runtime:** Node.js 20.x
- **Memory:** 512 MB
- **Timeout:** 30 seconds
- **Permissions:** DynamoDB + S3 read/write

### 2️⃣ API Gateway

- **Type:** REST API
- **Stage:** prod
- **CORS:** Enabled for all origins
- **Methods:** GET, POST, DELETE, OPTIONS
- **Automatically connects** to Lambda functions

### 3️⃣ DynamoDB Table

- **Table Name:** `smart-receipts`
- **Partition Key:** `id` (String)
- **Billing:** Pay-per-request (on-demand)
- **Created automatically** with proper schema

### 4️⃣ S3 Bucket

- **Bucket Name:** `smart-receipt-images-{your-account-id}`
- **CORS:** Enabled
- **Public Read:** Enabled for images
- **Bucket Policy:** Automatically configured

### 5️⃣ IAM Roles & Policies

- **Lambda Execution Roles:** Created for each function
- **Permissions:** Automatically granted based on SAM template
- **Principle of Least Privilege:** Each function gets only what it needs

---

## 🛠️ Step-by-Step Deployment

### Prerequisites

1. **Install AWS CLI**
   ```powershell
   # Download from: https://aws.amazon.com/cli/
   # Or use Chocolatey:
   choco install awscli
   ```

2. **Install SAM CLI**
   ```powershell
   # Using npm (recommended):
   npm install -g aws-sam-cli
   
   # Or using Chocolatey:
   choco install aws-sam-cli
   ```

3. **Configure AWS Credentials**
   ```powershell
   aws configure
   # Enter:
   # - AWS Access Key ID
   # - AWS Secret Access Key
   # - Default region (e.g., us-east-1)
   # - Default output format (json)
   ```

4. **Verify Setup**
   ```powershell
   aws --version
   sam --version
   aws sts get-caller-identity  # Test credentials
   ```

### Deployment Process

#### Step 1: Build Backend Code
```powershell
cd backend

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Verify dist/ folder was created
dir dist
```

#### Step 2: Build SAM Package
```powershell
# This prepares the deployment package
sam build
```

**What happens:**
- ✅ Copies compiled code to `.aws-sam/build/`
- ✅ Packages dependencies
- ✅ Prepares CloudFormation template
- ✅ Validates template syntax

#### Step 3: Deploy to AWS (First Time)
```powershell
# Guided deployment (interactive)
sam deploy --guided
```

**You'll be asked:**

1. **Stack Name:** `smart-receipt-stack` (or your choice)
2. **AWS Region:** `us-east-1` (or your preferred region)
3. **Parameter MistralApiKey:** `your-mistral-api-key-here`

**Optional OpenRouter support:** If you plan to use non-Mistral models, add `OPENROUTER_API_KEY` to the Lambda environment variables in [backend/template.yaml](../../backend/template.yaml) and pass it as a parameter during deployment.
4. **Confirm changes before deploy:** `Y`
5. **Allow SAM CLI IAM role creation:** `Y`
6. **Disable rollback:** `N`
7. **ProcessReceiptFunction has no auth:** `Y` (all functions)
8. **Save arguments to config file:** `Y`
9. **Config file name:** `samconfig.toml` (default)
10. **Config environment:** `default` (default)

#### Step 4: Subsequent Deployments
```powershell
# After first deployment, just use:
sam deploy

# Or use the npm script:
npm run deploy
```

---

## 📊 What Happens During Deployment

### Phase 1: Package Upload
```
Uploading to smart-receipt-stack/xxxxx  XXXXXX KB
```
- Code uploaded to S3 (temporary)

### Phase 2: CloudFormation Stack Creation
```
CloudFormation stack changeset
---------------------------------
Operation                   LogicalResourceId             ResourceType
---------------------------------
+ Add                       ProcessReceiptFunction        AWS::Lambda::Function
+ Add                       ManualSaveFunction            AWS::Lambda::Function
+ Add                       GetReceiptsFunction           AWS::Lambda::Function
+ Add                       DeleteReceiptFunction         AWS::Lambda::Function
+ Add                       ReceiptApi                    AWS::Serverless::Api
+ Add                       ReceiptsTable                 AWS::DynamoDB::Table
+ Add                       ImagesBucket                  AWS::S3::Bucket
+ Add                       ImagesBucketPolicy            AWS::S3::BucketPolicy
```

### Phase 3: Resource Creation (5-10 minutes)
```
CREATE_IN_PROGRESS   AWS::CloudFormation::Stack    smart-receipt-stack
CREATE_IN_PROGRESS   AWS::DynamoDB::Table          ReceiptsTable
CREATE_IN_PROGRESS   AWS::S3::Bucket               ImagesBucket
CREATE_IN_PROGRESS   AWS::Lambda::Function         ProcessReceiptFunction
CREATE_IN_PROGRESS   AWS::Lambda::Function         ManualSaveFunction
CREATE_IN_PROGRESS   AWS::Lambda::Function         GetReceiptsFunction
CREATE_IN_PROGRESS   AWS::Lambda::Function         DeleteReceiptFunction
CREATE_IN_PROGRESS   AWS::ApiGateway::RestApi      ReceiptApi
...
CREATE_COMPLETE      AWS::CloudFormation::Stack    smart-receipt-stack
```

### Phase 4: Outputs
```
Key                 ApiEndpoint
Description         API Gateway endpoint URL
Value               https://xxxxx.execute-api.us-east-1.amazonaws.com/prod

Key                 ReceiptsTableName
Description         DynamoDB table name
Value               smart-receipts

Key                 ImagesBucketName
Description         S3 bucket name
Value               smart-receipt-images-123456789
```

---

## 🔍 Verifying Deployment

### Check in AWS Console

#### Lambda Functions
1. Go to: https://console.aws.amazon.com/lambda/
2. You should see 4 functions:
   - `smart-receipt-stack-ProcessReceiptFunction-xxxxx`
   - `smart-receipt-stack-ManualSaveFunction-xxxxx`
   - `smart-receipt-stack-GetReceiptsFunction-xxxxx`
   - `smart-receipt-stack-DeleteReceiptFunction-xxxxx`

#### API Gateway
1. Go to: https://console.aws.amazon.com/apigateway/
2. You should see: `smart-receipt-stack-ReceiptApi-xxxxx`
3. Click → Stages → prod
4. Note the Invoke URL

#### DynamoDB
1. Go to: https://console.aws.amazon.com/dynamodb/
2. You should see table: `smart-receipts`

#### S3
1. Go to: https://console.aws.amazon.com/s3/
2. You should see bucket: `smart-receipt-images-{account-id}`

### Test API Endpoints

```powershell
# Get your API endpoint
$API_ENDPOINT = "https://xxxxx.execute-api.us-east-1.amazonaws.com/prod"

# Test health check (if you add one)
curl "$API_ENDPOINT/api/health"

# Test get receipts (should return empty array initially)
curl "$API_ENDPOINT/api/receipts"

# Test upload (requires multipart form data)
# Use Postman or frontend app
```

---

## 🔄 Updating Your Deployment

### When You Make Code Changes

```powershell
cd backend

# 1. Rebuild TypeScript
npm run build

# 2. Rebuild SAM package
sam build

# 3. Deploy updates
sam deploy

# Or use the npm script:
npm run deploy
```

**SAM automatically:**
- ✅ Updates only changed Lambda functions
- ✅ Preserves data in DynamoDB
- ✅ Keeps S3 bucket and images
- ✅ Updates API Gateway if needed
- ✅ Zero-downtime deployment

---

## 💰 Cost Estimation

### Lambda Functions
- **Free Tier:** 1M requests + 400,000 GB-seconds per month
- **After Free Tier:** ~$0.20 per 1M requests
- **Your Usage:** Likely stays in free tier

### API Gateway
- **Free Tier:** 1M API calls per month (first 12 months)
- **After Free Tier:** $3.50 per 1M requests
- **Your Usage:** Minimal cost

### DynamoDB
- **Free Tier:** 25 GB storage + 25 WCU + 25 RCU
- **Pay-per-request:** Likely stays in free tier
- **Your Usage:** < $1/month

### S3
- **Free Tier:** 5 GB storage (first 12 months)
- **After Free Tier:** $0.023 per GB/month
- **Your Usage:** < $1/month

**Total Expected Cost: $0-5/month** (likely free tier eligible)

---

## 🗑️ Cleanup / Deletion

### Delete Entire Stack

```powershell
# Delete all resources
sam delete

# Or specify stack name
aws cloudformation delete-stack --stack-name smart-receipt-stack
```

**This removes:**
- ✅ All 4 Lambda functions
- ✅ API Gateway
- ✅ DynamoDB table (⚠️ data will be lost!)
- ✅ S3 bucket (⚠️ images will be deleted!)
- ✅ All IAM roles

### Delete Only S3 Contents (Keep Stack)

```powershell
# Empty S3 bucket first
aws s3 rm s3://smart-receipt-images-{account-id}/ --recursive
```

---

## 🐛 Troubleshooting

### Issue: SAM deploy fails with "Unable to upload artifact"

**Solution:**
```powershell
# Clear SAM cache
Remove-Item -Recurse -Force .aws-sam

# Rebuild
sam build
sam deploy
```

### Issue: "CREATE_FAILED" for Lambda function

**Causes:**
- Code compilation errors
- Missing dependencies
- Invalid handler path

**Solution:**
```powershell
# Check build output
cd backend
npm run build
dir dist\src\handlers  # Verify files exist

# Check SAM logs
sam logs -n ProcessReceiptFunction --stack-name smart-receipt-stack --tail
```

### Issue: API returns 502 Bad Gateway

**Cause:** Lambda function error

**Solution:**
```powershell
# View Lambda logs
sam logs -n ProcessReceiptFunction --stack-name smart-receipt-stack --tail

# Or in AWS Console:
# CloudWatch → Log Groups → /aws/lambda/smart-receipt-stack-ProcessReceiptFunction-xxxxx
```

### Issue: S3 bucket creation fails (already exists)

**Cause:** Bucket names must be globally unique

**Solution:**
```yaml
# Edit backend/template.yaml
BucketName: !Sub 'smart-receipt-images-${AWS::AccountId}-${AWS::Region}'
```

---

## ✅ Summary

### What You Need to Do:
1. ✅ Install AWS CLI
2. ✅ Install SAM CLI
3. ✅ Configure AWS credentials
4. ✅ Build backend: `npm run build`
5. ✅ Deploy: `sam deploy --guided`

### What AWS SAM Does Automatically:
1. ✅ Creates 4 Lambda functions
2. ✅ Creates API Gateway
3. ✅ Creates DynamoDB table
4. ✅ Creates S3 bucket
5. ✅ Configures all permissions
6. ✅ Sets up CORS
7. ✅ Connects everything together

### What You DON'T Need to Do:
- ❌ Manually create Lambda functions in Console
- ❌ Manually create API Gateway
- ❌ Manually create DynamoDB table
- ❌ Manually configure IAM roles
- ❌ Manually set up CORS
- ❌ Manually wire up triggers

**Everything is automated! Just run `sam deploy --guided` and you're done!** 🎉

---

## 🔗 Useful Commands

```powershell
# Build project
sam build

# Deploy (first time)
sam deploy --guided

# Deploy (subsequent)
sam deploy

# View logs
sam logs -n ProcessReceiptFunction --stack-name smart-receipt-stack --tail

# Test function locally
sam local invoke ProcessReceiptFunction

# Start local API
sam local start-api

# Delete stack
sam delete

# Validate template
sam validate

# Check CloudFormation status
aws cloudformation describe-stacks --stack-name smart-receipt-stack
```

---

## 📚 Additional Resources

- **AWS SAM Documentation:** https://docs.aws.amazon.com/serverless-application-model/
- **AWS Lambda Documentation:** https://docs.aws.amazon.com/lambda/
- **SAM CLI Reference:** https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-command-reference.html
- **Your SAM Template:** `backend/template.yaml`
