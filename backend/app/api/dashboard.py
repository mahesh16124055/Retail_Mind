"""
Dashboard API Router - Requirement 4: Basic Dashboard

Provides endpoints for dashboard data:
- Products needing immediate attention
- Summary statistics
- SKU detail views with drill-down capabilities
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import structlog

from app.core.database import get_db
from app.models.domain_models import (
    DashboardSummary, ProductAlert, SKUDetail, RiskSeverity
)
from app.models.database_models import (
    InventoryItemDB, SKUDB, RiskDB, RecommendationDB, 
    DemandForecastDB, SalesTransactionDB
)
from app.services.demand_prediction import DemandPredictionService
from app.services.risk_detection import RiskDetectionService
from app.services.recommendation_engine import RecommendationEngine

logger = structlog.get_logger()
router = APIRouter()


@router.get("/summary/{store_id}", response_model=DashboardSummary)
async def get_dashboard_summary(
    store_id: str,
    db: Session = Depends(get_db)
):
    """
    Get dashboard summary for a store.
    
    Implements Requirement 4.1: Show products that need immediate attention
    """
    logger.info("Getting dashboard summary", store_id=store_id)
    
    try:
        # Count total SKUs in store
        total_skus = db.query(InventoryItemDB).filter(
            InventoryItemDB.store_id == store_id
        ).count()
        
        # Count critical alerts (CRITICAL and HIGH severity risks)
        critical_alerts = db.query(RiskDB).filter(
            RiskDB.store_id == store_id,
            RiskDB.severity.in_([RiskSeverity.CRITICAL.value, RiskSeverity.HIGH.value]),
            RiskDB.resolved_at.is_(None)
        ).count()
        
        # Count low stock items (stockout risks)
        low_stock_items = db.query(RiskDB).filter(
            RiskDB.store_id == store_id,
            RiskDB.risk_type == "STOCKOUT",
            RiskDB.resolved_at.is_(None)
        ).count()
        
        # Count expiry warnings
        expiry_warnings = db.query(RiskDB).filter(
            RiskDB.store_id == store_id,
            RiskDB.risk_type == "EXPIRY",
            RiskDB.resolved_at.is_(None)
        ).count()
        
        # Count pending recommendations
        recommendations_pending = db.query(RecommendationDB).filter(
            RecommendationDB.store_id == store_id,
            RecommendationDB.accepted_at.is_(None),
            RecommendationDB.rejected_at.is_(None)
        ).count()
        
        summary = DashboardSummary(
            store_id=store_id,
            total_skus=total_skus,
            critical_alerts=critical_alerts,
            low_stock_items=low_stock_items,
            expiry_warnings=expiry_warnings,
            recommendations_pending=recommendations_pending,
            last_updated=datetime.utcnow()
        )
        
        logger.info("Dashboard summary generated", 
                   store_id=store_id, critical_alerts=critical_alerts)
        
        return summary
        
    except Exception as e:
        logger.error("Failed to get dashboard summary", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get dashboard summary")


@router.get("/alerts/{store_id}", response_model=List[ProductAlert])
async def get_product_alerts(
    store_id: str,
    severity: Optional[RiskSeverity] = Query(None, description="Filter by risk severity"),
    limit: int = Query(20, description="Maximum number of alerts to return"),
    db: Session = Depends(get_db)
):
    """
    Get products needing immediate attention.
    
    Implements Requirement 4.1: Show products that need immediate attention
    Implements Requirement 4.2: Display current stock levels and alerts
    """
    logger.info("Getting product alerts", store_id=store_id, severity=severity)
    
    try:
        # Build query for risks with inventory and SKU data
        query = db.query(RiskDB, InventoryItemDB, SKUDB).join(
            InventoryItemDB,
            (RiskDB.sku_id == InventoryItemDB.sku_id) &
            (RiskDB.store_id == InventoryItemDB.store_id)
        ).join(
            SKUDB,
            RiskDB.sku_id == SKUDB.sku_id
        ).filter(
            RiskDB.store_id == store_id,
            RiskDB.resolved_at.is_(None)
        )
        
        # Apply severity filter if provided
        if severity:
            query = query.filter(RiskDB.severity == severity.value)
        
        # Order by severity and risk score
        query = query.order_by(
            RiskDB.severity.desc(),
            RiskDB.risk_score.desc()
        ).limit(limit)
        
        results = query.all()
        
        alerts = []
        for risk, inventory, sku in results:
            # Get latest demand forecast
            forecast = db.query(DemandForecastDB).filter(
                DemandForecastDB.sku_id == risk.sku_id,
                DemandForecastDB.store_id == risk.store_id
            ).order_by(DemandForecastDB.created_at.desc()).first()
            
            # Calculate days until stockout
            days_until_stockout = None
            if forecast and forecast.predicted_demand > 0:
                daily_demand = forecast.predicted_demand / 7.0
                if daily_demand > 0:
                    days_until_stockout = int(inventory.available_stock / daily_demand)
            
            # Calculate days until expiry (from risk data)
            days_until_expiry = None
            if risk.risk_type == "EXPIRY" and risk.time_to_impact_seconds:
                days_until_expiry = int(risk.time_to_impact_seconds / (24 * 3600))
            
            # Get primary recommendation
            recommendation = db.query(RecommendationDB).filter(
                RecommendationDB.sku_id == risk.sku_id,
                RecommendationDB.store_id == risk.store_id,
                RecommendationDB.accepted_at.is_(None),
                RecommendationDB.rejected_at.is_(None)
            ).order_by(RecommendationDB.created_at.desc()).first()
            
            primary_recommendation = "No recommendation available"
            if recommendation:
                primary_recommendation = recommendation.action
            
            alert = ProductAlert(
                sku_id=risk.sku_id,
                sku_name=sku.name,
                current_stock=inventory.current_stock,
                predicted_demand_7d=forecast.predicted_demand if forecast else 0.0,
                days_until_stockout=days_until_stockout,
                days_until_expiry=days_until_expiry,
                risk_severity=RiskSeverity(risk.severity),
                primary_recommendation=primary_recommendation
            )
            alerts.append(alert)
        
        logger.info("Product alerts retrieved", 
                   store_id=store_id, count=len(alerts))
        
        return alerts
        
    except Exception as e:
        logger.error("Failed to get product alerts", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get product alerts")


@router.get("/sku/{store_id}/{sku_id}", response_model=SKUDetail)
async def get_sku_detail(
    store_id: str,
    sku_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed information for a specific SKU.
    
    Implements Requirement 4.3: Show detailed information and recommendations when clicking on a product
    """
    logger.info("Getting SKU detail", store_id=store_id, sku_id=sku_id)
    
    try:
        # Get SKU information
        sku_db = db.query(SKUDB).filter(SKUDB.sku_id == sku_id).first()
        if not sku_db:
            raise HTTPException(status_code=404, detail="SKU not found")
        
        # Get inventory information
        inventory_db = db.query(InventoryItemDB).filter(
            InventoryItemDB.sku_id == sku_id,
            InventoryItemDB.store_id == store_id
        ).first()
        if not inventory_db:
            raise HTTPException(status_code=404, detail="Inventory not found for this SKU in store")
        
        # Get latest forecast
        forecast_db = db.query(DemandForecastDB).filter(
            DemandForecastDB.sku_id == sku_id,
            DemandForecastDB.store_id == store_id
        ).order_by(DemandForecastDB.created_at.desc()).first()
        
        # Get active risks
        risks_db = db.query(RiskDB).filter(
            RiskDB.sku_id == sku_id,
            RiskDB.store_id == store_id,
            RiskDB.resolved_at.is_(None)
        ).all()
        
        # Get active recommendations
        recommendations_db = db.query(RecommendationDB).filter(
            RecommendationDB.sku_id == sku_id,
            RecommendationDB.store_id == store_id,
            RecommendationDB.accepted_at.is_(None),
            RecommendationDB.rejected_at.is_(None)
        ).order_by(RecommendationDB.created_at.desc()).all()
        
        # Get sales history (last 30 days)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        sales_history_db = db.query(SalesTransactionDB).filter(
            SalesTransactionDB.sku_id == sku_id,
            SalesTransactionDB.store_id == store_id,
            SalesTransactionDB.timestamp >= cutoff_date
        ).order_by(SalesTransactionDB.timestamp.desc()).all()
        
        # Convert to domain models
        from app.models.domain_models import (
            SKU, InventoryItem, DemandForecast, Risk, Recommendation, 
            SalesTransaction, StorageRequirements, BatchInfo,
            RiskType, RiskSeverity, RecommendationType
        )
        from decimal import Decimal
        
        sku = SKU(
            sku_id=sku_db.sku_id,
            name=sku_db.name,
            category=sku_db.category,
            subcategory=sku_db.subcategory or "",
            brand=sku_db.brand or "",
            unit_cost=sku_db.unit_cost,
            selling_price=sku_db.selling_price,
            shelf_life_days=sku_db.shelf_life_days,
            storage_requirements=StorageRequirements(**(sku_db.storage_requirements or {})),
            created_at=sku_db.created_at
        )
        
        # Convert batch info
        batch_info = []
        if inventory_db.batch_info:
            for batch_data in inventory_db.batch_info:
                batch_info.append(BatchInfo(
                    batch_id=batch_data.get('batch_id', ''),
                    expiry_date=date.fromisoformat(batch_data.get('expiry_date', '2024-12-31')),
                    quantity=batch_data.get('quantity', 0),
                    cost_per_unit=Decimal(str(batch_data.get('cost_per_unit', 0)))
                ))
        
        inventory = InventoryItem(
            sku_id=inventory_db.sku_id,
            store_id=inventory_db.store_id,
            current_stock=inventory_db.current_stock,
            reserved_stock=inventory_db.reserved_stock,
            available_stock=inventory_db.available_stock,
            reorder_point=inventory_db.reorder_point,
            safety_stock=inventory_db.safety_stock,
            last_updated=inventory_db.last_updated,
            batch_info=batch_info
        )
        
        # Convert forecast
        forecast = None
        if forecast_db:
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
        
        # Convert risks
        risks = []
        for risk_db in risks_db:
            risk = Risk(
                risk_id=risk_db.risk_id,
                risk_type=RiskType(risk_db.risk_type),
                sku_id=risk_db.sku_id,
                store_id=risk_db.store_id,
                severity=RiskSeverity(risk_db.severity),
                risk_score=risk_db.risk_score,
                estimated_impact=risk_db.estimated_impact or 0.0,
                time_to_impact=timedelta(seconds=risk_db.time_to_impact_seconds or 0),
                description=risk_db.description or "",
                detected_at=risk_db.detected_at
            )
            risks.append(risk)
        
        # Convert recommendations
        recommendations = []
        for rec_db in recommendations_db:
            rec = Recommendation(
                recommendation_id=rec_db.recommendation_id,
                recommendation_type=RecommendationType(rec_db.recommendation_type),
                sku_id=rec_db.sku_id,
                store_id=rec_db.store_id,
                action=rec_db.action,
                parameters=rec_db.parameters or {},
                expected_outcome=rec_db.expected_outcome or "",
                confidence_level=rec_db.confidence_level,
                estimated_roi=rec_db.estimated_roi,
                explanation=rec_db.explanation or "",
                created_at=rec_db.created_at
            )
            recommendations.append(rec)
        
        # Convert sales history
        sales_history = []
        for sale_db in sales_history_db:
            sale = SalesTransaction(
                transaction_id=sale_db.transaction_id,
                store_id=sale_db.store_id,
                sku_id=sale_db.sku_id,
                quantity=sale_db.quantity,
                unit_price=sale_db.unit_price,
                total_amount=sale_db.total_amount,
                timestamp=sale_db.timestamp,
                customer_id=sale_db.customer_id
            )
            sales_history.append(sale)
        
        sku_detail = SKUDetail(
            sku=sku,
            inventory=inventory,
            forecast=forecast,
            risks=risks,
            recommendations=recommendations,
            sales_history_30d=sales_history
        )
        
        logger.info("SKU detail retrieved", 
                   store_id=store_id, sku_id=sku_id)
        
        return sku_detail
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get SKU detail", 
                    store_id=store_id, sku_id=sku_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get SKU detail")


@router.post("/analyze/{store_id}")
async def trigger_analysis(
    store_id: str,
    db: Session = Depends(get_db)
):
    """
    Trigger demand prediction and risk analysis for a store.
    
    This endpoint runs the AI analysis pipeline:
    1. Generate demand predictions for all SKUs
    2. Detect inventory risks
    3. Generate recommendations
    """
    logger.info("Triggering analysis", store_id=store_id)
    
    try:
        # Initialize services
        prediction_service = DemandPredictionService()
        risk_service = RiskDetectionService()
        recommendation_engine = RecommendationEngine()
        
        # Step 1: Generate demand predictions
        logger.info("Generating demand predictions", store_id=store_id)
        forecasts = await prediction_service.batch_predict(store_id)
        
        # Step 2: Detect risks
        logger.info("Detecting risks", store_id=store_id)
        stockout_risks = []
        expiry_risks = await risk_service.detect_expiry_risk(store_id)
        overstock_risks = await risk_service.detect_overstock(store_id)
        slow_moving_risks = await risk_service.detect_slow_moving_inventory(store_id)
        
        # Detect stockout risks for each SKU with predictions
        for forecast in forecasts:
            risk = await risk_service.detect_stockout_risk(forecast.sku_id, store_id)
            if risk:
                stockout_risks.append(risk)
        
        # Step 3: Generate recommendations
        logger.info("Generating recommendations", store_id=store_id)
        reorder_recommendations = await recommendation_engine.generate_reorder_recommendations(store_id)
        pricing_recommendations = await recommendation_engine.generate_pricing_recommendations(store_id)
        promotional_recommendations = await recommendation_engine.generate_redistribution_recommendations(store_id)
        
        # Compile results
        total_risks = len(stockout_risks) + len(expiry_risks) + len(overstock_risks) + len(slow_moving_risks)
        total_recommendations = len(reorder_recommendations) + len(pricing_recommendations) + len(promotional_recommendations)
        
        result = {
            "status": "completed",
            "store_id": store_id,
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "results": {
                "forecasts_generated": len(forecasts),
                "risks_detected": {
                    "stockout": len(stockout_risks),
                    "expiry": len(expiry_risks),
                    "overstock": len(overstock_risks),
                    "slow_moving": len(slow_moving_risks),
                    "total": total_risks
                },
                "recommendations_generated": {
                    "reorder": len(reorder_recommendations),
                    "pricing": len(pricing_recommendations),
                    "promotional": len(promotional_recommendations),
                    "total": total_recommendations
                }
            }
        }
        
        logger.info("Analysis completed successfully", 
                   store_id=store_id, 
                   forecasts=len(forecasts),
                   risks=total_risks,
                   recommendations=total_recommendations)
        
        return result
        
    except Exception as e:
        logger.error("Failed to complete analysis", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# Import datetime at the top
from datetime import datetime, timedelta