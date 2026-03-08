# RetailMind AI - Inventory Intelligence Platform

RetailMind is an AI-powered inventory intelligence platform designed for the Indian Kirana and Quick Commerce ecosystem. Built for the **AI for Bharat Hackathon**, it features a completely serverless AWS architecture powered by Amazon Bedrock for Generative AI insights.

## Live Demo

🚀 **Frontend:** http://retailmind-hackathon-ui.s3-website-us-east-1.amazonaws.com/  
🔗 **Backend API:** https://1l75w3f5o1.execute-api.us-east-1.amazonaws.com/Prod/api/v1  
📚 **API Documentation:** https://1l75w3f5o1.execute-api.us-east-1.amazonaws.com/Prod/swagger-ui.html

**Demo Credentials:**
- Username: `admin`
- Password: `admin123`

## Architecture

Enterprise-grade **Java 21 + Spring Boot 3.2** infrastructure deployed on AWS:

- **Compute:** AWS Lambda (Java 21 via Spring Cloud Function)
- **Database:** Amazon DynamoDB (Single-Table NoSQL design)
- **GenAI Engine:** Amazon Bedrock (Claude 3 Haiku for inventory recommendations)
- **Frontend:** React + TypeScript + Material-UI (Hosted on Amazon S3)
- **API Gateway:** AWS API Gateway with JWT authentication
- **Infrastructure as Code:** AWS SAM (`template.yaml`)

## Key Features

### Core Intelligence
1. **AI-Powered Insights:** Amazon Bedrock (Claude 3 Haiku) generates contextual inventory recommendations based on stock levels, demand patterns, and seasonal factors
2. **Demand Forecasting:** 7/14/30-day demand predictions with confidence intervals and trend analysis
3. **Risk Detection:** Real-time alerts for stockouts, expiry risks, and overstock situations
4. **Financial Analytics:** Revenue-at-risk calculations and ROI projections for inventory decisions

### Advanced Capabilities
5. **Multi-Store Analytics:** Compare performance across multiple store locations
6. **Smart Alerts System:** Proactive notifications for critical inventory situations
7. **AI Chat Assistant:** Conversational interface for inventory queries using natural language
8. **Scenario Planning:** Test inventory strategies under different conditions (festivals, monsoons, normal days)

### Enterprise Features
- **JWT Authentication & Authorization:** Role-based access control (RBAC)
- **OpenAPI/Swagger Documentation:** Interactive API documentation
- **Property-Based Testing:** Correctness validation using QuickTheories
- **Serverless Architecture:** Auto-scaling, pay-per-use AWS infrastructure

## Project Structure

```
RetailMind/
├── backend/                  # Java 21 Spring Boot Application
│   ├── src/main/java/com/retailmind/api/
│   │   ├── application/      # Application services & DTOs
│   │   ├── domain/           # Domain models & repository
│   │   ├── infrastructure/   # AWS Lambda handler
│   │   ├── interfaces/       # REST controllers
│   │   └── security/         # JWT authentication
│   ├── src/test/java/        # Unit & property-based tests
│   └── pom.xml               # Maven configuration
├── frontend/                 # React TypeScript Application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Dashboard & main pages
│   │   └── services/         # API integration
│   └── package.json
├── template.yaml             # AWS SAM template
├── .kiro/specs/              # Technical specifications
└── README.md                 # This file
```

## Quick Start

### Prerequisites
- Java 21 & Maven 3.9+
- Node.js 18+
- AWS CLI configured with access to Amazon Bedrock and DynamoDB
- AWS SAM CLI for deployment

### Local Development

**Backend:**
```bash
cd backend
mvn clean install
mvn spring-boot:run
```
API runs at `http://localhost:8080`

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Dashboard opens at `http://localhost:5173`

### Using the Application

1. **Login:** Use credentials `admin` / `admin123`
2. **Initialize Demo Data:** Click "Initialize Demo Data" to create DynamoDB tables and seed sample inventory
3. **Run AI Analysis:** Click "Refresh AI" to generate recommendations using Amazon Bedrock
4. **Explore Features:**
   - View demand forecasts by clicking SKU cards
   - Check financial impact analysis
   - Monitor real-time alerts
   - Use AI chat for natural language queries
   - Compare multi-store performance

## Deployment

### Backend (AWS Lambda + API Gateway)
```bash
# Build and package
mvn -f backend/pom.xml clean package -Dmaven.test.skip=true

# Deploy using SAM
sam deploy --stack-name retailmind-api --capabilities CAPABILITY_IAM --region us-east-1 --resolve-s3
```

### Frontend (S3 Static Website)
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://your-bucket-name/ --delete
aws s3 website s3://your-bucket-name/ --index-document index.html --error-document index.html
```

See `AWS_DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

## Technology Stack

**Backend:**
- Java 21
- Spring Boot 3.2
- Spring Security (JWT)
- AWS SDK v2 (DynamoDB, Bedrock)
- Spring Cloud Function (AWS Lambda adapter)
- QuickTheories (Property-based testing)
- Lombok, Jackson

**Frontend:**
- React 18
- TypeScript
- Material-UI (MUI)
- Recharts (Data visualization)
- Vite (Build tool)

**AWS Services:**
- Lambda (Serverless compute)
- API Gateway (REST API)
- DynamoDB (NoSQL database)
- Bedrock (Generative AI)
- S3 (Static website hosting)
- CloudFormation (Infrastructure)

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User authentication

### Data Management
- `POST /api/v1/data/init-tables` - Initialize DynamoDB tables
- `POST /api/v1/data/seed/{storeId}` - Seed demo data

### Analytics
- `GET /api/v1/insights/{storeId}` - Get AI-powered inventory insights
- `GET /api/v1/analytics/multi-store` - Multi-store performance comparison
- `GET /api/v1/financial/impact/{storeId}` - Financial impact analysis
- `GET /api/v1/alerts/{storeId}` - Real-time inventory alerts

### Forecasting
- `GET /api/v1/forecast/visualization/{skuId}` - Demand forecast with confidence intervals
- `GET /api/v1/forecast/{storeId}/{skuId}` - 7-day demand forecast

### AI Chat
- `POST /api/v1/chat` - Conversational AI assistant

### Recommendations
- `GET /api/v1/recommendations/{storeId}` - Smart reorder recommendations

## Testing

Run property-based tests:
```bash
cd backend
mvn test
```

Tests include:
- Demand prediction correctness properties
- Risk detection validation
- Recommendation engine logic
- Authentication & authorization

## Documentation

- `README.md` - This file (project overview)
- `AWS_DEPLOYMENT_GUIDE.md` - Detailed AWS deployment instructions
- `DEMO_SCRIPT.md` - Hackathon demo walkthrough
- `HACKATHON_README.md` - Hackathon submission details
- `QUICK_START_GUIDE.md` - Quick setup guide
- `.kiro/specs/` - Complete technical specifications

## Contributing

This is a hackathon project. For production use, consider:
- Adding comprehensive error handling
- Implementing rate limiting
- Adding monitoring and observability (CloudWatch)
- Setting up CI/CD pipelines
- Implementing data backup strategies
- Adding more comprehensive test coverage

## License
MIT License
