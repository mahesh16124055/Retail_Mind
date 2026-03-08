# 🚀 AWS Deployment Guide - RetailMind

## 📋 Prerequisites

### 1. Install Required Tools
- ✅ Java 21 (already have)
- ✅ Maven 3.9.13 (already configured)
- ⚠️ AWS CLI
- ⚠️ AWS SAM CLI

### 2. AWS Account Setup
- AWS Account with admin access
- AWS credentials configured
- Region: us-east-1 (or your preferred region)

---

## 🔧 Step 1: Install AWS CLI (If Not Installed)

### Windows Installation
```powershell
# Download and install AWS CLI
# Visit: https://awscli.amazonaws.com/AWSCLIV2.msi
# Or use winget:
winget install Amazon.AWSCLI
```

### Verify Installation
```powershell
aws --version
# Should show: aws-cli/2.x.x
```

---

## 🔧 Step 2: Install AWS SAM CLI (If Not Installed)

### Windows Installation
```powershell
# Download and install SAM CLI
# Visit: https://github.com/aws/aws-sam-cli/releases/latest/download/AWS_SAM_CLI_64_PY3.msi
# Or use winget:
winget install Amazon.SAM-CLI
```

### Verify Installation
```powershell
sam --version
# Should show: SAM CLI, version 1.x.x
```

---

## 🔑 Step 3: Configure AWS Credentials

### Option A: Using AWS CLI Configure
```powershell
aws configure
```

You'll be prompted for:
- **AWS Access Key ID**: [Your access key]
- **AWS Secret Access Key**: [Your secret key]
- **Default region name**: us-east-1
- **Default output format**: json

### Option B: Manual Configuration
Create/edit `~/.aws/credentials`:
```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

Create/edit `~/.aws/config`:
```ini
[default]
region = us-east-1
output = json
```

### Verify Credentials
```powershell
aws sts get-caller-identity
```

Should return your AWS account details.

---

## 📦 Step 4: Build the Application

### Build Maven Package
```powershell
# Set Maven path (if needed)
$env:PATH += ";$env:USERPROFILE\maven\apache-maven-3.9.13\bin"

# Build the application
mvn -f backend/pom.xml clean package -DskipTests
```

### Verify Build
Check that the JAR file exists:
```powershell
ls backend/target/api-0.0.1-SNAPSHOT-aws.jar
```

You should see the AWS-optimized JAR file (~50-80 MB).

---

## 🏗️ Step 5: Build SAM Application

### Build with SAM
```powershell
sam build
```

This will:
- Validate template.yaml
- Package dependencies
- Prepare for deployment

### Expected Output
```
Build Succeeded

Built Artifacts  : .aws-sam/build
Built Template   : .aws-sam/build/template.yaml
```

---

## 🚀 Step 6: Deploy to AWS

### First-Time Deployment (Guided)
```powershell
sam deploy --guided
```

You'll be prompted for:

1. **Stack Name**: `retailmind-api` (or your choice)
2. **AWS Region**: `us-east-1` (or your choice)
3. **Confirm changes before deploy**: `Y`
4. **Allow SAM CLI IAM role creation**: `Y`
5. **Disable rollback**: `N`
6. **RetailMindApiFunction has no authentication**: `Y` (we use JWT)
7. **Save arguments to configuration file**: `Y`
8. **SAM configuration file**: `samconfig.toml` (default)
9. **SAM configuration environment**: `default` (default)

### Subsequent Deployments
```powershell
sam deploy
```

Uses saved configuration from `samconfig.toml`.

---

## ⏱️ Step 7: Wait for Deployment

Deployment takes 3-5 minutes. You'll see:

```
CloudFormation stack changeset
---------------------------------
Operation                LogicalResourceId        ResourceType
---------------------------------
+ Add                    RetailMindApiFunction    AWS::Lambda::Function
+ Add                    ServerlessRestApi        AWS::ApiGateway::RestApi
...

Deploying with following values
===============================
Stack name                   : retailmind-api
Region                       : us-east-1
...

Waiting for changeset to be created..
Waiting for stack create/update to complete
...

Successfully created/updated stack - retailmind-api in us-east-1
```

---

## 🎯 Step 8: Get Your API URL

### From Deployment Output
Look for the output section:
```
CloudFormation outputs from deployed stack
-----------------------------------------------------------------
Outputs
-----------------------------------------------------------------
Key                 RetailMindApi
Description         API Gateway endpoint URL for Prod environment
Value               https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod/
-----------------------------------------------------------------
```

### Or Query CloudFormation
```powershell
aws cloudformation describe-stacks --stack-name retailmind-api --query "Stacks[0].Outputs[?OutputKey=='RetailMindApi'].OutputValue" --output text
```

### Save Your API URL
```powershell
# Example URL
$API_URL = "https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod"
```

---

## 🧪 Step 9: Test Your Deployment

### Test 1: Initialize Database
```powershell
# Initialize DynamoDB tables
curl -X POST "$API_URL/api/v1/data/init-tables"
```

Expected response:
```
All tables created. Default admin user: admin/admin123
```

### Test 2: Login
```powershell
# Login to get JWT token
$response = curl -X POST "$API_URL/api/v1/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"admin123"}' | ConvertFrom-Json

$token = $response.accessToken
echo "Token: $token"
```

### Test 3: Seed Data
```powershell
# Seed sample data for store 101
curl -X POST "$API_URL/api/v1/data/seed/101" `
  -H "Authorization: Bearer $token"
```

Expected response:
```
Seed data successfully injected for store: 101
```

### Test 4: Get Insights
```powershell
# Get inventory insights
curl -X GET "$API_URL/api/v1/dashboard/insights/101?scenario=NORMAL" `
  -H "Authorization: Bearer $token"
```

Should return JSON array with inventory insights.

### Test 5: Swagger UI
Open in browser:
```
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod/swagger-ui.html
```

---

## 🌐 Step 10: Update Frontend

### Update API URL in Frontend
Edit `frontend/.env`:
```env
VITE_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod/api/v1
```

Or create if it doesn't exist:
```powershell
echo "VITE_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod/api/v1" > frontend/.env
```

### Rebuild Frontend
```powershell
cd frontend
npm run build
```

### Deploy Frontend to S3 (Optional)
```powershell
# Create S3 bucket
aws s3 mb s3://retailmind-frontend

# Enable static website hosting
aws s3 website s3://retailmind-frontend --index-document index.html

# Upload build files
aws s3 sync dist/ s3://retailmind-frontend --acl public-read

# Get website URL
echo "Frontend URL: http://retailmind-frontend.s3-website-us-east-1.amazonaws.com"
```

---

## 📊 Step 11: Monitor Your Application

### View Lambda Logs
```powershell
# Get recent logs
sam logs -n RetailMindApiFunction --stack-name retailmind-api --tail
```

### View CloudWatch Logs
```powershell
# Open CloudWatch in browser
aws cloudwatch get-dashboard --dashboard-name RetailMind
```

### Check Lambda Metrics
```powershell
# Get function metrics
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name Invocations `
  --dimensions Name=FunctionName,Value=retailmind-api-RetailMindApiFunction-xxxxx `
  --start-time 2024-01-01T00:00:00Z `
  --end-time 2024-12-31T23:59:59Z `
  --period 3600 `
  --statistics Sum
```

---

## 🔄 Step 12: Update Deployment

### Make Code Changes
1. Edit your Java code
2. Rebuild: `mvn -f backend/pom.xml clean package -DskipTests`
3. Redeploy: `sam build && sam deploy`

### Quick Update Script
```powershell
# Save as deploy.ps1
$env:PATH += ";$env:USERPROFILE\maven\apache-maven-3.9.13\bin"
mvn -f backend/pom.xml clean package -DskipTests
sam build
sam deploy
```

Run with:
```powershell
.\deploy.ps1
```

---

## 🗑️ Step 13: Delete Stack (When Done)

### Delete CloudFormation Stack
```powershell
sam delete --stack-name retailmind-api
```

Or:
```powershell
aws cloudformation delete-stack --stack-name retailmind-api
```

### Verify Deletion
```powershell
aws cloudformation describe-stacks --stack-name retailmind-api
```

Should return error: "Stack does not exist"

---

## 🐛 Troubleshooting

### Issue 1: Maven Not Found
```powershell
# Add Maven to PATH
$env:PATH += ";$env:USERPROFILE\maven\apache-maven-3.9.13\bin"

# Verify
mvn --version
```

### Issue 2: AWS CLI Not Configured
```powershell
# Configure credentials
aws configure

# Test
aws sts get-caller-identity
```

### Issue 3: SAM Build Fails
```powershell
# Clean and rebuild
rm -r .aws-sam
mvn -f backend/pom.xml clean package -DskipTests
sam build
```

### Issue 4: Deployment Timeout
```powershell
# Increase timeout in template.yaml
Globals:
  Function:
    Timeout: 60  # Increase from 30 to 60
```

### Issue 5: Lambda Cold Start
```powershell
# Already optimized with:
# - JAVA_TOOL_OPTIONS for faster startup
# - MemorySize: 1024 MB
# - Tiered compilation

# If still slow, increase memory:
Globals:
  Function:
    MemorySize: 2048  # Increase from 1024
```

### Issue 6: DynamoDB Access Denied
```powershell
# Verify IAM permissions in template.yaml
Policies:
  - AmazonDynamoDBFullAccess  # Should be present
```

### Issue 7: Bedrock Access Denied
```powershell
# Verify IAM permissions in template.yaml
Policies:
  - AmazonBedrockFullAccess  # Should be present

# Also check Bedrock model access in AWS Console
# Navigate to: Bedrock > Model access > Request access
```

---

## 💰 Cost Estimation

### AWS Lambda
- **Free Tier**: 1M requests/month, 400,000 GB-seconds
- **After Free Tier**: $0.20 per 1M requests
- **Compute**: $0.0000166667 per GB-second

### API Gateway
- **Free Tier**: 1M API calls/month (first 12 months)
- **After Free Tier**: $3.50 per million requests

### DynamoDB
- **Free Tier**: 25 GB storage, 25 read/write capacity units
- **On-Demand**: $1.25 per million write requests, $0.25 per million read requests

### Amazon Bedrock
- **Claude 3 Haiku**: $0.00025 per 1K input tokens, $0.00125 per 1K output tokens
- **Estimated**: $0.01-0.05 per recommendation

### Total Estimated Cost
- **Light Usage** (100 requests/day): $5-10/month
- **Moderate Usage** (1,000 requests/day): $50-100/month
- **Heavy Usage** (10,000 requests/day): $200-500/month

---

## 🎯 Production Checklist

### Before Going Live
- [ ] Configure custom domain (Route 53)
- [ ] Enable CloudWatch alarms
- [ ] Set up DynamoDB backups
- [ ] Configure CORS properly
- [ ] Enable API Gateway caching
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable X-Ray tracing
- [ ] Configure CloudFront CDN
- [ ] Set up CI/CD pipeline
- [ ] Enable auto-scaling

### Security Hardening
- [ ] Rotate JWT secret key
- [ ] Enable API Gateway throttling
- [ ] Configure VPC (if needed)
- [ ] Enable encryption at rest
- [ ] Set up AWS Secrets Manager
- [ ] Configure IAM least privilege
- [ ] Enable CloudTrail logging
- [ ] Set up AWS Config rules

---

## 📚 Additional Resources

### AWS Documentation
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Lambda Java Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-java.html)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)

### Useful Commands
```powershell
# View all stacks
aws cloudformation list-stacks

# View stack resources
aws cloudformation describe-stack-resources --stack-name retailmind-api

# View Lambda functions
aws lambda list-functions

# View DynamoDB tables
aws dynamodb list-tables

# View API Gateway APIs
aws apigateway get-rest-apis
```

---

## 🎉 Success!

Your RetailMind API is now deployed to AWS! 🚀

**Next Steps**:
1. Test all endpoints
2. Update frontend with API URL
3. Deploy frontend to S3
4. Share with hackathon judges
5. Win the hackathon! 🏆

---

**Need Help?**
- Check CloudWatch logs: `sam logs -n RetailMindApiFunction --tail`
- Review AWS Console: https://console.aws.amazon.com
- Test with Swagger UI: `https://your-api-url/swagger-ui.html`

**Good luck! 🍀**
