"""
Risk Detection Service - Requirement 2: Stock Level Alerts

Detects inventory risks and generates alerts:
- Stockout risk based on current stock vs predicted demand
- Expiry risk for products nearing expiration
- Overstock and slow-moving inventory detection

Implements Property 6 & 7 from design.md correctness properties.
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
import structlog
import uuid

from app.models.domain_models import (
    Risk, RiskType, RiskSeverity, InventoryItem, DemandForecast, 
    SKU, BatchInfo
)
from app.models.database_models import (
    RiskDB, InventoryItemDB, DemandForecastDB, SKUDB, SalesTransactionDB
)
from app.core.database import SessionLocal
from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class RiskDetectionService:
    """
    Risk Detection Service implementing Requirement 2: Stock Level Alerts
    
    Acceptance Criteria:
    1. WHEN product stock falls below a minimum level, THE Platform SHALL send a low stock alert
    2. WHEN products are within 3 days of expiry, THE Platform SHALL send an expiry warning
    3. WHEN I receive alerts, THE Platform SHALL suggest what action to take
    
    Implements correctness properties:
    - Property 6: Stockout Alert Timing (24-48 hours before expected stockout)
    - Property 7: Expiry Risk Detection (within 3 days)
    """
    
    def __init__(self):
        self.db = SessionLocal()
    
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()
    
    async def detect_stockout_risk(
        self, 
        sku_id: str, 
        store_id: str
    ) -> Optional[Risk]:
        """
        Detect stockout risk for a specific SKU.
        
        Implements Property 6: Stockout Alert Timing
        - Alert should be generated 24-48 hours before expected stockout
        """
        logger.info("Detecting stockout risk", sku_id=sku_id, store_id=store_id)
        
        try:
            # Get current inventory
            inventory = self.db.query(InventoryItemDB).filter(
                InventoryItemDB.sku_id == sku_id,
                InventoryItemDB.store_id == store_id
            ).first()
            
            if not inventory:
                logger.warning("No inventory found for SKU", sku_id=sku_id)
                return None
            
            # Get latest demand forecast
            forecast = self.db.query(DemandForecastDB).filter(
                DemandForecastDB.sku_id == sku_id,
                DemandForecastDB.store_id == store_id
            ).order_by(DemandForecastDB.created_at.desc()).first()
            
            if not forecast:
                # No forecast available - use simple reorder point logic
                if inventory.current_stock <= inventory.reorder_point:
                    return self._create_stockout_risk(
                        sku_id, store_id, inventory, None, "reorder_point"
                    )
                return None
            
            # Calculate days until stockout based on predicted demand
            daily_demand = forecast.predicted_demand / 7.0  # 7-day forecast
            
            if daily_demand <= 0:
                return None  # No demand predicted
            
            days_until_stockout = inventory.available_stock / daily_demand
            
            # Generate risk based on time until stockout
            if days_until_stockout <= 1:
                severity = RiskSeverity.CRITICAL
                risk_score = 0.9
            elif days_until_stockout <= 2:
                severity = RiskSeverity.HIGH
                risk_score = 0.8
            elif days_until_stockout <= settings.STOCKOUT_RISK_DAYS:
                severity = RiskSeverity.MEDIUM
                risk_score = 0.6
            else:
                return None  # No immediate risk
            
            # Create stockout risk
            risk = Risk(
                risk_id=str(uuid.uuid4()),
                risk_type=RiskType.STOCKOUT,
                sku_id=sku_id,
                store_id=store_id,
                severity=severity,
                risk_score=risk_score,
                estimated_impact=self._calculate_stockout_impact(
                    inventory, forecast, daily_demand
                ),
                time_to_impact=timedelta(days=days_until_stockout),
                description=f"Stock will run out in {days_until_stockout:.1f} days based on predicted demand"
            )
            
            # Store risk in database
            await self._store_risk(risk)
            
            logger.info("Stockout risk detected",
                       sku_id=sku_id,
                       severity=severity.value,
                       days_until_stockout=days_until_stockout)
            
            return risk
            
        except Exception as e:
            logger.error("Failed to detect stockout risk", 
                        sku_id=sku_id, store_id=store_id, error=str(e))
            raise
    
    async def detect_expiry_risk(self, store_id: str) -> List[Risk]:
        """
        Detect expiry risks for all products in a store.
        
        Implements Property 7: Expiry Risk Detection
        - Any item within 3 days to expiry is flagged
        """
        logger.info("Detecting expiry risks", store_id=store_id)
        
        try:
            risks = []
            
            # Get all inventory items with batch information
            inventory_items = self.db.query(InventoryItemDB).filter(
                InventoryItemDB.store_id == store_id,
                InventoryItemDB.batch_info.isnot(None)
            ).all()
            
            current_date = date.today()
            expiry_threshold = current_date + timedelta(days=settings.EXPIRY_WARNING_DAYS)
            
            for inventory in inventory_items:
                if not inventory.batch_info:
                    continue
                
                # Check each batch for expiry risk
                for batch_data in inventory.batch_info:
                    try:
                        batch_expiry = date.fromisoformat(batch_data['expiry_date'])
                        days_until_expiry = (batch_expiry - current_date).days
                        
                        if days_until_expiry <= settings.EXPIRY_WARNING_DAYS:
                            risk = await self._create_expiry_risk(
                                inventory, batch_data, days_until_expiry
                            )
                            if risk:
                                risks.append(risk)
                                
                    except (KeyError, ValueError) as e:
                        logger.warning("Invalid batch data", 
                                     sku_id=inventory.sku_id, error=str(e))
                        continue
            
            logger.info("Expiry risk detection completed",
                       store_id=store_id, risks_found=len(risks))
            
            return risks
            
        except Exception as e:
            logger.error("Failed to detect expiry risks", 
                        store_id=store_id, error=str(e))
            raise
    
    async def detect_overstock(self, store_id: str) -> List[Risk]:
        """
        Detect overstock situations based on inventory turnover.
        
        Identifies products with excessive inventory relative to demand.
        """
        logger.info("Detecting overstock risks", store_id=store_id)
        
        try:
            risks = []
            
            # Get inventory items with recent forecasts
            query = self.db.query(InventoryItemDB, DemandForecastDB).join(
                DemandForecastDB,
                (InventoryItemDB.sku_id == DemandForecastDB.sku_id) &
                (InventoryItemDB.store_id == DemandForecastDB.store_id)
            ).filter(
                InventoryItemDB.store_id == store_id,
                DemandForecastDB.created_at >= datetime.now() - timedelta(days=7)
            ).all()
            
            for inventory, forecast in query:
                # Calculate weeks of inventory on hand
                weekly_demand = forecast.predicted_demand
                
                if weekly_demand <= 0:
                    continue  # Skip items with no predicted demand
                
                weeks_of_inventory = inventory.current_stock / weekly_demand
                
                # Flag as overstock if more than 8 weeks of inventory
                if weeks_of_inventory > 8:
                    severity = RiskSeverity.HIGH if weeks_of_inventory > 12 else RiskSeverity.MEDIUM
                    
                    risk = Risk(
                        risk_id=str(uuid.uuid4()),
                        risk_type=RiskType.OVERSTOCK,
                        sku_id=inventory.sku_id,
                        store_id=inventory.store_id,
                        severity=severity,
                        risk_score=min(0.9, weeks_of_inventory / 20),  # Cap at 0.9
                        estimated_impact=self._calculate_overstock_impact(
                            inventory, forecast, weeks_of_inventory
                        ),
                        time_to_impact=timedelta(days=0),  # Immediate impact
                        description=f"Excessive inventory: {weeks_of_inventory:.1f} weeks of stock on hand"
                    )
                    
                    await self._store_risk(risk)
                    risks.append(risk)
            
            logger.info("Overstock detection completed",
                       store_id=store_id, risks_found=len(risks))
            
            return risks
            
        except Exception as e:
            logger.error("Failed to detect overstock risks", 
                        store_id=store_id, error=str(e))
            raise
    
    async def detect_slow_moving_inventory(self, store_id: str) -> List[Risk]:
        """
        Detect slow-moving inventory based on sales velocity.
        
        Identifies products with low turnover rates.
        """
        logger.info("Detecting slow-moving inventory", store_id=store_id)
        
        try:
            risks = []
            
            # Get inventory items with sales history
            cutoff_date = datetime.now() - timedelta(days=30)
            
            inventory_items = self.db.query(InventoryItemDB).filter(
                InventoryItemDB.store_id == store_id,
                InventoryItemDB.current_stock > 0
            ).all()
            
            for inventory in inventory_items:
                # Calculate sales velocity (last 30 days)
                sales_count = self.db.query(SalesTransactionDB).filter(
                    SalesTransactionDB.sku_id == inventory.sku_id,
                    SalesTransactionDB.store_id == inventory.store_id,
                    SalesTransactionDB.timestamp >= cutoff_date
                ).count()
                
                # Flag as slow-moving if no sales in 30 days and significant stock
                if sales_count == 0 and inventory.current_stock > inventory.safety_stock:
                    risk = Risk(
                        risk_id=str(uuid.uuid4()),
                        risk_type=RiskType.SLOW_MOVING,
                        sku_id=inventory.sku_id,
                        store_id=inventory.store_id,
                        severity=RiskSeverity.MEDIUM,
                        risk_score=0.7,
                        estimated_impact=float(inventory.current_stock * 10),  # Rough holding cost
                        time_to_impact=timedelta(days=0),
                        description=f"No sales in 30 days with {inventory.current_stock} units in stock"
                    )
                    
                    await self._store_risk(risk)
                    risks.append(risk)
            
            logger.info("Slow-moving inventory detection completed",
                       store_id=store_id, risks_found=len(risks))
            
            return risks
            
        except Exception as e:
            logger.error("Failed to detect slow-moving inventory", 
                        store_id=store_id, error=str(e))
            raise
    
    async def get_all_risks(self, store_id: str) -> List[Risk]:
        """Get all active risks for a store"""
        
        risks_db = self.db.query(RiskDB).filter(
            RiskDB.store_id == store_id,
            RiskDB.resolved_at.is_(None)  # Only unresolved risks
        ).order_by(
            RiskDB.severity.desc(),
            RiskDB.risk_score.desc()
        ).all()
        
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
        
        return risks
    
    def _create_stockout_risk(
        self, 
        sku_id: str, 
        store_id: str, 
        inventory: InventoryItemDB,
        forecast: Optional[DemandForecastDB],
        reason: str
    ) -> Risk:
        """Create a stockout risk object"""
        
        if reason == "reorder_point":
            description = f"Stock ({inventory.current_stock}) below reorder point ({inventory.reorder_point})"
            severity = RiskSeverity.HIGH
            risk_score = 0.8
        else:
            description = f"Stockout risk detected: {reason}"
            severity = RiskSeverity.MEDIUM
            risk_score = 0.6
        
        return Risk(
            risk_id=str(uuid.uuid4()),
            risk_type=RiskType.STOCKOUT,
            sku_id=sku_id,
            store_id=store_id,
            severity=severity,
            risk_score=risk_score,
            estimated_impact=100.0,  # Simplified impact calculation
            time_to_impact=timedelta(days=1),
            description=description
        )
    
    async def _create_expiry_risk(
        self, 
        inventory: InventoryItemDB, 
        batch_data: Dict, 
        days_until_expiry: int
    ) -> Optional[Risk]:
        """Create an expiry risk object"""
        
        try:
            batch_quantity = batch_data.get('quantity', 0)
            
            if batch_quantity <= 0:
                return None
            
            # Determine severity based on days until expiry
            if days_until_expiry <= 0:
                severity = RiskSeverity.CRITICAL
                risk_score = 1.0
            elif days_until_expiry <= 1:
                severity = RiskSeverity.HIGH
                risk_score = 0.9
            elif days_until_expiry <= 2:
                severity = RiskSeverity.MEDIUM
                risk_score = 0.7
            else:
                severity = RiskSeverity.LOW
                risk_score = 0.5
            
            risk = Risk(
                risk_id=str(uuid.uuid4()),
                risk_type=RiskType.EXPIRY,
                sku_id=inventory.sku_id,
                store_id=inventory.store_id,
                severity=severity,
                risk_score=risk_score,
                estimated_impact=float(batch_quantity * 20),  # Rough loss estimate
                time_to_impact=timedelta(days=days_until_expiry),
                description=f"Batch {batch_data.get('batch_id', 'unknown')} expires in {days_until_expiry} days ({batch_quantity} units)"
            )
            
            await self._store_risk(risk)
            return risk
            
        except Exception as e:
            logger.error("Failed to create expiry risk", error=str(e))
            return None
    
    def _calculate_stockout_impact(
        self, 
        inventory: InventoryItemDB, 
        forecast: DemandForecastDB, 
        daily_demand: float
    ) -> float:
        """Calculate estimated impact of stockout"""
        
        # Get SKU selling price for revenue impact calculation
        sku = self.db.query(SKUDB).filter(
            SKUDB.sku_id == inventory.sku_id
        ).first()
        
        if not sku:
            return 100.0  # Default impact
        
        # Estimate lost revenue for 1 day of stockout
        lost_revenue = daily_demand * float(sku.selling_price)
        
        return lost_revenue
    
    def _calculate_overstock_impact(
        self, 
        inventory: InventoryItemDB, 
        forecast: DemandForecastDB, 
        weeks_of_inventory: float
    ) -> float:
        """Calculate estimated impact of overstock"""
        
        # Get SKU cost for holding cost calculation
        sku = self.db.query(SKUDB).filter(
            SKUDB.sku_id == inventory.sku_id
        ).first()
        
        if not sku:
            return 50.0  # Default impact
        
        # Estimate holding cost (simplified)
        excess_inventory = inventory.current_stock - (forecast.predicted_demand * 4)  # 4 weeks normal
        holding_cost = max(0, excess_inventory) * float(sku.unit_cost) * 0.02  # 2% monthly holding cost
        
        return holding_cost
    
    async def _store_risk(self, risk: Risk) -> None:
        """Store risk in database"""
        try:
            # Check if similar risk already exists (avoid duplicates)
            existing = self.db.query(RiskDB).filter(
                RiskDB.sku_id == risk.sku_id,
                RiskDB.store_id == risk.store_id,
                RiskDB.risk_type == risk.risk_type.value,
                RiskDB.resolved_at.is_(None)
            ).first()
            
            if existing:
                # Update existing risk
                existing.severity = risk.severity.value
                existing.risk_score = risk.risk_score
                existing.estimated_impact = risk.estimated_impact
                existing.time_to_impact_seconds = int(risk.time_to_impact.total_seconds())
                existing.description = risk.description
                existing.detected_at = datetime.utcnow()
            else:
                # Create new risk
                db_risk = RiskDB(
                    risk_id=risk.risk_id,
                    risk_type=risk.risk_type.value,
                    sku_id=risk.sku_id,
                    store_id=risk.store_id,
                    severity=risk.severity.value,
                    risk_score=risk.risk_score,
                    estimated_impact=risk.estimated_impact,
                    time_to_impact_seconds=int(risk.time_to_impact.total_seconds()),
                    description=risk.description
                )
                self.db.add(db_risk)
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to store risk", error=str(e))
            raise