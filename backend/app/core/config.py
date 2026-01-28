"""
Configuration management for RetailMind platform.

Handles environment-specific settings with validation and type safety.
Supports development, testing, and production environments.
"""

import os
from typing import Optional, List, Any, Dict
from pydantic_settings import BaseSettings
from pydantic import validator, Field
from pydantic_settings import BaseSettings as PydanticBaseSettings


class Settings(PydanticBaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    APP_NAME: str = "RetailMind"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    
    # Database Configuration
    DATABASE_URL: Optional[str] = Field(default=None, env="DATABASE_URL")
    POSTGRES_SERVER: str = Field(default="localhost", env="POSTGRES_SERVER")
    POSTGRES_USER: str = Field(default="retailmind", env="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field(default="retailmind123", env="POSTGRES_PASSWORD")
    POSTGRES_DB: str = Field(default="retailmind", env="POSTGRES_DB")
    POSTGRES_PORT: int = Field(default=5432, env="POSTGRES_PORT")
    
    # Redis Configuration
    REDIS_URL: Optional[str] = Field(default=None, env="REDIS_URL")
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    # Security
    SECRET_KEY: str = Field(default="your-secret-key-change-in-production", env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    ALGORITHM: str = "HS256"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        env="BACKEND_CORS_ORIGINS"
    )
    
    # Business Logic Configuration
    STOCKOUT_RISK_DAYS: int = Field(default=3, env="STOCKOUT_RISK_DAYS")
    EXPIRY_WARNING_DAYS: int = Field(default=3, env="EXPIRY_WARNING_DAYS")
    PREDICTION_HORIZON_DAYS: int = Field(default=7, env="PREDICTION_HORIZON_DAYS")
    MIN_PREDICTION_ACCURACY: float = Field(default=0.85, env="MIN_PREDICTION_ACCURACY")
    
    # ML Model Configuration
    MODEL_RETRAIN_INTERVAL_HOURS: int = Field(default=24, env="MODEL_RETRAIN_INTERVAL_HOURS")
    MODEL_PERFORMANCE_THRESHOLD: float = Field(default=0.80, env="MODEL_PERFORMANCE_THRESHOLD")
    FEATURE_STORE_TTL_HOURS: int = Field(default=168, env="FEATURE_STORE_TTL_HOURS")  # 1 week
    
    # Data Processing
    BATCH_SIZE: int = Field(default=1000, env="BATCH_SIZE")
    MAX_CONCURRENT_PREDICTIONS: int = Field(default=10, env="MAX_CONCURRENT_PREDICTIONS")
    DATA_RETENTION_DAYS: int = Field(default=365, env="DATA_RETENTION_DAYS")
    
    # External APIs
    WEATHER_API_KEY: Optional[str] = Field(default=None, env="WEATHER_API_KEY")
    WEATHER_API_URL: str = Field(default="https://api.openweathermap.org/data/2.5", env="WEATHER_API_URL")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(default="json", env="LOG_FORMAT")
    
    # Monitoring and Alerting
    ENABLE_METRICS: bool = Field(default=True, env="ENABLE_METRICS")
    ALERT_EMAIL_ENABLED: bool = Field(default=False, env="ALERT_EMAIL_ENABLED")
    ALERT_EMAIL_RECIPIENTS: List[str] = Field(default=[], env="ALERT_EMAIL_RECIPIENTS")
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        """Parse CORS origins from string or list."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    @property
    def database_url(self) -> str:
        """Construct database URL from components."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        
        # Use SQLite for development/testing, PostgreSQL for production
        if self.is_development or self.is_testing:
            return "sqlite:///./retailmind.db"
        
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )
    
    @property
    def redis_url(self) -> str:
        """Construct Redis URL from components."""
        if self.REDIS_URL:
            return self.REDIS_URL
        
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT.lower() in ("development", "dev", "local")
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT.lower() in ("production", "prod")
    
    @property
    def is_testing(self) -> bool:
        """Check if running in testing mode."""
        return self.ENVIRONMENT.lower() in ("testing", "test")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings instance."""
    return settings