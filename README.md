# RetailMind - AI-Powered Inventory and Demand Intelligence Platform

## Overview

RetailMind is an AI-powered decision-support system designed for Indian kirana stores and quick-commerce operators. It predicts demand, detects inventory risks, and provides actionable recommendations to optimize inventory management.

## Problem Statement

Indian retail operations face unique challenges:
- Highly variable demand due to festivals, weather, and local events
- Limited inventory management expertise in traditional kirana stores
- Need for real-time decision support to prevent stockouts and reduce waste
- Complex supply chain dynamics in quick-commerce operations

## MVP Features (Hackathon Version)

This MVP focuses on core AI-powered inventory intelligence:
- **7-day demand prediction** using statistical algorithms with seasonal adjustments
- **Risk detection** for low stock and near-expiry items with severity scoring
- **Smart recommendations** for reordering and discounting with ROI calculations
- **Interactive dashboard** showing products needing immediate attention
- **Sample data generation** for instant demo and testing

## Architecture

```
Frontend (React + TypeScript + Material-UI)
    ↓
API Gateway (FastAPI)
    ↓
AI Services:
├── Demand Prediction Service (Statistical + Trend Analysis)
├── Risk Detection Service (Anomaly Detection)
└── Recommendation Engine (Decision Intelligence)
    ↓
Data Layer (SQLite + PostgreSQL Ready)
```

## AI & Intelligence Features

### 1. Demand Prediction
- **Weighted moving averages** with trend analysis
- **Seasonal pattern detection** for festivals and weather
- **Confidence interval calculations** using statistical methods
- **External factor incorporation** (festivals, weather patterns)
- **Multi-SKU batch processing** for store-wide analysis

### 2. Risk Detection
- **Stockout prediction** based on current stock vs predicted demand
- **Expiry risk detection** for items within 3 days of expiration
- **Overstock identification** using inventory turnover analysis
- **Slow-moving inventory detection** with sales velocity tracking
- **Risk severity scoring** (CRITICAL/HIGH/MEDIUM/LOW)

### 3. Recommendation Engine
- **ROI-based recommendation ranking** for optimal decision making
- **Contextual action suggestions** (reorder quantities, discount percentages)
- **Multi-criteria decision making** considering stock levels, demand, and profitability
- **Clear explanations** for each recommendation with business reasoning

## AWS Integration (Future Ready)

The system is architected for seamless AWS deployment:
- **API Gateway**: Route requests to backend services
- **RDS PostgreSQL**: Scalable operational database
- **Amazon Bedrock**: AI/ML model serving (easy integration path)
- **Lambda/ECS**: Serverless/containerized service deployment
- **S3**: Data storage and model artifacts

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- Git

### Option 1: Quick Demo (Recommended)

1. **Start Backend Server**
```bash
# Install Python dependencies (auto-installs missing packages)
python start_backend.py
```

2. **Start Frontend** (in a new terminal)
```bash
# Install npm dependencies and start React server
python start_frontend.py
```

3. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

4. **Generate Sample Data & Test AI**
- Go to http://localhost:3000/upload
- Click "Generate Sample Data" button
- Go to Dashboard and click "Run Analysis"
- Explore AI-powered inventory insights!

### Option 2: Manual Setup

1. **Backend Setup**
```bash
cd backend
pip install fastapi uvicorn pydantic sqlalchemy pandas numpy structlog python-dateutil python-dotenv python-multipart pydantic-settings
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. **Frontend Setup** (in new terminal)
```bash
cd frontend
npm install
npm start
```

### Option 3: Production Setup (PostgreSQL)

1. **Setup PostgreSQL Database**
```bash
# Create database
createdb retailmind

# Set environment variable
export DATABASE_URL="postgresql://username:password@localhost:5432/retailmind"
```

2. **Follow Option 1 or 2 above**

## Project Structure

```
retailmind/
├── .kiro/specs/                 # Requirements and design documentation
├── backend/                     # FastAPI backend with AI services
│   ├── app/
│   │   ├── main.py             # FastAPI app and routing
│   │   ├── api/                # API routers/controllers
│   │   ├── services/           # AI business logic services
│   │   ├── models/             # Pydantic models and domain entities
│   │   └── core/               # Config, database, utilities
│   └── tests/                  # Unit and property-based tests
├── frontend/                   # React TypeScript SPA
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API client services
│   │   └── types/              # TypeScript type definitions
└── docs/                       # Additional documentation
```

## Key Features & AI Capabilities

### 1. Intelligent Demand Prediction
- **Algorithm**: Weighted moving averages with seasonal adjustments
- **Inputs**: Sales history, external factors (festivals, weather)
- **Output**: 7-day demand forecast with confidence intervals
- **Accuracy**: Statistical confidence levels based on data quality

### 2. Smart Risk Detection
- **Stockout Risk**: Predicts inventory depletion 24-48 hours in advance
- **Expiry Risk**: Identifies items within 3 days of expiration
- **Overstock Detection**: Flags items with >8 weeks of inventory
- **Risk Scoring**: 0.0-1.0 severity scores for prioritization

### 3. Decision Intelligence
- **Reorder Recommendations**: Optimal quantities with safety stock calculations
- **Pricing Strategies**: Dynamic discount suggestions for near-expiry items
- **ROI Optimization**: Recommendations ranked by expected return on investment
- **Business Explanations**: Clear reasoning for each suggested action

### 4. Interactive Dashboard
- **Real-time Insights**: Products needing immediate attention
- **Drill-down Analytics**: Detailed SKU-level information
- **Alert Management**: Prioritized risk notifications
- **Performance Metrics**: Summary statistics and trends

## Data Models

Core entities based on Indian retail requirements:
- **Store**: Store information and operational constraints
- **SKU**: Product details with Indian market categories
- **InventoryItem**: Current stock levels with batch tracking
- **DemandForecast**: AI predictions with confidence metrics
- **Risk**: Detected inventory risks with severity levels
- **Recommendation**: Actionable suggestions with ROI calculations

## API Endpoints

### Dashboard APIs
- `GET /api/v1/dashboard/summary/{store_id}` - Store overview
- `GET /api/v1/dashboard/alerts/{store_id}` - Priority alerts
- `GET /api/v1/dashboard/sku/{store_id}/{sku_id}` - SKU details
- `POST /api/v1/dashboard/analyze/{store_id}` - Trigger AI analysis

### Data Management APIs
- `POST /api/v1/data/sample-data/{store_id}` - Generate sample data
- `POST /api/v1/data/upload/sales/{store_id}` - Upload sales data
- `POST /api/v1/data/upload/inventory/{store_id}` - Upload inventory data
- `POST /api/v1/data/upload/sku-master` - Upload product master

### AI Services APIs
- `GET /api/v1/predictions/{store_id}` - Demand forecasts
- `GET /api/v1/recommendations/{store_id}` - AI recommendations

## Testing Strategy

- **Unit Tests**: Core business logic validation
- **Property-Based Tests**: Comprehensive correctness verification
- **Integration Tests**: End-to-end workflow testing
- **API Tests**: REST endpoint validation

Key properties tested:
- Prediction accuracy for SKUs with sufficient data
- Stockout alert timing (24-48 hours before expected stockout)
- Expiry risk detection (within 3 days)
- Recommendation completeness and ranking

## Development Guidelines

1. **Requirements Alignment**: All features map to requirements.md
2. **Design Compliance**: Data models follow design.md specifications
3. **AWS Readiness**: Code structured for easy cloud deployment
4. **AI-First Approach**: Statistical intelligence with ML upgrade path
5. **Test Coverage**: Property-based tests for correctness validation

## Deployment

### Local Development
- SQLite database (auto-created)
- No external dependencies
- No API keys required

### Production (AWS Ready)
- PostgreSQL database
- Redis caching
- AWS Bedrock integration
- Containerized deployment

## Contributing

1. Reference requirement numbers in code comments
2. Follow the established project structure
3. Add tests for new features
4. Update documentation for API changes
5. Maintain AWS deployment readiness

## License

MIT License - Built for AWS AI for Bharat Hackathon

---

## Demo Flow

1. **Setup**: `python start_backend.py` & `python start_frontend.py`
2. **Data**: Generate sample data via UI
3. **Analysis**: Run AI analysis from dashboard
4. **Insights**: Explore predictions, risks, and recommendations
5. **Actions**: Review suggested inventory actions with ROI calculations

**Perfect for hackathon demos - works offline with zero API keys!**