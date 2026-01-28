"""
SQLAlchemy ORM models for database persistence.
Maps domain models to PostgreSQL tables with proper relationships.

Designed for easy AWS RDS migration with optimized indexes and constraints.
"""

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Date, Boolean, 
    Text, JSON, ForeignKey, Index, CheckConstraint, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from app.core.database import Base


class StoreDB(Base):
    """Store table - maps to Store domain model"""
    __tablename__ = "stores"
    
    store_id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    store_type = Column(String(20), nullable=False)  # KIRANA, DARK_STORE, WAREHOUSE
    location_data = Column(JSON)  # GeoLocation as JSON
    capacity_constraints = Column(JSON)
    operating_hours = Column(JSON)  # TimeRange as JSON
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    inventory_items = relationship("InventoryItemDB", back_populates="store")
    sales_transactions = relationship("SalesTransactionDB", back_populates="store")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_store_type', 'store_type'),
        Index('idx_store_created', 'created_at'),
    )


class SKUDB(Base):
    """SKU table - maps to SKU domain model"""
    __tablename__ = "skus"
    
    sku_id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100))
    brand = Column(String(100))
    unit_cost = Column(Numeric(10, 2), nullable=False)
    selling_price = Column(Numeric(10, 2), nullable=False)
    shelf_life_days = Column(Integer, nullable=False)
    storage_requirements = Column(JSON)  # StorageRequirements as JSON
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    inventory_items = relationship("InventoryItemDB", back_populates="sku")
    sales_transactions = relationship("SalesTransactionDB", back_populates="sku")
    demand_forecasts = relationship("DemandForecastDB", back_populates="sku")
    risks = relationship("RiskDB", back_populates="sku")
    recommendations = relationship("RecommendationDB", back_populates="sku")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_sku_category', 'category'),
        Index('idx_sku_brand', 'brand'),
        Index('idx_sku_name', 'name'),
    )


class InventoryItemDB(Base):
    """Inventory table - maps to InventoryItem domain model"""
    __tablename__ = "inventory_items"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sku_id = Column(String(50), ForeignKey('skus.sku_id'), nullable=False)
    store_id = Column(String(50), ForeignKey('stores.store_id'), nullable=False)
    current_stock = Column(Integer, nullable=False, default=0)
    reserved_stock = Column(Integer, nullable=False, default=0)
    available_stock = Column(Integer, nullable=False, default=0)
    reorder_point = Column(Integer, nullable=False, default=0)
    safety_stock = Column(Integer, nullable=False, default=0)
    batch_info = Column(JSON)  # List[BatchInfo] as JSON
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    store = relationship("StoreDB", back_populates="inventory_items")
    sku = relationship("SKUDB", back_populates="inventory_items")
    
    # Constraints
    __table_args__ = (
        # Unique constraint for sku-store combination
        Index('idx_inventory_sku_store', 'sku_id', 'store_id', unique=True),
        Index('idx_inventory_stock_levels', 'current_stock', 'reorder_point'),
        Index('idx_inventory_updated', 'last_updated'),
        CheckConstraint('current_stock >= 0', name='check_current_stock_positive'),
        CheckConstraint('available_stock >= 0', name='check_available_stock_positive'),
    )


class SalesTransactionDB(Base):
    """Sales transactions table - time series data"""
    __tablename__ = "sales_transactions"
    
    transaction_id = Column(String(50), primary_key=True)
    store_id = Column(String(50), ForeignKey('stores.store_id'), nullable=False)
    sku_id = Column(String(50), ForeignKey('skus.sku_id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    customer_id = Column(String(50))
    
    # Relationships
    store = relationship("StoreDB", back_populates="sales_transactions")
    sku = relationship("SKUDB", back_populates="sales_transactions")
    
    # Indexes optimized for time-series queries
    __table_args__ = (
        Index('idx_sales_timestamp', 'timestamp'),
        Index('idx_sales_sku_time', 'sku_id', 'timestamp'),
        Index('idx_sales_store_time', 'store_id', 'timestamp'),
        Index('idx_sales_sku_store_time', 'sku_id', 'store_id', 'timestamp'),
    )


class DemandForecastDB(Base):
    """Demand forecasts table - AI predictions"""
    __tablename__ = "demand_forecasts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sku_id = Column(String(50), ForeignKey('skus.sku_id'), nullable=False)
    store_id = Column(String(50), ForeignKey('stores.store_id'), nullable=False)
    forecast_date = Column(Date, nullable=False)
    predicted_demand = Column(Float, nullable=False)
    confidence_interval_lower = Column(Float, nullable=False)
    confidence_interval_upper = Column(Float, nullable=False)
    confidence_level = Column(Float, nullable=False)
    model_used = Column(String(100), nullable=False)
    external_factors = Column(JSON)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    sku = relationship("SKUDB", back_populates="demand_forecasts")
    
    # Indexes for forecast queries
    __table_args__ = (
        Index('idx_forecast_sku_date', 'sku_id', 'forecast_date'),
        Index('idx_forecast_store_date', 'store_id', 'forecast_date'),
        Index('idx_forecast_created', 'created_at'),
        # Unique constraint to prevent duplicate forecasts
        Index('idx_forecast_unique', 'sku_id', 'store_id', 'forecast_date', unique=True),
    )


class RiskDB(Base):
    """Risk detection table"""
    __tablename__ = "risks"
    
    risk_id = Column(String(50), primary_key=True)
    risk_type = Column(String(20), nullable=False)  # STOCKOUT, EXPIRY, etc.
    sku_id = Column(String(50), ForeignKey('skus.sku_id'), nullable=False)
    store_id = Column(String(50), ForeignKey('stores.store_id'), nullable=False)
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Float, nullable=False)
    estimated_impact = Column(Float)
    time_to_impact_seconds = Column(Integer)  # timedelta as seconds
    description = Column(Text)
    detected_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime)
    
    # Relationships
    sku = relationship("SKUDB", back_populates="risks")
    
    # Indexes for risk queries
    __table_args__ = (
        Index('idx_risk_type_severity', 'risk_type', 'severity'),
        Index('idx_risk_sku_store', 'sku_id', 'store_id'),
        Index('idx_risk_detected', 'detected_at'),
        Index('idx_risk_unresolved', 'resolved_at'),  # NULL values for unresolved
    )


class RecommendationDB(Base):
    """Recommendations table"""
    __tablename__ = "recommendations"
    
    recommendation_id = Column(String(50), primary_key=True)
    recommendation_type = Column(String(20), nullable=False)  # REORDER, DISCOUNT, etc.
    sku_id = Column(String(50), ForeignKey('skus.sku_id'), nullable=False)
    store_id = Column(String(50), ForeignKey('stores.store_id'), nullable=False)
    action = Column(String(200), nullable=False)
    parameters = Column(JSON)
    expected_outcome = Column(Text)
    confidence_level = Column(Float, nullable=False)
    estimated_roi = Column(Float)
    explanation = Column(Text)
    created_at = Column(DateTime, default=func.now())
    accepted_at = Column(DateTime)
    rejected_at = Column(DateTime)
    feedback = Column(Text)
    
    # Relationships
    sku = relationship("SKUDB", back_populates="recommendations")
    
    # Indexes for recommendation queries
    __table_args__ = (
        Index('idx_recommendation_type', 'recommendation_type'),
        Index('idx_recommendation_sku_store', 'sku_id', 'store_id'),
        Index('idx_recommendation_created', 'created_at'),
        Index('idx_recommendation_pending', 'accepted_at', 'rejected_at'),
    )


class InventoryMovementDB(Base):
    """Inventory movements table - audit trail"""
    __tablename__ = "inventory_movements"
    
    movement_id = Column(String(50), primary_key=True)
    store_id = Column(String(50), ForeignKey('stores.store_id'), nullable=False)
    sku_id = Column(String(50), ForeignKey('skus.sku_id'), nullable=False)
    movement_type = Column(String(20), nullable=False)  # SALE, PURCHASE, etc.
    quantity = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    reference_id = Column(String(50))
    notes = Column(Text)
    
    # Indexes for movement tracking
    __table_args__ = (
        Index('idx_movement_timestamp', 'timestamp'),
        Index('idx_movement_sku_time', 'sku_id', 'timestamp'),
        Index('idx_movement_type', 'movement_type'),
    )


class ExternalFactorDB(Base):
    """External factors table - weather, events, etc."""
    __tablename__ = "external_factors"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    factor_type = Column(String(50), nullable=False)
    location_data = Column(JSON)  # GeoLocation as JSON
    timestamp = Column(DateTime, nullable=False)
    value_data = Column(JSON)  # Union type as JSON
    impact_categories = Column(JSON)  # List[str] as JSON
    
    # Indexes for external factor queries
    __table_args__ = (
        Index('idx_external_factor_type_time', 'factor_type', 'timestamp'),
        Index('idx_external_factor_timestamp', 'timestamp'),
    )