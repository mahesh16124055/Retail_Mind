"""
Predictions API Router - Requirement 1: Basic Demand Prediction

Provides endpoints for demand forecasting:
- Generate predictions for specific SKUs
- Batch prediction for all store SKUs
- Retrieve historical predictions
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import structlog

from app.core.database import get_db
from app.models.domain_models import DemandForecast
from app.services.demand_prediction import DemandPredictionService

logger = structlog.get_logger()
router = APIRouter()


@router.post("/predict/{store_id}/{sku_id}", response_model=DemandForecast)
async def predict_demand(
    store_id: str,
    sku_id: str,
    horizon_days: int = Query(7, description="Forecast horizon in days"),
    db: Session = Depends(get_db)
):
    """
    Generate demand prediction for a specific SKU.
    
    Implements Requirement 1.1: Predict demand for the next 7 days
    Implements Requirement 1.2: Show the predicted quantity needed
    Implements Requirement 1.3: Show how confident the prediction is
    """
    logger.info("Generating demand prediction", 
               store_id=store_id, sku_id=sku_id, horizon=horizon_days)
    
    try:
        prediction_service = DemandPredictionService()
        forecast = await prediction_service.predict_demand(sku_id, store_id, horizon_days)
        
        logger.info("Demand prediction generated", 
                   sku_id=sku_id, 
                   predicted_demand=forecast.predicted_demand,
                   confidence=forecast.confidence_level)
        
        return forecast
        
    except Exception as e:
        logger.error("Failed to generate demand prediction", 
                    store_id=store_id, sku_id=sku_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict/batch/{store_id}", response_model=List[DemandForecast])
async def predict_batch(
    store_id: str,
    sku_list: Optional[List[str]] = None,
    db: Session = Depends(get_db)
):
    """
    Generate demand predictions for multiple SKUs in a store.
    
    If sku_list is not provided, generates predictions for all SKUs in the store.
    """
    logger.info("Generating batch predictions", store_id=store_id)
    
    try:
        prediction_service = DemandPredictionService()
        forecasts = await prediction_service.batch_predict(store_id, sku_list)
        
        logger.info("Batch predictions generated", 
                   store_id=store_id, count=len(forecasts))
        
        return forecasts
        
    except Exception as e:
        logger.error("Failed to generate batch predictions", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@router.get("/forecast/{store_id}/{sku_id}", response_model=Optional[DemandForecast])
async def get_latest_forecast(
    store_id: str,
    sku_id: str,
    db: Session = Depends(get_db)
):
    """
    Get the most recent demand forecast for a SKU.
    
    Returns None if no forecast exists.
    """
    logger.info("Getting latest forecast", store_id=store_id, sku_id=sku_id)
    
    try:
        prediction_service = DemandPredictionService()
        forecast = await prediction_service.get_latest_forecast(sku_id, store_id)
        
        if forecast:
            logger.info("Latest forecast retrieved", 
                       sku_id=sku_id, 
                       predicted_demand=forecast.predicted_demand)
        else:
            logger.info("No forecast found", sku_id=sku_id)
        
        return forecast
        
    except Exception as e:
        logger.error("Failed to get latest forecast", 
                    store_id=store_id, sku_id=sku_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get forecast: {str(e)}")


@router.get("/forecasts/{store_id}", response_model=List[DemandForecast])
async def get_all_forecasts(
    store_id: str,
    limit: int = Query(50, description="Maximum number of forecasts to return"),
    db: Session = Depends(get_db)
):
    """
    Get all recent forecasts for a store.
    
    Returns the most recent forecast for each SKU in the store.
    """
    logger.info("Getting all forecasts", store_id=store_id)
    
    try:
        from app.models.database_models import DemandForecastDB
        from sqlalchemy import func
        
        # Get the most recent forecast for each SKU
        subquery = db.query(
            DemandForecastDB.sku_id,
            func.max(DemandForecastDB.created_at).label('max_created_at')
        ).filter(
            DemandForecastDB.store_id == store_id
        ).group_by(DemandForecastDB.sku_id).subquery()
        
        forecasts_db = db.query(DemandForecastDB).join(
            subquery,
            (DemandForecastDB.sku_id == subquery.c.sku_id) &
            (DemandForecastDB.created_at == subquery.c.max_created_at)
        ).limit(limit).all()
        
        forecasts = []
        for forecast_db in forecasts_db:
            forecast = DemandForecast(
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
            forecasts.append(forecast)
        
        logger.info("All forecasts retrieved", 
                   store_id=store_id, count=len(forecasts))
        
        return forecasts
        
    except Exception as e:
        logger.error("Failed to get all forecasts", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get forecasts: {str(e)}")


@router.get("/model-performance/{store_id}")
async def get_model_performance(
    store_id: str,
    days_back: int = Query(30, description="Days of history to analyze"),
    db: Session = Depends(get_db)
):
    """
    Get model performance metrics for predictions in a store.
    
    Analyzes prediction accuracy over the specified time period.
    """
    logger.info("Getting model performance", store_id=store_id, days_back=days_back)
    
    try:
        from app.models.database_models import DemandForecastDB, SalesTransactionDB
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get forecasts from the analysis period
        forecasts = db.query(DemandForecastDB).filter(
            DemandForecastDB.store_id == store_id,
            DemandForecastDB.created_at >= cutoff_date
        ).all()
        
        if not forecasts:
            return {
                "store_id": store_id,
                "analysis_period_days": days_back,
                "total_predictions": 0,
                "message": "No predictions found in the specified period"
            }
        
        # Calculate accuracy metrics (simplified)
        total_predictions = len(forecasts)
        accurate_predictions = 0
        total_error = 0.0
        
        for forecast in forecasts:
            # Get actual sales for the forecast period
            forecast_start = forecast.created_at.date()
            forecast_end = forecast.forecast_date
            
            actual_sales = db.query(
                func.sum(SalesTransactionDB.quantity)
            ).filter(
                SalesTransactionDB.sku_id == forecast.sku_id,
                SalesTransactionDB.store_id == forecast.store_id,
                SalesTransactionDB.timestamp >= forecast_start,
                SalesTransactionDB.timestamp <= forecast_end
            ).scalar() or 0
            
            # Calculate error
            error = abs(actual_sales - forecast.predicted_demand)
            total_error += error
            
            # Consider prediction accurate if within 20% of actual
            if actual_sales > 0:
                error_percentage = error / actual_sales
                if error_percentage <= 0.2:  # Within 20%
                    accurate_predictions += 1
            elif forecast.predicted_demand <= 2:  # Low prediction for zero sales
                accurate_predictions += 1
        
        accuracy_rate = accurate_predictions / total_predictions if total_predictions > 0 else 0
        mean_absolute_error = total_error / total_predictions if total_predictions > 0 else 0
        
        performance = {
            "store_id": store_id,
            "analysis_period_days": days_back,
            "total_predictions": total_predictions,
            "accurate_predictions": accurate_predictions,
            "accuracy_rate": round(accuracy_rate, 3),
            "mean_absolute_error": round(mean_absolute_error, 2),
            "performance_grade": _get_performance_grade(accuracy_rate),
            "analysis_date": datetime.utcnow().isoformat()
        }
        
        logger.info("Model performance calculated", 
                   store_id=store_id, 
                   accuracy_rate=accuracy_rate,
                   total_predictions=total_predictions)
        
        return performance
        
    except Exception as e:
        logger.error("Failed to get model performance", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get performance metrics: {str(e)}")


def _get_performance_grade(accuracy_rate: float) -> str:
    """Convert accuracy rate to performance grade"""
    if accuracy_rate >= 0.9:
        return "Excellent"
    elif accuracy_rate >= 0.8:
        return "Good"
    elif accuracy_rate >= 0.7:
        return "Fair"
    elif accuracy_rate >= 0.6:
        return "Poor"
    else:
        return "Very Poor"