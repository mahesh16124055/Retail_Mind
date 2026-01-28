"""
Domain models based on design.md specifications.
These Pydantic models define the core business entities and API contracts.

Maps to design.md data models:
- Store, SKU, InventoryItem, DemandForecast, Risk, Recommendation
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple, Union, Any
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from decimal import Decimal


# Enums for type safety
class StoreType(str, Enum):
    KIRANA = "KIRANA"
    DARK_STORE = "DARK_STORE" 
    WAREHOUSE = "WAREHOUSE"


class RiskType(str, Enum):
    STOCKOUT = "STOCKOUT"
    EXPIRY = "EXPIRY"
    OVERSTOCK = "OVERSTOCK"
    SLOW_MOVING = "SLOW_MOVING"


class RiskSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RecommendationType(str, Enum):
    REORDER = "REORDER"
    DISCOUNT = "DISCOUNT"
    REDISTRIBUTE = "REDISTRIBUTE"
    PROMOTE = "PROMOTE"


class MovementType(str, Enum):
    SALE = "SALE"
    PURCHASE = "PURCHASE"
    TRANSFER = "TRANSFER"
    ADJUSTMENT = "ADJUSTMENT"


# Core Domain Models (from design.md)

class GeoLocation(BaseModel):
    """Geographic location information"""
    latitude: float
    longitude: float
    address: str
    city: str
    state: str
    pincode: str


class TimeRange(BaseModel):
    """Operating hours or time range"""
    start_time: str = Field(..., description="Start time in HH:MM format")
    end_time: str = Field(..., description="End time in HH:MM format")


class StorageRequirements(BaseModel):
    """Storage requirements for products"""
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    humidity_max: Optional[float] = None
    requires_refrigeration: bool = False
    requires_freezing: bool = False


class BatchInfo(BaseModel):
    """Batch information for inventory tracking"""
    batch_id: str
    expiry_date: date
    quantity: int
    cost_per_unit: Decimal


class Store(BaseModel):
    """Store entity - Requirement 5: Data Integration"""
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }
    )
    
    store_id: str
    name: str
    location: GeoLocation
    store_type: StoreType
    capacity_constraints: Dict[str, float] = Field(default_factory=dict)
    operating_hours: TimeRange
    created_at: datetime = Field(default_factory=lambda: datetime.now())


class SKU(BaseModel):
    """SKU (Stock Keeping Unit) entity - Core product information"""
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }
    )
    
    sku_id: str
    name: str
    category: str
    subcategory: str
    brand: str
    unit_cost: Decimal
    selling_price: Decimal
    shelf_life_days: int
    storage_requirements: StorageRequirements
    created_at: datetime = Field(default_factory=lambda: datetime.now())


class InventoryItem(BaseModel):
    """Current inventory status - Requirement 2: Stock Level Alerts"""
    sku_id: str
    store_id: str
    current_stock: int
    reserved_stock: int = 0
    available_stock: int
    reorder_point: int
    safety_stock: int
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    batch_info: List[BatchInfo] = Field(default_factory=list)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }


class DemandForecast(BaseModel):
    """AI demand prediction - Requirement 1: Basic Demand Prediction"""
    sku_id: str
    store_id: str
    forecast_date: date
    predicted_demand: float
    confidence_interval: Tuple[float, float]
    confidence_level: float = Field(..., ge=0.0, le=1.0)
    model_used: str
    external_factors: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }


class Risk(BaseModel):
    """Inventory risk detection - Requirement 2: Stock Level Alerts"""
    risk_id: str
    risk_type: RiskType
    sku_id: str
    store_id: str
    severity: RiskSeverity
    risk_score: float = Field(..., ge=0.0, le=1.0)
    estimated_impact: float
    time_to_impact: timedelta
    description: str
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            timedelta: lambda v: v.total_seconds()
        }


class Recommendation(BaseModel):
    """Action recommendations - Requirement 3: Simple Recommendations"""
    recommendation_id: str
    recommendation_type: RecommendationType
    sku_id: str
    store_id: str
    action: str
    parameters: Dict[str, Any]
    expected_outcome: str
    confidence_level: float = Field(..., ge=0.0, le=1.0)
    estimated_roi: Optional[float] = None
    explanation: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# Time Series Data Models

class SalesTransaction(BaseModel):
    """Sales transaction data - Requirement 5: Data Integration"""
    transaction_id: str
    store_id: str
    sku_id: str
    quantity: int
    unit_price: Decimal
    total_amount: Decimal
    timestamp: datetime
    customer_id: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }


class InventoryMovement(BaseModel):
    """Inventory movement tracking"""
    movement_id: str
    store_id: str
    sku_id: str
    movement_type: MovementType
    quantity: int
    timestamp: datetime
    reference_id: str
    notes: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ExternalFactor(BaseModel):
    """External factors affecting demand - Requirement 7: AI/ML Core Capabilities"""
    factor_type: str  # WEATHER, EVENT, HOLIDAY, MARKET_PRICE
    location: GeoLocation
    timestamp: datetime
    value: Union[float, str, Dict[str, Any]]
    impact_categories: List[str]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# API Response Models

class DashboardSummary(BaseModel):
    """Dashboard summary - Requirement 4: Basic Dashboard"""
    store_id: str
    total_skus: int
    critical_alerts: int
    low_stock_items: int
    expiry_warnings: int
    recommendations_pending: int
    last_updated: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ProductAlert(BaseModel):
    """Product needing attention - Requirement 4: Basic Dashboard"""
    sku_id: str
    sku_name: str
    current_stock: int
    predicted_demand_7d: float
    days_until_stockout: Optional[int]
    days_until_expiry: Optional[int]
    risk_severity: RiskSeverity
    primary_recommendation: str
    
    
class SKUDetail(BaseModel):
    """Detailed SKU information for drill-down - Requirement 4: Basic Dashboard"""
    sku: SKU
    inventory: InventoryItem
    forecast: Optional[DemandForecast]
    risks: List[Risk]
    recommendations: List[Recommendation]
    sales_history_30d: List[SalesTransaction]