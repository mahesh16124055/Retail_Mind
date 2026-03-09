# 📚 RetailMind Documentation

Complete documentation for the RetailMind AI-powered inventory management system.

## 📖 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Features](#features)
4. [API Reference](#api-reference)
5. [Deployment](#deployment)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Local Development

**Frontend**:
```bash
cd frontend
npm install
npm run dev
# Access at http://localhost:5173
```

**Backend**:
```bash
cd backend
mvn clean install
sam build
sam local start-api
# Access at http://localhost:3000
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │─────▶│  API Gateway │─────▶│   Lambda    │
│  Frontend   │      │              │      │  (Java 21)  │
└─────────────┘      └──────────────┘      └─────────────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │  DynamoDB   │
                                            └─────────────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │   Bedrock   │
                                            │    Nova     │
                                            └─────────────┘
```

### Technology Stack

**Frontend**:
- React 18 + TypeScript
- Material-UI (MUI)
- Recharts for visualizations
- Vite for build tooling

**Backend**:
- Java 21 + Spring Boot 3.2
- AWS Lambda (Serverless)
- Spring Security + JWT
- OpenAPI/Swagger

**AWS Services**:
- Lambda (Compute)
- DynamoDB (Database)
- Bedrock Nova (AI/ML)
- KMS (Encryption)
- S3 (Storage)
- API Gateway (API Management)
- CloudFront (CDN)

---

## ✨ Features

### 1. Simple Dashboard
**Purpose**: Quick overview of inventory status

**Components**:
- **Critical Actions Card**: Shows items needing immediate attention
- **Ask AI Card**: Interactive AI chat interface
- **Today's Summary**: Real-time metrics (Stock Value, Action Required, Low Stock)

**Key Metrics**:
- Stock Value: Total inventory valuation
- Action Required: Count of critical + low stock items
- Low Stock Items: Items below 20 units threshold

### 2. Advanced Dashboard
**Purpose**: Detailed inventory analytics

**Features**:
- Risk distribution charts (Critical vs High)
- Financial impact analysis (Revenue at Risk, ROI)
- SKU-level detailed table
- Demand scenario filters (Weekday, Festival, Slump)
- AI-powered recommendations per product

### 3. Multi-Store Analytics
**Purpose**: Compare performance across locations

**Features**:
- Comparative risk distribution charts
- Store performance cards with grades
- Top risks per store
- Stockout and overstock rates

### 4. AI Chat Assistant
**Purpose**: Natural language inventory queries

**Capabilities**:
- Ask questions in Hindi or English
- Get specific product recommendations
- Demand forecasting insights
- Powered by AWS Bedrock Nova

**Example Queries**:
- "Which SKUs are critical?"
- "What should I reorder?"
- "Show me high risk items"

### 5. WhatsApp Integration
**Purpose**: Quick reordering via WhatsApp

**How it Works**:
1. Click "Order" button on critical item
2. Select "Order via WhatsApp"
3. WhatsApp opens with pre-filled message
4. Message includes product name and request

**Languages**: Supports both Hindi and English messages

### 6. Alert System
**Purpose**: Proactive notifications

**Features**:
- Notification bell with count
- Detailed alert panel
- Acknowledge functionality
- Priority levels (HIGH, CRITICAL)

---

## 🔌 API Reference

### Base URL
```
Production: https://your-api-id.execute-api.region.amazonaws.com/Prod/api/v1
Local: http://localhost:3000/api/v1
```

### Authentication

**Login**:
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "tokenType": "Bearer"
}
```

**Using Token**:
```http
Authorization: Bearer eyJhbGc...
```

### Endpoints

#### Inventory Insights
```http
GET /insights/{storeId}
Authorization: Bearer {token}

Response:
[
  {
    "skuId": "SKU001",
    "skuName": "Tata Salt 1kg",
    "currentStock": 15,
    "riskLevel": "HIGH",
    "aiRecommendation": "Reorder 50 units...",
    "reorderQuantity": 50
  }
]
```

#### AI Chat
```http
POST /chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "storeId": "101",
  "message": "Which items should I reorder?",
  "conversationId": "optional-uuid"
}

Response:
{
  "conversationId": "uuid",
  "message": "Based on current stock levels...",
  "timestamp": "2026-03-09T10:30:00Z",
  "isAI": true,
  "bedrockMetadata": {
    "requestId": "...",
    "modelId": "amazon.nova-pro-v1:0",
    "latencyMs": 1234,
    "region": "us-east-1"
  }
}
```

#### Alerts
```http
GET /alerts/{storeId}
Authorization: Bearer {token}

Response:
[
  {
    "alertId": "alert-001",
    "skuName": "Maggi Noodles",
    "priority": "HIGH",
    "message": "Stock below threshold",
    "timestamp": "2026-03-09T10:00:00Z"
  }
]
```

#### Multi-Store Analytics
```http
GET /analytics/stores/performance
Authorization: Bearer {token}

Response:
[
  {
    "storeId": "101",
    "storeName": "Sharma Kirana Store",
    "location": "Mumbai",
    "totalSkus": 150,
    "criticalCount": 5,
    "highRiskCount": 12,
    "performanceGrade": "B+",
    "revenueAtRisk": 15000
  }
]
```

### Error Responses

```json
{
  "timestamp": "2026-03-09T10:30:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "path": "/api/v1/insights/101"
}
```

---

## 🚀 Deployment

### Prerequisites
- AWS CLI configured with appropriate credentials
- AWS SAM CLI installed
- S3 bucket for frontend hosting
- Domain name (optional)

### Frontend Deployment

```bash
# 1. Build
cd frontend
npm run build

# 2. Deploy to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# 3. Configure S3 for static website hosting
aws s3 website s3://your-bucket-name/ \
  --index-document index.html \
  --error-document index.html

# 4. Configure bucket policy
aws s3api put-bucket-policy \
  --bucket your-bucket-name \
  --policy file://bucket-policy.json
```

### Backend Deployment

```bash
# 1. Build
cd backend
mvn clean package
sam build

# 2. Deploy (first time)
sam deploy --guided

# 3. Deploy (subsequent)
sam deploy
```

### Environment Configuration

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/Prod/api/v1
```

**Backend** (AWS Systems Manager Parameter Store):
```bash
aws ssm put-parameter \
  --name /retailmind/bedrock/model-id \
  --value "amazon.nova-pro-v1:0" \
  --type String

aws ssm put-parameter \
  --name /retailmind/jwt/secret \
  --value "your-secret-key" \
  --type SecureString
```

---

## 🧪 Testing

### Backend Tests

**Run All Tests**:
```bash
cd backend
mvn test
```

**Run Specific Test**:
```bash
mvn test -Dtest=DemandPredictionServiceTest
```

**Test Types**:
1. **Unit Tests**: Service layer logic
2. **Property-Based Tests**: Demand prediction and risk detection
3. **Integration Tests**: API endpoints

### Frontend Tests

```bash
cd frontend
npm test
```

### Manual Testing Checklist

**Simple Dashboard**:
- [ ] Login with admin/admin123
- [ ] Verify stock value displays
- [ ] Check critical actions card
- [ ] Test WhatsApp integration
- [ ] Toggle Hindi/English
- [ ] Verify low stock indicators

**Advanced Dashboard**:
- [ ] Navigate to Advanced tab
- [ ] Verify charts render
- [ ] Test scenario filters
- [ ] Check SKU table
- [ ] Test AI recommendations

**Multi-Store**:
- [ ] Navigate to Multi-Store tab
- [ ] Verify store cards display
- [ ] Check comparative charts
- [ ] Test store switching

**AI Chat**:
- [ ] Open chat drawer
- [ ] Send test message
- [ ] Verify AI response
- [ ] Check Bedrock indicator
- [ ] Test Hindi queries

---

## 🔧 Troubleshooting

### Common Issues

#### Frontend won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Backend build fails
```bash
# Clean and rebuild
mvn clean install -DskipTests
sam build --use-container
```

#### API returns 401 Unauthorized
- Check if token is expired (tokens expire after 24 hours)
- Verify Authorization header format: `Bearer {token}`
- Re-login to get fresh token

#### AI Chat not responding
- Verify AWS Bedrock is enabled in your region
- Check IAM permissions for Bedrock access
- Verify model ID is correct: `amazon.nova-pro-v1:0`

#### WhatsApp integration not working
- Ensure WhatsApp is installed on device
- Check if phone number format is correct: `919876543210`
- Verify browser allows opening external apps

### Debug Mode

**Frontend**:
```bash
# Enable verbose logging
VITE_DEBUG=true npm run dev
```

**Backend**:
```bash
# Enable debug logging
sam local start-api --debug
```

### Logs

**Frontend** (Browser Console):
```javascript
// Check for errors
console.log('API Response:', response);
```

**Backend** (CloudWatch Logs):
```bash
# View logs
sam logs -n RetailMindFunction --tail

# Filter logs
sam logs -n RetailMindFunction --filter "ERROR"
```

---

## 📊 Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image optimization
- Lazy loading for charts
- Memoization with useMemo/useCallback

### Backend
- DynamoDB query optimization
- Lambda cold start reduction
- Response caching
- Batch operations

---

## 🔒 Security

### Authentication
- JWT tokens with 24-hour expiration
- Secure password hashing (BCrypt)
- HTTPS only in production

### Data Protection
- AWS KMS for encryption at rest
- TLS 1.3 for data in transit
- Input validation and sanitization

### Best Practices
- Never commit secrets to git
- Use AWS Secrets Manager for sensitive data
- Implement rate limiting
- Regular security audits

---

## 📈 Monitoring

### CloudWatch Metrics
- Lambda invocations
- API Gateway requests
- DynamoDB read/write capacity
- Bedrock API calls

### Alarms
- High error rate (> 5%)
- Slow response time (> 3s)
- DynamoDB throttling
- Lambda timeout

---

## 🤝 Support

For issues or questions:
1. Check this documentation
2. Review [AWS_DEPLOYMENT_GUIDE.md](AWS_DEPLOYMENT_GUIDE.md)
3. Check [HACKATHON_DEMO_PREP.md](HACKATHON_DEMO_PREP.md) for demo guidance

---

**Last Updated**: March 9, 2026
