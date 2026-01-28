"""
Recommendation Engine - Requirement 3: Simple Recommendations

Generates actionable recommendations based on detected risks and predictions:
- Reorder quantity and timing suggestions
- Discount strategies for near-expiry items
- Redistribution and promotional recommendations

Implements clear explanations for each recommendation.
"""

from typing import List, Dict, Optional, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
import structlog
import uuid

from app.models.domain_models import (
    Recommendation, RecommendationType, Risk, RiskType, RiskSeverity,
    DemandForecast, InventoryItem, SKU
)
from app.models.database_models import (
    RecommendationDB, RiskDB, DemandForecastDB, InventoryItemDB, SKUDB
)
from app.core.database import SessionLocal
from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class RecommendationEngine:
    """
    Recommendation Engine implementing Requirement 3: Simple Recommendations
    
    Acceptance Criteria:
    1. WHEN stock is low, THE Platform SHALL suggest how much to reorder
    2. WHEN products are near expiry, THE Platform SHALL suggest discount amounts or other actions
    3. WHEN I see recommendations, THE Platform SHALL explain why each action is suggested
    """
    
    def __init__(self):
        self.db = SessionLocal()
    
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()
    
    async def generate_reorder_recommendations(self, store_id: str) -> List[Recommendation]:
        """
        Generate reorder recommendations for stockout risks.
        
        Implements Requirement 3.1: Suggest how much to reorder when stock is low
        """
        logger.info("Generating reorder recommendations", store_id=store_id)
        
        try:
            recommendations = []
            
            # Get all stockout risks
            stockout_risks = self.db.query(RiskDB).filter(
                RiskDB.store_id == store_id,
                RiskDB.risk_type == RiskType.STOCKOUT.value,
                RiskDB.resolved_at.is_(None)
            ).all()
            
            for risk in stockout_risks:
                recommendation = await self._create_reorder_recommendation(risk)
                if recommendation:
                    recommendations.append(recommendation)
            
            logger.info("Reorder recommendations generated",
                       store_id=store_id, count=len(recommendations))
            
            return recommendations
            
        except Exception as e:
            logger.error("Failed to generate reorder recommendations", 
                        store_id=store_id, error=str(e))
            raise
    
    async def generate_pricing_recommendations(self, store_id: str) -> List[Recommendation]:
        """
        Generate pricing/discount recommendations for expiry risks.
        
        Implements Requirement 3.2: Suggest discount amounts for near-expiry products
        """
        logger.info("Generating pricing recommendations", store_id=store_id)
        
        try:
            recommendations = []
            
            # Get all expiry risks
            expiry_risks = self.db.query(RiskDB).filter(
                RiskDB.store_id == store_id,
                RiskDB.risk_type == RiskType.EXPIRY.value,
                RiskDB.resolved_at.is_(None)
            ).all()
            
            for risk in expiry_risks:
                recommendation = await self._create_pricing_recommendation(risk)
                if recommendation:
                    recommendations.append(recommendation)
            
            logger.info("Pricing recommendations generated",
                       store_id=store_id, count=len(recommendations))
            
            return recommendations
            
        except Exception as e:
            logger.error("Failed to generate pricing recommendations", 
                        store_id=store_id, error=str(e))
            raise
    
    async def generate_redistribution_recommendations(self, store_id: str) -> List[Recommendation]:
        """
        Generate redistribution recommendations for overstock situations.
        
        Note: For MVP single-store version, this suggests promotional strategies instead.
        """
        logger.info("Generating redistribution recommendations", store_id=store_id)
        
        try:
            recommendations = []
            
            # Get overstock and slow-moving risks
            overstock_risks = self.db.query(RiskDB).filter(
                RiskDB.store_id == store_id,
                RiskDB.risk_type.in_([RiskType.OVERSTOCK.value, RiskType.SLOW_MOVING.value]),
                RiskDB.resolved_at.is_(None)
            ).all()
            
            for risk in overstock_risks:
                recommendation = await self._create_promotional_recommendation(risk)
                if recommendation:
                    recommendations.append(recommendation)
            
            logger.info("Redistribution/promotional recommendations generated",
                       store_id=store_id, count=len(recommendations))
            
            return recommendations
            
        except Exception as e:
            logger.error("Failed to generate redistribution recommendations", 
                        store_id=store_id, error=str(e))
            raise
    
    async def rank_recommendations(
        self, 
        recommendations: List[Recommendation]
    ) -> List[Recommendation]:
        """
        Rank recommendations by priority and expected impact.
        
        Ranking criteria:
        1. Risk severity (CRITICAL > HIGH > MEDIUM > LOW)
        2. Estimated ROI
        3. Implementation complexity (simpler first)
        """
        
        def recommendation_priority(rec: Recommendation) -> Tuple[int, float, int]:
            # Get associated risk severity
            risk = self.db.query(RiskDB).filter(
                RiskDB.sku_id == rec.sku_id,
                RiskDB.store_id == rec.store_id,
                RiskDB.resolved_at.is_(None)
            ).order_by(RiskDB.risk_score.desc()).first()
            
            severity_score = 0
            if risk:
                severity_map = {
                    RiskSeverity.CRITICAL.value: 4,
                    RiskSeverity.HIGH.value: 3,
                    RiskSeverity.MEDIUM.value: 2,
                    RiskSeverity.LOW.value: 1
                }
                severity_score = severity_map.get(risk.severity, 0)
            
            # Implementation complexity (lower is simpler)
            complexity_map = {
                RecommendationType.REORDER: 1,
                RecommendationType.DISCOUNT: 2,
                RecommendationType.PROMOTE: 3,
                RecommendationType.REDISTRIBUTE: 4
            }
            complexity = complexity_map.get(rec.recommendation_type, 5)
            
            return (
                -severity_score,  # Negative for descending order
                -(rec.estimated_roi or 0),  # Negative for descending order
                complexity  # Ascending order (simpler first)
            )
        
        ranked = sorted(recommendations, key=recommendation_priority)
        
        logger.info("Recommendations ranked", total=len(ranked))
        return ranked
    
    async def get_recommendations_for_sku(
        self, 
        sku_id: str, 
        store_id: str
    ) -> List[Recommendation]:
        """Get all active recommendations for a specific SKU"""
        
        recommendations_db = self.db.query(RecommendationDB).filter(
            RecommendationDB.sku_id == sku_id,
            RecommendationDB.store_id == store_id,
            RecommendationDB.accepted_at.is_(None),
            RecommendationDB.rejected_at.is_(None)
        ).order_by(RecommendationDB.created_at.desc()).all()
        
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
        
        return recommendations
    
    async def _create_reorder_recommendation(self, risk: RiskDB) -> Optional[Recommendation]:
        """Create a reorder recommendation for stockout risk"""
        
        try:
            # Get inventory and forecast data
            inventory = self.db.query(InventoryItemDB).filter(
                InventoryItemDB.sku_id == risk.sku_id,
                InventoryItemDB.store_id == risk.store_id
            ).first()
            
            forecast = self.db.query(DemandForecastDB).filter(
                DemandForecastDB.sku_id == risk.sku_id,
                DemandForecastDB.store_id == risk.store_id
            ).order_by(DemandForecastDB.created_at.desc()).first()
            
            sku = self.db.query(SKUDB).filter(
                SKUDB.sku_id == risk.sku_id
            ).first()
            
            if not inventory or not sku:
                return None
            
            # Calculate recommended order quantity
            if forecast:
                # Use forecast-based calculation
                weekly_demand = forecast.predicted_demand
                safety_stock = max(inventory.safety_stock, weekly_demand * 0.5)  # At least 50% of weekly demand
                reorder_quantity = int(weekly_demand * 2 + safety_stock - inventory.current_stock)
            else:
                # Fallback to simple reorder point logic
                reorder_quantity = max(50, inventory.reorder_point * 2 - inventory.current_stock)
            
            reorder_quantity = max(1, reorder_quantity)  # Ensure positive quantity
            
            # Calculate expected ROI (simplified)
            potential_lost_sales = weekly_demand if forecast else 10
            revenue_protected = potential_lost_sales * float(sku.selling_price)
            order_cost = reorder_quantity * float(sku.unit_cost)
            estimated_roi = (revenue_protected - order_cost) / order_cost if order_cost > 0 else 0
            
            # Create recommendation
            recommendation = Recommendation(
                recommendation_id=str(uuid.uuid4()),
                recommendation_type=RecommendationType.REORDER,
                sku_id=risk.sku_id,
                store_id=risk.store_id,
                action=f"Reorder {reorder_quantity} units",
                parameters={
                    "quantity": reorder_quantity,
                    "urgency": risk.severity,
                    "supplier_suggestions": ["primary_supplier"],  # Simplified
                    "estimated_cost": float(reorder_quantity * sku.unit_cost)
                },
                expected_outcome=f"Prevent stockout and maintain {reorder_quantity + inventory.current_stock} units in stock",
                confidence_level=forecast.confidence_level if forecast else 0.6,
                estimated_roi=estimated_roi,
                explanation=self._create_reorder_explanation(
                    inventory, forecast, reorder_quantity, risk.severity
                )
            )
            
            # Store recommendation
            await self._store_recommendation(recommendation)
            
            return recommendation
            
        except Exception as e:
            logger.error("Failed to create reorder recommendation", 
                        sku_id=risk.sku_id, error=str(e))
            return None
    
    async def _create_pricing_recommendation(self, risk: RiskDB) -> Optional[Recommendation]:
        """Create a pricing/discount recommendation for expiry risk"""
        
        try:
            # Get SKU data
            sku = self.db.query(SKUDB).filter(
                SKUDB.sku_id == risk.sku_id
            ).first()
            
            if not sku:
                return None
            
            # Calculate discount based on days until expiry
            days_until_expiry = risk.time_to_impact_seconds / (24 * 3600) if risk.time_to_impact_seconds else 1
            
            if days_until_expiry <= 0:
                discount_percent = 50  # 50% off for expired/same day
            elif days_until_expiry <= 1:
                discount_percent = 30  # 30% off for 1 day
            elif days_until_expiry <= 2:
                discount_percent = 20  # 20% off for 2 days
            else:
                discount_percent = 10  # 10% off for 3+ days
            
            discounted_price = float(sku.selling_price) * (1 - discount_percent / 100)
            
            # Calculate expected ROI
            original_margin = float(sku.selling_price - sku.unit_cost)
            discounted_margin = discounted_price - float(sku.unit_cost)
            
            # Assume 70% chance of sale with discount vs 10% without
            expected_revenue_with_discount = discounted_margin * 0.7
            expected_revenue_without_discount = original_margin * 0.1
            estimated_roi = (expected_revenue_with_discount - expected_revenue_without_discount) / float(sku.unit_cost)
            
            recommendation = Recommendation(
                recommendation_id=str(uuid.uuid4()),
                recommendation_type=RecommendationType.DISCOUNT,
                sku_id=risk.sku_id,
                store_id=risk.store_id,
                action=f"Apply {discount_percent}% discount (₹{discounted_price:.2f})",
                parameters={
                    "discount_percent": discount_percent,
                    "new_price": discounted_price,
                    "original_price": float(sku.selling_price),
                    "days_until_expiry": days_until_expiry,
                    "promotion_duration": min(3, max(1, int(days_until_expiry)))
                },
                expected_outcome=f"Increase sale probability from 10% to 70% and recover ₹{discounted_margin:.2f} per unit",
                confidence_level=0.8,  # High confidence in discount effectiveness
                estimated_roi=estimated_roi,
                explanation=self._create_pricing_explanation(
                    sku, discount_percent, days_until_expiry, discounted_price
                )
            )
            
            await self._store_recommendation(recommendation)
            
            return recommendation
            
        except Exception as e:
            logger.error("Failed to create pricing recommendation", 
                        sku_id=risk.sku_id, error=str(e))
            return None
    
    async def _create_promotional_recommendation(self, risk: RiskDB) -> Optional[Recommendation]:
        """Create promotional recommendation for overstock/slow-moving items"""
        
        try:
            sku = self.db.query(SKUDB).filter(
                SKUDB.sku_id == risk.sku_id
            ).first()
            
            inventory = self.db.query(InventoryItemDB).filter(
                InventoryItemDB.sku_id == risk.sku_id,
                InventoryItemDB.store_id == risk.store_id
            ).first()
            
            if not sku or not inventory:
                return None
            
            # Suggest promotional strategies based on risk type
            if risk.risk_type == RiskType.OVERSTOCK.value:
                action = "Bundle with fast-moving items or create bulk discount"
                strategy = "bundling"
                discount = 15
            else:  # SLOW_MOVING
                action = "Feature prominently and offer 20% discount"
                strategy = "promotion"
                discount = 20
            
            discounted_price = float(sku.selling_price) * (1 - discount / 100)
            
            recommendation = Recommendation(
                recommendation_id=str(uuid.uuid4()),
                recommendation_type=RecommendationType.PROMOTE,
                sku_id=risk.sku_id,
                store_id=risk.store_id,
                action=action,
                parameters={
                    "strategy": strategy,
                    "discount_percent": discount,
                    "promotional_price": discounted_price,
                    "duration_days": 7,
                    "placement": "front_of_store",
                    "target_quantity": min(inventory.current_stock // 2, 50)
                },
                expected_outcome=f"Move {min(inventory.current_stock // 2, 50)} units in 7 days",
                confidence_level=0.6,
                estimated_roi=0.1,  # Conservative ROI for promotional activities
                explanation=self._create_promotional_explanation(
                    sku, risk.risk_type, inventory.current_stock, strategy
                )
            )
            
            await self._store_recommendation(recommendation)
            
            return recommendation
            
        except Exception as e:
            logger.error("Failed to create promotional recommendation", 
                        sku_id=risk.sku_id, error=str(e))
            return None
    
    def _create_reorder_explanation(
        self, 
        inventory: InventoryItemDB, 
        forecast: Optional[DemandForecastDB], 
        quantity: int, 
        severity: str
    ) -> str:
        """Create clear explanation for reorder recommendation"""
        
        if forecast:
            explanation = (
                f"Current stock ({inventory.current_stock} units) is insufficient for predicted demand. "
                f"Based on 7-day forecast of {forecast.predicted_demand:.1f} units, "
                f"ordering {quantity} units will provide adequate stock plus safety buffer. "
                f"Risk level: {severity}."
            )
        else:
            explanation = (
                f"Current stock ({inventory.current_stock} units) is below reorder point ({inventory.reorder_point}). "
                f"Ordering {quantity} units will restore stock to safe levels. "
                f"Risk level: {severity}."
            )
        
        return explanation
    
    def _create_pricing_explanation(
        self, 
        sku: SKUDB, 
        discount_percent: int, 
        days_until_expiry: float, 
        new_price: float
    ) -> str:
        """Create clear explanation for pricing recommendation"""
        
        explanation = (
            f"{sku.name} expires in {days_until_expiry:.0f} day(s). "
            f"Applying {discount_percent}% discount (from ₹{sku.selling_price} to ₹{new_price:.2f}) "
            f"significantly increases sale probability and recovers value before expiry. "
            f"Without discount, product will likely become total loss."
        )
        
        return explanation
    
    def _create_promotional_explanation(
        self, 
        sku: SKUDB, 
        risk_type: str, 
        current_stock: int, 
        strategy: str
    ) -> str:
        """Create clear explanation for promotional recommendation"""
        
        if risk_type == RiskType.OVERSTOCK.value:
            explanation = (
                f"{sku.name} has excessive inventory ({current_stock} units). "
                f"Bundling with popular items or bulk discounts will accelerate turnover "
                f"and free up storage space while maintaining margins."
            )
        else:  # SLOW_MOVING
            explanation = (
                f"{sku.name} has not sold in 30+ days with {current_stock} units in stock. "
                f"Prominent placement with promotional pricing will test market demand "
                f"and reduce holding costs."
            )
        
        return explanation
    
    async def _store_recommendation(self, recommendation: Recommendation) -> None:
        """Store recommendation in database"""
        try:
            # Check if similar recommendation already exists
            existing = self.db.query(RecommendationDB).filter(
                RecommendationDB.sku_id == recommendation.sku_id,
                RecommendationDB.store_id == recommendation.store_id,
                RecommendationDB.recommendation_type == recommendation.recommendation_type.value,
                RecommendationDB.accepted_at.is_(None),
                RecommendationDB.rejected_at.is_(None)
            ).first()
            
            if existing:
                # Update existing recommendation
                existing.action = recommendation.action
                existing.parameters = recommendation.parameters
                existing.expected_outcome = recommendation.expected_outcome
                existing.confidence_level = recommendation.confidence_level
                existing.estimated_roi = recommendation.estimated_roi
                existing.explanation = recommendation.explanation
                existing.created_at = datetime.utcnow()
            else:
                # Create new recommendation
                db_recommendation = RecommendationDB(
                    recommendation_id=recommendation.recommendation_id,
                    recommendation_type=recommendation.recommendation_type.value,
                    sku_id=recommendation.sku_id,
                    store_id=recommendation.store_id,
                    action=recommendation.action,
                    parameters=recommendation.parameters,
                    expected_outcome=recommendation.expected_outcome,
                    confidence_level=recommendation.confidence_level,
                    estimated_roi=recommendation.estimated_roi,
                    explanation=recommendation.explanation
                )
                self.db.add(db_recommendation)
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to store recommendation", error=str(e))
            raise