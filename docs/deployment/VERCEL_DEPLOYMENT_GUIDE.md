# Vercel Deployment Guide - Complete Setup & IAM Configuration

This guide covers the complete deployment process for SmartReceiptReader on Vercel, including:
- 📂 **Project structure and root directory configuration**
- 🔐 **AWS IAM policies and permissions**
- ⚙️ **Vercel environment variables**
- 🚀 **Deployment and troubleshooting**

---

## 📂 Understanding Your Project Structure on Vercel

### Project Root Directory

The **root directory** is where Vercel starts when building and deploying your application:

```
SmartReceiptReader/                    ← ROOT DIRECTORY (Vercel starts here)
├── package.json                       ← Frontend build config
├── vercel.json                        ← Vercel deployment config
├── vite.config.ts                     ← Vite configuration
├── index.html                         ← Entry HTML
├── App.tsx                            ← React app
├── index.tsx                          ← React entry point
│
├── api/                               ← Vercel Serverless Functions
│   ├── process.ts                     ← POST /api/process (receipt OCR)
│   ├── health.ts                      ← GET /api/health (health check)
│   └── receipts/
│       ├── receipts.ts                ← GET /api/receipts (list all)
│       ├── manual.ts                  ← POST /api/receipts/manual (manual entry)
│       └── delete.ts                  ← DELETE /api/receipts/delete?id=xxx
│
├── components/                        ← React components
├── services/                          ← Frontend services
│
├── dist/                              ← Generated (after build)
│   ├── index.html                     ← Built frontend
│   ├── assets/                        ← Built JS/CSS
│   └── ...
│
└── backend/                           ← Backend source code
    ├── package.json                   ← Backend dependencies
    ├── tsconfig.json                  ← TypeScript config
    ├── src/                           ← Lambda handlers & services
    └── dist/                          ← Generated (after build)
```

### Key Concepts

**Root Directory Detection:**
1. When you run `vercel`, it looks for `vercel.json` in the current directory
2. That directory becomes the **root** - all paths in `vercel.json` are relative to it
3. In your case: `SmartReceiptReader/` is the root

**Vercel's Build Process:**
```
Step 1: Vercel detects root (SmartReceiptReader/)
   ↓
Step 2: Reads vercel.json configuration
   ↓
Step 3: Runs "vercel-build" script from root package.json
   ├─ npm run build (builds frontend → dist/)
   └─ cd backend && npm install && npm run build (builds backend → backend/dist/)
   ↓
Step 4: Deploys:
   ├─ dist/ → Static files (React SPA)
   └─ api/*.ts → Serverless Functions
```

**Important Path Rules:**
- ✅ All paths in `vercel.json` are relative to the root
- ✅ API functions in `api/` folder auto-deploy as serverless functions
- ✅ Use `/api/(.*)` route to handle all API requests before SPA fallback
- ✅ API functions import from `backend/dist/...` (compiled JavaScript)

### Your vercel.json Configuration

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**What This Does:**
1. Routes `/api/*` requests to Vercel Serverless Functions in `api/` folder
2. All other routes fallback to `index.html` (React SPA)

---

## 🔐 AWS IAM Setup - Why & How

When deploying to **Vercel**, your serverless functions need **AWS IAM credentials** to access:
- **DynamoDB** (for storing receipt data)
- **S3** (for storing receipt images)

You'll need to create an **IAM User** with appropriate policies and add the credentials to Vercel's environment variables.

---

## 🏗️ Architecture: Access Keys

### The Setup:

```
┌─────────────────────────────────────┐
│      Your AWS Account               │
│  ┌─────────────┐  ┌──────────────┐ │
│  │  DynamoDB   │  │     S3       │ │
│  │   Table     │  │   Bucket     │ │
│  └──────▲──────┘  └──────▲───────┘ │
│         │                │          │
│         │ API Calls      │          │
│         │ (Authenticated)│          │
└─────────┼────────────────┼──────────┘
          │                │
          │  Uses Access   │
          │  Key ID +      │
          │  Secret Key    │
          │                │
┌─────────┼────────────────┼──────────┐
│         │                │          │
│    ┌────┴────────────────┴─────┐   │
│    │   Vercel Serverless      │   │
│    │   Functions (Node.js)    │   │
│    └──────────────────────────┘   │
│         Vercel Infrastructure      │
│     (OUTSIDE your AWS account)     │
└────────────────────────────────────┘
```

**Key Point:** Vercel runs on **its own infrastructure**, not in your AWS account. Therefore, it needs credentials (Access Keys) to authenticate with your AWS resources.

### Access Keys for Third-Party Services:

**✅ Use Access Keys for:**
- Vercel, Netlify, Heroku (hosting platforms)
- GitHub Actions, GitLab CI, CircleCI (CI/CD)
- Mobile apps (with AWS Cognito for secure distribution)
- Desktop applications
- On-premise servers
- Any application NOT running inside AWS

**❌ Don't Use Access Keys for:**
- AWS Lambda → Use IAM Roles (automatic)
- EC2 instances → Use Instance Profiles
- ECS/Fargate → Use Task Roles
- AWS services → Use service-linked roles

---

## 🔐 Required AWS IAM Policy

### Least Privilege Policy (Most Secure)

Create a custom policy that grants **only the permissions your app needs**:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DynamoDBAccess",
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:Scan",
                "dynamodb:Query",
                "dynamodb:DeleteItem",
                "dynamodb:UpdateItem"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/smart-receipts"
        },
        {
            "Sid": "S3BucketAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::smart-receipt-images-*",
                "arn:aws:s3:::smart-receipt-images-*/*"
            ]
        }
    ]
}
```

**What This Policy Allows:**
- ✅ Read/Write/Delete items in `smart-receipts` DynamoDB table
- ✅ Upload/Read/Delete images in S3 bucket `smart-receipt-images-*`
- ❌ Nothing else (most secure)

---

## � Authentication Methods: Access Keys vs IAM Roles

You have **TWO options** for authenticating Vercel with your AWS resources:

### Method A: Access Keys (Simpler, Good for Most Cases)
- ✅ **Easier setup** (5-10 minutes)
- ✅ **Works with any platform** (Vercel, Netlify, GitHub Actions)
- ✅ **Straightforward** - just add keys to environment variables
- ⚠️ **Requires manual rotation** (recommended every 90 days)
- ⚠️ **Long-lived credentials** (active until you delete them)

**Use this if:** You want simple setup and will rotate keys regularly.

### Method B: IAM Roles with STS (More Secure, Advanced)
- ✅ **More secure** - temporary credentials that auto-expire
- ✅ **No long-lived keys** - credentials rotate automatically
- ✅ **Better audit trail** - see who assumed the role
- ✅ **AWS recommended** for third-party access
- ⚠️ **More complex setup** (requires trust relationship + External ID)
- ⚠️ **Requires STS AssumeRole calls** in your code

**Use this if:** You want maximum security and don't mind complex setup.

📚 **AWS Documentation:** [Providing Access to Third-Party AWS Accounts](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html)

---

## 🛠️ Setup Instructions

Choose your preferred method:

---

## Method A: Access Keys (Recommended for Beginners)

### Step 1: Create IAM User (AWS Console)

> **💡 Using Access Keys:** Create an IAM user with **programmatic access** for Vercel to authenticate with your AWS resources.
---

#### Creating the IAM User:

1. **Go to IAM Console:**
   - Navigate to: https://console.aws.amazon.com/iam/

2. **Create User:**
   - Click "Users" → "Create user"
   - Username: `vercel-smartreceipt-user`
   - Click "Next"

3. **Set Permissions (Do this in next step, skip for now):**
   - Don't attach policies yet (we'll do it after creating the user)
   - Click "Next"

4. **Review and Create:**
   - Review the user details
   - Click "Create user"

### Step 2: Attach Policies to User

Now attach the permissions policy to your newly created user:

1. **Navigate to the User:**
   - In IAM Console → Users → Click on `vercel-smartreceipt-user`

2. **Add Permissions:**
   - Click "Add permissions" button
   - Select "Attach policies directly"

   **Method A: Custom Policy (Recommended - Most Secure)**
   - Click "Create policy" button (opens new tab)
   - Switch to JSON tab
   - Paste the **Least Privilege Policy** from the beginning of this guide
   - Click "Next"
   - Policy name: `SmartReceiptVercelPolicy`
   - Description: `Allows Vercel to access DynamoDB and S3 for SmartReceipt app`
   - Click "Create policy"
   - Go back to the previous tab and refresh the policy list
   - Search for `SmartReceiptVercelPolicy`
   - ✅ Check the box next to it
   - Click "Add permissions"

   **Method B: AWS Managed Policies (Easier but Less Secure)**
   - Search and select: `AmazonDynamoDBFullAccess`
   - Search and select: `AmazonS3FullAccess`
   - Click "Add permissions"
   - ⚠️ **Warning:** This gives access to ALL DynamoDB tables and S3 buckets

### Step 3: Create Access Keys for Programmatic Access

> **🔑 This is where you get the credentials for Vercel!**

1. **Go to Security Credentials:**
   - Still in the user page (`vercel-smartreceipt-user`)
   - Click on "Security credentials" tab

2. **Create Access Key:**
   - Scroll down to "Access keys" section
   - Click "Create access key"

3. **Select Use Case:**
   - Choose: **"Third-party service"** or **"Application running outside AWS"**
   - ✅ This tells AWS you're using keys for an external service (Vercel)
   - Check the confirmation box: "I understand the above recommendation..."
   - Click "Next"

4. **Add Description Tag (Optional but Recommended):**
   - Description: `Vercel deployment for SmartReceipt app`
   - This helps you remember what this key is for
   - Click "Create access key"

5. **Save Credentials (CRITICAL!):**
   - ✅ **Access Key ID:** `AKIAIOSFODNN7EXAMPLE`
   - ✅ **Secret Access Key:** `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
   
   ⚠️ **IMPORTANT:**
   - **Download .csv file** (recommended)
   - **Copy both keys** to a secure password manager
   - You'll NEVER see the secret key again after this screen!
   - Click "Done"

6. **Store Securely:**
   ```
   # Good places to store:
   ✅ Password manager (1Password, LastPass, Bitwarden)
   ✅ AWS Secrets Manager
   ✅ Vercel environment variables (encrypted)
   
   # BAD places to store:
   ❌ Git repository
   ❌ Plain text file on desktop
   ❌ Slack/Email
   ❌ Screenshot
   ```

---

### Step 4: Create AWS Resources (If Not Already Created)

You need to have these AWS resources created first:

#### Create DynamoDB Table

```powershell
# Using AWS CLI
aws dynamodb create-table `
    --table-name smart-receipts `
    --attribute-definitions AttributeName=id,AttributeType=S `
    --key-schema AttributeName=id,KeyType=HASH `
    --billing-mode PAY_PER_REQUEST `
    --region ap-southeast-1
```

Or use AWS Console:
- Go to: https://console.aws.amazon.com/dynamodb/
- Click "Create table"
- Table name: `smart-receipts`
- Partition key: `id` (String)
- Table settings: On-demand
- Click "Create table"

#### Create S3 Bucket

```powershell
# Using AWS CLI (replace 123456789 with your account ID)
aws s3api create-bucket `
    --bucket smart-receipt-images-123456789 `
    --region ap-southeast-1 `
    --create-bucket-configuration LocationConstraint=ap-southeast-1

# Enable CORS
aws s3api put-bucket-cors `
    --bucket smart-receipt-images-123456789 `
    --cors-configuration file://cors.json
```

**cors.json:**
```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": []
        }
    ]
}
```

**Make bucket public for reading images:**
```powershell
# Bucket policy
aws s3api put-bucket-policy `
    --bucket smart-receipt-images-123456789 `
    --policy file://bucket-policy.json
```

**bucket-policy.json:**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::smart-receipt-images-123456789/*"
        }
    ]
}
```

---

### Step 5: Configure Vercel Environment Variables

> **Now use the Access Keys you created to configure Vercel!**

1. **Go to Vercel Dashboard:**
   - Navigate to: https://vercel.com/dashboard
   - Select your project (or create new one)

2. **Add Environment Variables:**
   - Go to: Settings → Environment Variables
   - Add the following variables:

#### Required Variables

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `MISTRAL_API_KEY` | `your-mistral-api-key` | Get from https://console.mistral.ai/ |
| `USE_LOCAL_STORAGE` | `false` | Use AWS services (not in-memory) |
| `AWS_REGION` | `ap-southeast-1` | Your AWS region |
| `AWS_ACCESS_KEY_ID` | `AKIAIOSFODNN7EXAMPLE` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtn...` | IAM user secret key |
| `S3_BUCKET_NAME` | `smart-receipt-images-123456789` | Your S3 bucket name |
| `DYNAMODB_TABLE_NAME` | `smart-receipts` | Your DynamoDB table name |

**Environment Scope:**
- Production: ✅ Yes
- Preview: ✅ Yes (optional)
- Development: ✅ Yes (optional)

3. **Save Variables:**
   - Click "Save" for each variable
   - Vercel will encrypt and securely store them

---

## Method B: IAM Roles with Temporary Credentials (Most Secure)

> **🔒 Advanced Security:** Use IAM Roles for temporary credentials that auto-rotate. AWS recommends this for third-party access.

📚 **Reference:** [AWS Guide - Third-Party AWS Accounts](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html)

### Overview of IAM Role Method

**How it works:**
1. Create an IAM Role in your AWS account
2. Set up a trust policy allowing "external" principals
3. Use an External ID for extra security
4. Your Vercel functions call `STS AssumeRole` to get temporary credentials
5. Temporary credentials expire automatically (1-12 hours)

**Advantages:**
- ✅ No long-lived credentials stored
- ✅ Automatic credential rotation
- ✅ More secure than static keys
- ✅ Better CloudTrail audit logging

### Step 1: Create IAM Role for Third-Party Access

1. **Go to IAM Console:**
   - Navigate to: https://console.aws.amazon.com/iam/
   - Click "Roles" → "Create role"

2. **Select Trusted Entity:**
   - Trusted entity type: **"AWS account"**
   - Choose: **"Another AWS account"**
   - Account ID: Enter Vercel's AWS account ID (if they provide one)
   - OR use your own account ID temporarily: `123456789012` (replace with yours)
   - ✅ Check: **"Require external ID"**
   - External ID: `smartreceipt-vercel-external-id` (create a unique random string)
   - Click "Next"

   > **💡 External ID:** Acts as a password. Only code with this ID can assume the role. Store it securely!

3. **Attach Permissions Policy:**
   - Search and select: `SmartReceiptVercelPolicy` (the custom policy you created)
   - Or create a new policy with the permissions from the beginning of this guide
   - Click "Next"

4. **Name the Role:**
   - Role name: `VercelSmartReceiptRole`
   - Description: `Role for Vercel to access DynamoDB and S3 with temporary credentials`
   - Click "Create role"

5. **Note the Role ARN:**
   - Copy the Role ARN: `arn:aws:iam::123456789012:role/VercelSmartReceiptRole`
   - You'll need this in your code

### Step 2: Update Backend Code to Use STS AssumeRole

You need to modify your backend services to assume the role instead of using static credentials.

#### Install AWS STS Package (Already Included)

```powershell
cd backend
# AWS STS is already included in @aws-sdk/client-sts
```

#### Create STS Credentials Helper

Create a new file: `backend/src/utils/awsCredentials.ts`

```typescript
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';

const stsClient = new STSClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

let cachedCredentials: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
} | null = null;

export async function getTemporaryCredentials() {
  // Return cached credentials if still valid
  if (cachedCredentials && cachedCredentials.expiration > new Date()) {
    return {
      accessKeyId: cachedCredentials.accessKeyId,
      secretAccessKey: cachedCredentials.secretAccessKey,
      sessionToken: cachedCredentials.sessionToken,
    };
  }

  // Assume role to get temporary credentials
  const command = new AssumeRoleCommand({
    RoleArn: process.env.AWS_ROLE_ARN!, // e.g., arn:aws:iam::123456789012:role/VercelSmartReceiptRole
    RoleSessionName: `vercel-smartreceipt-${Date.now()}`,
    ExternalId: process.env.AWS_EXTERNAL_ID!, // Your external ID
    DurationSeconds: 3600, // 1 hour (min: 900, max: 43200)
  });

  const response = await stsClient.send(command);

  if (!response.Credentials) {
    throw new Error('Failed to assume role');
  }

  // Cache credentials
  cachedCredentials = {
    accessKeyId: response.Credentials.AccessKeyId!,
    secretAccessKey: response.Credentials.SecretAccessKey!,
    sessionToken: response.Credentials.SessionToken!,
    expiration: response.Credentials.Expiration!,
  };

  return {
    accessKeyId: cachedCredentials.accessKeyId,
    secretAccessKey: cachedCredentials.secretAccessKey,
    sessionToken: cachedCredentials.sessionToken,
  };
}
```

#### Update DynamoDB Service

Modify `backend/src/services/dynamoService.ts`:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, /* ...existing imports */ } from '@aws-sdk/lib-dynamodb';
import { getTemporaryCredentials } from '../utils/awsCredentials';

const isLocalMode = process.env.USE_LOCAL_STORAGE === 'true';
const useIAMRole = process.env.USE_IAM_ROLE === 'true';

// Function to create DynamoDB client
async function createDynamoClient() {
  if (isLocalMode) {
    return null;
  }

  if (useIAMRole) {
    // Get temporary credentials from STS
    const credentials = await getTemporaryCredentials();
    return DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: process.env.AWS_REGION || 'ap-southeast-1',
        credentials,
      })
    );
  }

  // Use static credentials (Access Keys)
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: process.env.AWS_REGION || 'ap-southeast-1',
    })
  );
}

// Update all functions to use the dynamic client
export const saveReceipt = async (receipt: ReceiptData): Promise<ReceiptData> => {
  if (isLocalMode) {
    localReceiptStore.set(receipt.id, receipt);
    return receipt;
  }

  const dynamoClient = await createDynamoClient();
  // ...rest of the function
};

// Similarly update other functions...
```

#### Update S3 Service

Modify `backend/src/services/s3Service.ts` similarly.

### Step 3: Configure Vercel Environment Variables

Add these environment variables in Vercel Dashboard:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `USE_IAM_ROLE` | `true` | Enable IAM Role authentication |
| `AWS_ROLE_ARN` | `arn:aws:iam::123456789012:role/VercelSmartReceiptRole` | Role ARN from Step 1 |
| `AWS_EXTERNAL_ID` | `smartreceipt-vercel-external-id` | Your external ID |
| `AWS_REGION` | `ap-southeast-1` | Your AWS region |
| `AWS_ACCESS_KEY_ID` | (Empty or initial bootstrap key) | For STS client initialization |
| `AWS_SECRET_ACCESS_KEY` | (Empty or initial bootstrap key) | For STS client initialization |
| `S3_BUCKET_NAME` | `smart-receipt-images-123456789` | Your S3 bucket |
| `DYNAMODB_TABLE_NAME` | `smart-receipts` | Your DynamoDB table |
| `MISTRAL_API_KEY` | `your-mistral-key` | Your Mistral API key |

> **Note:** You may need minimal AWS credentials to initialize the STS client, or you can use Vercel's AWS integration if available.

### Step 4: Update Trust Policy (If Using Your Own Account)

If you used your own AWS account ID in the trust policy, update it to allow the specific IAM user or leave it as-is for broader access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "smartreceipt-vercel-external-id"
        }
      }
    }
  ]
}
```

### Step 5: Deploy and Test

```powershell
# Deploy to Vercel
vercel --prod

# Test - credentials should auto-rotate
curl https://your-app.vercel.app/api/receipts
```

### Benefits of IAM Roles Method

| Feature | Access Keys | IAM Roles (STS) |
|---------|-------------|-----------------|
| **Credential Lifetime** | Permanent (until rotated) | Temporary (1-12 hours) |
| **Rotation** | Manual | Automatic |
| **Security** | Good | Better |
| **Setup Complexity** | Simple | Advanced |
| **Compromise Risk** | Higher (keys persist) | Lower (keys expire) |
| **AWS Recommended** | For simple cases | For production |
| **Code Changes** | None | Requires STS calls |

### Troubleshooting IAM Roles

**Issue: "AccessDenied" when assuming role**
- ✅ Verify External ID matches
- ✅ Check trust policy allows your account
- ✅ Ensure role has correct permissions policy

**Issue: "Credentials expired"**
- ✅ Credentials expire after DurationSeconds
- ✅ Code should automatically refresh (cached)
- ✅ Check expiration time in logs

**Issue: "Role ARN not found"**
- ✅ Verify role exists in IAM console
- ✅ Check ARN format is correct
- ✅ Ensure correct AWS account ID

---

## 🎯 Which Method Should You Choose?

### Choose Access Keys (Method A) If:
- ✅ You're just starting out
- ✅ You want quick and simple setup
- ✅ You'll rotate keys every 90 days
- ✅ You're comfortable with key management

### Choose IAM Roles (Method B) If:
- ✅ You want maximum security
- ✅ You're in a production environment
- ✅ You have time for complex setup
- ✅ You want automatic credential rotation
- ✅ You need compliance with security policies

**Most Users:** Start with **Method A (Access Keys)**, then upgrade to **Method B (IAM Roles)** when ready.

---

### Step 6: Deploy to Vercel (Both Methods)

```powershell
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Or deploy to production
vercel --prod
```

**What Happens:**
1. ✅ Frontend builds (React + Vite)
2. ✅ Backend builds (TypeScript → JavaScript)
3. ✅ Serverless functions created
4. ✅ Environment variables injected
5. ✅ Deployment complete

---

### Step 7: Test Deployment

```powershell
# Your Vercel URL will be something like:
# https://smart-receipt-reader.vercel.app

# Test API endpoints
curl https://smart-receipt-reader.vercel.app/api/receipts

# Or open in browser and test upload
```

---

## 📊 Access Keys vs IAM Roles - Quick Comparison

| Feature | Access Keys (Your Case) | IAM Roles |
|---------|------------------------|-----------|
| **Use Case** | External services (Vercel) | AWS services (Lambda, EC2) |
| **Credentials** | Access Key ID + Secret | Temporary tokens (automatic) |
| **Rotation** | Manual (recommended every 90 days) | Automatic (every hour) |
| **Storage** | Stored in Vercel env vars | Not stored, fetched on-demand |
| **Security Risk** | Medium (if leaked, persists until rotated) | Low (tokens expire automatically) |
| **Setup Complexity** | Easy | Requires cross-account setup for external |
| **Best For** | Third-party platforms | AWS-native services |

**Why not use IAM Roles for Vercel?**
- IAM Roles with cross-account access require:
  - Trust relationship configuration
  - External ID setup
  - STS AssumeRole calls
  - More complex than access keys for this use case
- Access Keys are the standard AWS-recommended approach for third-party services

---

## 🔒 Security Best Practices

### 1. Use Least Privilege Policy

✅ **DO:** Use custom policy with minimal permissions (Option 1)
❌ **DON'T:** Use `*` or full access policies unless necessary

### 2. Rotate Credentials Regularly

```powershell
# Create new access key
aws iam create-access-key --user-name vercel-smartreceipt-user

# Update Vercel environment variables

# Delete old access key
aws iam delete-access-key --user-name vercel-smartreceipt-user --access-key-id OLD_KEY_ID
```

### 3. Monitor Usage

- Enable CloudTrail to log API calls
- Set up CloudWatch alarms for unusual activity
- Review IAM Access Advisor regularly

### 4. Use Separate IAM Users for Each Environment

```
vercel-smartreceipt-prod    (Production)
vercel-smartreceipt-staging (Preview)
vercel-smartreceipt-dev     (Development)
```

### 5. Enable MFA on Root Account

- Never use root account credentials
- Always use IAM users
- Enable MFA on root for extra security

---

## 📊 IAM Policy Breakdown

### DynamoDB Permissions Explained

| Action | Purpose | Used By |
|--------|---------|---------|
| `dynamodb:PutItem` | Create/update receipt | Process, Manual Save |
| `dynamodb:GetItem` | Get single receipt | Delete (verify exists) |
| `dynamodb:Scan` | Get all receipts | Get Receipts |
| `dynamodb:DeleteItem` | Remove receipt | Delete Receipt |
| `dynamodb:Query` | Search receipts | Future feature |
| `dynamodb:UpdateItem` | Edit receipt | Future feature |

### S3 Permissions Explained

| Action | Purpose | Used By |
|--------|---------|---------|
| `s3:PutObject` | Upload image | Process, Manual Save |
| `s3:GetObject` | View image | Frontend, Delete |
| `s3:DeleteObject` | Remove image | Delete Receipt |
| `s3:ListBucket` | List images | Debugging |

---

## 🔍 Verifying IAM Setup

### Test IAM Permissions Locally

```powershell
# Configure AWS CLI with IAM user credentials
aws configure --profile vercel-user
# Enter Access Key ID
# Enter Secret Access Key
# Enter region: ap-southeast-1

# Test DynamoDB access
aws dynamodb scan --table-name smart-receipts --profile vercel-user

# Test S3 access
aws s3 ls s3://smart-receipt-images-123456789 --profile vercel-user
```

### Check IAM Policy Simulator

1. Go to: https://policysim.aws.amazon.com/
2. Select user: `vercel-smartreceipt-user`
3. Test actions:
   - `dynamodb:PutItem` on `smart-receipts`
   - `s3:PutObject` on your bucket
4. Verify all return "allowed"

---

## 🐛 Troubleshooting

### Issue: "Access Denied" Error in Vercel Logs

**Cause:** IAM policy doesn't grant required permissions

**Solution:**
1. Check IAM policy is attached to user
2. Verify policy allows the specific action
3. Check resource ARNs match your table/bucket names
4. Verify credentials are correct in Vercel

### Issue: "Cannot find table smart-receipts"

**Cause:** DynamoDB table doesn't exist or wrong region

**Solution:**
```powershell
# List tables in your region
aws dynamodb list-tables --region ap-southeast-1

# Create table if missing (see Step 2 above)
```

### Issue: "Bucket does not exist"

**Cause:** S3 bucket not created or wrong name

**Solution:**
```powershell
# List buckets
aws s3 ls

# Create bucket if missing (see Step 2 above)
```

### Issue: Images return 403 Forbidden

**Cause:** S3 bucket policy doesn't allow public read

**Solution:**
```powershell
# Apply public read policy (see Step 2 above)
aws s3api put-bucket-policy --bucket your-bucket-name --policy file://bucket-policy.json
```

---

## 💰 Cost Implications

### IAM Costs
- **Free** - No charge for IAM users or policies

### DynamoDB Costs (Pay-per-request)
- **Free Tier:** 25 GB storage + 25 WCU + 25 RCU
- **Vercel Usage:** Minimal - likely stays in free tier
- **After Free Tier:** $1.25 per million writes, $0.25 per million reads

### S3 Costs
- **Free Tier:** 5 GB storage (first 12 months)
- **Vercel Usage:** Depends on receipt images stored
- **After Free Tier:** $0.023 per GB/month + $0.005 per 1000 PUT requests

**Estimated Monthly Cost: $0-5** (mostly free tier eligible)

---

## 🔄 Alternative: Vercel KV & Blob Storage

If you want to avoid AWS altogether:

### Vercel KV (Alternative to DynamoDB)
```typescript
import { kv } from '@vercel/kv';

// Store receipt
await kv.set(`receipt:${id}`, receipt);

// Get receipt
const receipt = await kv.get(`receipt:${id}`);

// List all
const keys = await kv.keys('receipt:*');
```

### Vercel Blob (Alternative to S3)
```typescript
import { put, del } from '@vercel/blob';

// Upload image
const blob = await put('receipt.jpg', file, { access: 'public' });

// Delete image
await del(blob.url);
```

**Pros:**
- ✅ No AWS credentials needed
- ✅ Simpler setup
- ✅ Integrated with Vercel

**Cons:**
- ❌ Vendor lock-in (Vercel only)
- ❌ Different pricing model
- ❌ Requires code changes

---

## ✅ Summary Checklist

Before deploying to Vercel, ensure:

- [ ] IAM user created with appropriate policy
- [ ] Access Key ID and Secret Access Key saved
- [ ] DynamoDB table `smart-receipts` created
- [ ] S3 bucket created with CORS enabled
- [ ] S3 bucket policy allows public read
- [ ] Mistral API key obtained
- [ ] All environment variables configured in Vercel
- [ ] Backend code compiled (`npm run build`)
- [ ] Vercel CLI installed
- [ ] Ready to deploy!

---

## 📚 Additional Resources

- **IAM Best Practices:** https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- **Vercel Environment Variables:** https://vercel.com/docs/concepts/projects/environment-variables
- **AWS Policy Generator:** https://awspolicygen.s3.amazonaws.com/policygen.html
- **DynamoDB Pricing:** https://aws.amazon.com/dynamodb/pricing/
- **S3 Pricing:** https://aws.amazon.com/s3/pricing/

---

## 🎯 Quick Commands Reference

```powershell
# Create IAM policy
aws iam create-policy --policy-name SmartReceiptVercelPolicy --policy-document file://policy.json

# Create IAM user
aws iam create-user --user-name vercel-smartreceipt-user

# Attach policy to user
aws iam attach-user-policy --user-name vercel-smartreceipt-user --policy-arn arn:aws:iam::ACCOUNT_ID:policy/SmartReceiptVercelPolicy

# Create access key
aws iam create-access-key --user-name vercel-smartreceipt-user

# Deploy to Vercel
vercel --prod
```
