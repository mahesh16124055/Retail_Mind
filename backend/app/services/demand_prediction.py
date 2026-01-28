"""
Demand Prediction Service - Requirement 1: Basic Demand Prediction

Implements simple but effective demand forecasting algorithms:
- Moving average with seasonal adjustments
- Simple linear trend analysis
- External factor incorporation (festivals, weather)

Designed as abstraction layer for future AWS Bedrock integration.
"""

from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
import structlog
import uuid
import numpy as np
import pandas as pd
from dataclasses import dataclass

from app.models.domain_models import (
    DemandForecast, SalesTransaction, ExternalFactor
)
from app.models.database_models import (
    DemandForecastDB, SalesTransactionDB, ExternalFactorDB, InventoryItemDB
)
from app.core.database import SessionLocal
from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class PredictionContext:
    """Context information for demand prediction"""
    sku_id: str
    store_id: str
    historical_sales: List[SalesTransaction]
    external_factors: List[ExternalFactor]
    current_date: date
    forecast_horizon: int = 7


class DemandModelProvider:
    """
    Abstraction layer for demand prediction models.
    
    Current implementation uses simple statistical methods.
    Future: Replace with Amazon Bedrock model calls.
    
    Design pattern allows easy swapping of prediction algorithms:
    - Local Python models (current)
    - AWS Bedrock foundation models (future)
    - Custom trained models (future)
    """
    
    def predict_7d_demand(
        self, 
        sku_id: str, 
        store_id: str, 
        history: List[SalesTransaction]
    ) -> DemandForecast:
        """
        Generate 7-day demand prediction using statistical methods.
        
        Algorithm:
        1. Calculate base demand using moving average
        2. Apply trend adjustment if sufficient data
        3. Apply seasonal/festival adjustments
        4. Calculate confidence intervals
        """
        
        if not history:
            # No historical data - use category average or default
            return self._predict_new_sku(sku_id, store_id)
        
        # Convert to pandas for easier analysis
        df = self._prepare_sales_data(history)
        
        # Calculate base demand using weighted moving average
        base_demand = self._calculate_base_demand(df)
        
        # Apply trend adjustment
        trend_adjusted_demand = self._apply_trend_adjustment(df, base_demand)
        
        # Apply seasonal/external factor adjustments
        final_demand = self._apply_seasonal_adjustments(
            trend_adjusted_demand, sku_id, store_id
        )
        
        # Calculate confidence intervals
        confidence_interval = self._calculate_confidence_interval(df, final_demand)
        
        # Determine confidence level based on data quality
        confidence_level = self._calculate_confidence_level(df)
        
        return DemandForecast(
            sku_id=sku_id,
            store_id=store_id,
            forecast_date=date.today() + timedelta(days=7),
            predicted_demand=max(0, final_demand),  # Ensure non-negative
            confidence_interval=confidence_interval,
            confidence_level=confidence_level,
            model_used="statistical_moving_average_v1",
            external_factors=self._get_applied_factors(sku_id, store_id)
        )
    
    def _prepare_sales_data(self, history: List[SalesTransaction]) -> pd.DataFrame:
        """Convert sales history to pandas DataFrame for analysis"""
        data = []
        for txn in history:
            data.append({
                'date': txn.timestamp.date(),
                'quantity': txn.quantity,
                'timestamp': txn.timestamp
            })
        
        df = pd.DataFrame(data)
        if df.empty:
            return df
            
        # Group by date and sum quantities
        df = df.groupby('date')['quantity'].sum().reset_index()
        df = df.sort_values('date')
        
        return df
    
    def _calculate_base_demand(self, df: pd.DataFrame) -> float:
        """Calculate base demand using weighted moving average"""
        if df.empty:
            return 0.0
        
        # Use last 14 days if available, otherwise use all data
        recent_data = df.tail(14)
        
        if len(recent_data) < 3:
            # Insufficient data - use simple average
            return float(recent_data['quantity'].mean())
        
        # Weighted moving average - more weight to recent data
        weights = np.exp(np.linspace(-1, 0, len(recent_data)))
        weights = weights / weights.sum()
        
        weighted_avg = np.average(recent_data['quantity'], weights=weights)
        return float(weighted_avg)
    
    def _apply_trend_adjustment(self, df: pd.DataFrame, base_demand: float) -> float:
        """Apply trend adjustment if sufficient data points"""
        if len(df) < 7:
            return base_demand
        
        # Calculate simple linear trend over last 14 days
        recent_data = df.tail(14).copy()
        recent_data['day_index'] = range(len(recent_data))
        
        # Simple linear regression
        if len(recent_data) >= 5:
            correlation = np.corrcoef(
                recent_data['day_index'], 
                recent_data['quantity']
            )[0, 1]
            
            if not np.isnan(correlation):
                # Apply trend adjustment (conservative)
                trend_factor = 1 + (correlation * 0.1)  # Max 10% adjustment
                trend_factor = max(0.8, min(1.2, trend_factor))  # Clamp to reasonable range
                return base_demand * trend_factor
        
        return base_demand
    
    def _apply_seasonal_adjustments(
        self, 
        base_demand: float, 
        sku_id: str, 
        store_id: str
    ) -> float:
        """Apply seasonal and external factor adjustments"""
        
        # Check for upcoming festivals/events (simplified)
        festival_factor = self._get_festival_factor(sku_id)
        
        # Check for weather impact (simplified)
        weather_factor = self._get_weather_factor(sku_id)
        
        # Apply factors conservatively
        total_factor = festival_factor * weather_factor
        total_factor = max(0.5, min(2.0, total_factor))  # Clamp to reasonable range
        
        return base_demand * total_factor
    
    def _get_festival_factor(self, sku_id: str) -> float:
        """Get festival impact factor for SKU category"""
        # Simplified festival detection - in production, use external calendar API
        current_month = datetime.now().month
        
        # Festival seasons in India (simplified)
        festival_months = {10, 11, 12, 3, 4}  # Diwali, Holi seasons
        
        if current_month in festival_months:
            # Different categories have different festival impact
            # This would be learned from historical data in production
            return 1.3  # 30% increase during festival season
        
        return 1.0
    
    def _get_weather_factor(self, sku_id: str) -> float:
        """Get weather impact factor for SKU category"""
        # Simplified weather impact - in production, use weather API
        current_month = datetime.now().month
        
        # Summer months impact (simplified)
        if current_month in {4, 5, 6}:
            # Beverages and cooling products see higher demand
            return 1.2
        
        # Monsoon months impact
        if current_month in {7, 8, 9}:
            # Comfort foods, hot beverages see higher demand
            return 1.1
        
        return 1.0
    
    def _calculate_confidence_interval(
        self, 
        df: pd.DataFrame, 
        predicted_demand: float
    ) -> Tuple[float, float]:
        """Calculate confidence interval for prediction"""
        if df.empty or len(df) < 3:
            # Wide interval for insufficient data
            return (predicted_demand * 0.5, predicted_demand * 1.5)
        
        # Calculate standard deviation of recent demand
        recent_data = df.tail(14)
        std_dev = float(recent_data['quantity'].std())
        
        if np.isnan(std_dev) or std_dev == 0:
            std_dev = predicted_demand * 0.2  # 20% of predicted demand
        
        # 95% confidence interval (approximately 2 standard deviations)
        margin = 1.96 * std_dev
        
        lower_bound = max(0, predicted_demand - margin)
        upper_bound = predicted_demand + margin
        
        return (lower_bound, upper_bound)
    
    def _calculate_confidence_level(self, df: pd.DataFrame) -> float:
        """Calculate confidence level based on data quality"""
        if df.empty:
            return 0.3  # Low confidence for no data
        
        data_points = len(df)
        
        if data_points >= 30:
            return 0.9  # High confidence with lots of data
        elif data_points >= 14:
            return 0.8  # Good confidence with 2 weeks data
        elif data_points >= 7:
            return 0.7  # Moderate confidence with 1 week data
        else:
            return 0.5  # Low confidence with limited data
    
    def _predict_new_sku(self, sku_id: str, store_id: str) -> DemandForecast:
        """Predict demand for new SKU with no historical data"""
        # In production, this would use category averages or similar product patterns
        default_demand = 5.0  # Conservative default
        
        return DemandForecast(
            sku_id=sku_id,
            store_id=store_id,
            forecast_date=date.today() + timedelta(days=7),
            predicted_demand=default_demand,
            confidence_interval=(2.0, 10.0),
            confidence_level=0.4,  # Low confidence for new products
            model_used="category_average_fallback",
            external_factors={"reason": "new_product_no_history"}
        )
    
    def _get_applied_factors(self, sku_id: str, store_id: str) -> Dict[str, Any]:
        """Get external factors that were applied to prediction"""
        return {
            "festival_adjustment": self._get_festival_factor(sku_id) != 1.0,
            "weather_adjustment": self._get_weather_factor(sku_id) != 1.0,
            "trend_analysis": True,
            "seasonal_pattern": True
        }


class DemandPredictionService:
    """
    Demand Prediction Service implementing Requirement 1: Basic Demand Prediction
    
    Acceptance Criteria:
    1. WHEN I have sales history for a product, THE Platform SHALL predict demand for the next 7 days
    2. WHEN I view a product, THE Platform SHALL show the predicted quantity needed  
    3. WHEN predictions are made, THE Platform SHALL show how confident it is in the prediction
    """
    
    def __init__(self):
        self.db = SessionLocal()
        self.model_provider = DemandModelProvider()
    
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()
    
    async def predict_demand(
        self, 
        sku_id: str, 
        store_id: str, 
        horizon_days: int = 7
    ) -> DemandForecast:
        """
        Generate demand prediction for a specific SKU and store.
        
        Implements Requirement 1.1: Predict demand for the next 7 days
        """
        logger.info("Generating demand prediction", 
                   sku_id=sku_id, store_id=store_id, horizon=horizon_days)
        
        try:
            # Get historical sales data (last 60 days)
            cutoff_date = datetime.now() - timedelta(days=60)
            
            sales_history = self.db.query(SalesTransactionDB).filter(
                SalesTransactionDB.sku_id == sku_id,
                SalesTransactionDB.store_id == store_id,
                SalesTransactionDB.timestamp >= cutoff_date
            ).order_by(SalesTransactionDB.timestamp).all()
            
            # Convert to domain models
            history = [
                SalesTransaction(
                    transaction_id=sale.transaction_id,
                    store_id=sale.store_id,
                    sku_id=sale.sku_id,
                    quantity=sale.quantity,
                    unit_price=sale.unit_price,
                    total_amount=sale.total_amount,
                    timestamp=sale.timestamp,
                    customer_id=sale.customer_id
                )
                for sale in sales_history
            ]
            
            # Generate prediction using model provider
            forecast = self.model_provider.predict_7d_demand(sku_id, store_id, history)
            
            # Store prediction in database
            await self._store_forecast(forecast)
            
            logger.info("Demand prediction generated successfully",
                       sku_id=sku_id, 
                       predicted_demand=forecast.predicted_demand,
                       confidence=forecast.confidence_level)
            
            return forecast
            
        except Exception as e:
            logger.error("Failed to generate demand prediction", 
                        sku_id=sku_id, store_id=store_id, error=str(e))
            raise
    
    async def batch_predict(
        self, 
        store_id: str, 
        sku_list: Optional[List[str]] = None
    ) -> List[DemandForecast]:
        """
        Generate predictions for multiple SKUs in a store.
        
        If sku_list is None, predicts for all SKUs in the store.
        """
        logger.info("Generating batch predictions", store_id=store_id)
        
        try:
            # Get SKU list if not provided
            if sku_list is None:
                inventory_items = self.db.query(
                    InventoryItemDB.sku_id
                ).filter(
                    InventoryItemDB.store_id == store_id
                ).distinct().all()
                
                sku_list = [item.sku_id for item in inventory_items]
            
            # Generate predictions for each SKU
            forecasts = []
            for sku_id in sku_list:
                try:
                    forecast = await self.predict_demand(sku_id, store_id)
                    forecasts.append(forecast)
                except Exception as e:
                    logger.warning("Failed to predict for SKU", 
                                 sku_id=sku_id, error=str(e))
                    continue
            
            logger.info("Batch predictions completed",
                       store_id=store_id, 
                       total_skus=len(sku_list),
                       successful_predictions=len(forecasts))
            
            return forecasts
            
        except Exception as e:
            logger.error("Failed to generate batch predictions", 
                        store_id=store_id, error=str(e))
            raise
    
    async def get_latest_forecast(
        self, 
        sku_id: str, 
        store_id: str
    ) -> Optional[DemandForecast]:
        """Get the most recent forecast for a SKU"""
        
        forecast_db = self.db.query(DemandForecastDB).filter(
            DemandForecastDB.sku_id == sku_id,
            DemandForecastDB.store_id == store_id
        ).order_by(DemandForecastDB.created_at.desc()).first()
        
        if not forecast_db:
            return None
        
        return DemandForecast(
            sku_id=forecast_db.sku_id,
            store_id=forecast_db.store_id,
            forecast_date=forecast_db.forecast_date,
            predicted_demand=forecast_db.predicted_demand,
            confidence_interval=(
                forecast_db.confidence_interval_lower,
                forecast_db.confidence_interval_upper
            ),
            confidence_level=forecast_db.confidence_level,
            model_used=forecast_db.model_used,
            external_factors=forecast_db.external_factors or {},
            created_at=forecast_db.created_at
        )
    
    async def _store_forecast(self, forecast: DemandForecast) -> None:
        """Store forecast in database"""
        try:
            # Check if forecast already exists for this date
            existing = self.db.query(DemandForecastDB).filter(
                DemandForecastDB.sku_id == forecast.sku_id,
                DemandForecastDB.store_id == forecast.store_id,
                DemandForecastDB.forecast_date == forecast.forecast_date
            ).first()
            
            if existing:
                # Update existing forecast
                existing.predicted_demand = forecast.predicted_demand
                existing.confidence_interval_lower = forecast.confidence_interval[0]
                existing.confidence_interval_upper = forecast.confidence_interval[1]
                existing.confidence_level = forecast.confidence_level
                existing.model_used = forecast.model_used
                existing.external_factors = forecast.external_factors
            else:
                # Create new forecast
                db_forecast = DemandForecastDB(
                    sku_id=forecast.sku_id,
                    store_id=forecast.store_id,
                    forecast_date=forecast.forecast_date,
                    predicted_demand=forecast.predicted_demand,
                    confidence_interval_lower=forecast.confidence_interval[0],
                    confidence_interval_upper=forecast.confidence_interval[1],
                    confidence_level=forecast.confidence_level,
                    model_used=forecast.model_used,
                    external_factors=forecast.external_factors
                )
                self.db.add(db_forecast)
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to store forecast", error=str(e))
            raise