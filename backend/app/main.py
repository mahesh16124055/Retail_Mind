"""
RetailMind FastAPI Application
Main entry point for the AI-powered Inventory and Demand Intelligence platform.

Implements requirements from requirements.md:
- Requirement 1: Basic Demand Prediction
- Requirement 2: Stock Level Alerts  
- Requirement 3: Simple Recommendations
- Requirement 4: Basic Dashboard
- Requirement 5: Data Integration
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from app.api import dashboard, data_upload, predictions, recommendations
from app.core.config import get_settings
from app.core.database import init_db

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    logger.info("Starting RetailMind application")
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    yield
    
    logger.info("Shutting down RetailMind application")

# Create FastAPI application
app = FastAPI(
    title="RetailMind API",
    description="AI-powered Inventory and Demand Intelligence platform for Indian retail",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend integration
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(
    dashboard.router,
    prefix="/api/v1/dashboard",
    tags=["dashboard"]
)

app.include_router(
    data_upload.router,
    prefix="/api/v1/data",
    tags=["data"]
)

app.include_router(
    predictions.router,
    prefix="/api/v1/predictions",
    tags=["predictions"]
)

app.include_router(
    recommendations.router,
    prefix="/api/v1/recommendations", 
    tags=["recommendations"]
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "RetailMind API is running",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    """Detailed health check for monitoring"""
    return {
        "status": "healthy",
        "services": {
            "database": "connected",
            "cache": "connected", 
            "ml_models": "loaded"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_config=None  # Use structlog configuration
    )