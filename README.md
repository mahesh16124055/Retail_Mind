# 🛒 RetailMind - AI-Powered Inventory Intelligence for Kirana Stores

RetailMind is an AI-powered inventory management system designed specifically for India's 8 million kirana (small retail) stores. Built entirely on AWS, it provides real-time inventory intelligence, demand forecasting, and smart recommendations to help small retailers reduce dead stock and optimize working capital.

## 🎯 Problem Statement

- **8 million kirana stores** in India struggle with inventory management
- **20-30% dead stock** on average, tying up working capital
- **Manual processes** lead to stockouts and overstocking
- **No access** to enterprise-grade inventory tools

## 💡 Solution

RetailMind combines AWS AI with local insights to provide:
- **AI-Powered Recommendations**: AWS Bedrock Nova analyzes demand patterns and suggests optimal reorder quantities
- **Real-Time Intelligence**: Live inventory tracking with critical action alerts
- **WhatsApp Integration**: One-click reordering via WhatsApp (India's primary communication tool)
- **Bilingual Support**: Complete Hindi/English interface for kirana owners
- **Multi-Store Management**: Centralized dashboard for managing multiple locations

## 🚀 Key Features

### Simple Dashboard
- **Stock Value**: Real-time inventory valuation
- **Action Required**: Critical items needing attention
- **Low Stock Indicators**: Visual cues for items below threshold
- **AI Recommendations**: Context-aware reorder suggestions

### Advanced Analytics
- **Risk Distribution**: Critical vs High risk breakdown
- **Financial Impact**: Revenue at risk, potential loss, ROI analysis
- **Demand Forecasting**: Multi-scenario analysis (weekday, festival, slump)
- **SKU-Level Insights**: Detailed product analysis with margin tracking

### AI Chat Assistant
- **Natural Language**: Ask questions in Hindi or English
- **Contextual Answers**: Specific product recommendations
- **AWS Bedrock Powered**: Latest AI technology for accurate insights

### Multi-Store Analytics
- **Comparative Performance**: Risk distribution across locations
- **Store Grading**: Performance scoring system
- **Top Risks**: Identify critical issues per store

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 + TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: React Hooks
- **Charts**: Recharts
- **Deployment**: AWS S3 + CloudFront

### Backend
- **Framework**: Java 21 + Spring Boot 3.2
- **API**: RESTful with OpenAPI/Swagger
- **Authentication**: JWT with Spring Security
- **Deployment**: AWS Lambda (Serverless)

### AWS Services
- **Compute**: AWS Lambda
- **Database**: Amazon DynamoDB
- **AI/ML**: Amazon Bedrock (Nova model)
- **Security**: AWS KMS for encryption
- **Storage**: Amazon S3
- **API**: Amazon API Gateway
- **Build**: AWS SAM (Serverless Application Model)

## 📦 Project Structure

```
retailmind/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom React hooks
│   │   └── styles/          # CSS styles
│   └── package.json
├── backend/                  # Java Spring Boot application
│   ├── src/
│   │   ├── main/java/com/retailmind/api/
│   │   │   ├── application/ # Services and DTOs
│   │   │   ├── domain/      # Domain models
│   │   │   ├── infrastructure/ # Lambda handlers
│   │   │   ├── interfaces/  # REST controllers
│   │   │   └── security/    # Security configuration
│   │   └── test/            # Unit and property-based tests
│   └── pom.xml
├── sample-data/             # Sample CSV data for testing
├── template.yaml            # AWS SAM template
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Java 21
- Maven 3.8+
- AWS CLI configured
- AWS SAM CLI

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

```bash
cd backend
mvn clean install
sam build
sam local start-api
```

The backend API will be available at `http://localhost:3000`

### Environment Variables

Create `frontend/.env`:
```
VITE_API_BASE_URL=https://your-api-gateway-url/Prod/api/v1
```

## 📊 Sample Data

Sample CSV files are provided in the `sample-data/` directory:
- `kirana_inventory_sample.csv` - Small dataset for testing
- `kirana_inventory_large.csv` - Larger dataset for demo

Import via the Data Import feature in the application.

## 🔐 Authentication

The application uses JWT-based authentication with Spring Security.

Default demo credentials:
- **Username**: admin
- **Password**: admin123

**Note**: Change default credentials before production deployment.

## 🌐 Deployment

See [AWS_DEPLOYMENT_GUIDE.md](AWS_DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Quick Deploy

```bash
# Build frontend
cd frontend
npm run build

# Deploy frontend to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Build and deploy backend
cd ../backend
sam build
sam deploy --guided
```

## 🎯 Business Impact

### Market Opportunity
- **TAM**: 8 million kirana stores in India
- **SAM**: 2 million stores in tier-1/2 cities
- **SOM**: 20,000 stores in Year 1

### Value Proposition
- **₹50,000/month** average savings per store
- **28% reduction** in dead stock
- **40% reduction** in food waste
- **15% increase** in profit margins

### Revenue Model
1. **SaaS Subscription**: ₹499/month per store
2. **Transaction Fees**: 1% on WhatsApp orders
3. **Premium Analytics**: ₹999/month

## 🏆 Competitive Advantages

| Feature | RetailMind | Zoho Inventory | WareIQ | Excel |
|---------|------------|----------------|---------|-------|
| AI Recommendations | ✅ | ❌ | ❌ | ❌ |
| Hindi Support | ✅ | ❌ | ❌ | ❌ |
| WhatsApp Integration | ✅ | ❌ | ❌ | ❌ |
| Kirana-Specific | ✅ | ❌ | ❌ | ❌ |
| Price | ₹499/mo | ₹2,500/mo | ₹5,000/mo | Free |

## 🧪 Testing

### Backend Tests
```bash
cd backend
mvn test
```

Includes:
- Unit tests for services
- Property-based tests for demand prediction
- Property-based tests for risk detection

### Frontend Tests
```bash
cd frontend
npm test
```

## 📚 API Documentation

API documentation is available via Swagger UI when running the backend:
- Local: `http://localhost:3000/swagger-ui.html`
- Production: `https://your-api-gateway-url/Prod/swagger-ui.html`

## 🤝 Contributing

This is a hackathon project. For production use, please contact the team.

## 📄 License

Copyright © 2026 RetailMind. All rights reserved.

## 📞 Contact

For inquiries or support, please open an issue in this repository.

## 🙏 Acknowledgments

- Built with **AWS Bedrock Nova** for AI-powered recommendations
- Designed for India's **kirana store ecosystem**
- Powered by modern cloud-native architecture

---

**Built for Indian Small Retailers**
