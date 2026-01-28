"""
Data Ingestion Service - Requirement 5: Data Integration

Handles data upload and processing from various sources:
- CSV file uploads for sales and inventory data
- POS system integration (future)
- External data sources (weather, festivals)

Designed for easy extension to AWS services (S3, Lambda, Kinesis).
"""

import csv
import io
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from decimal import Decimal
import structlog
import uuid

from app.models.domain_models import (
    Store, SKU, InventoryItem, SalesTransaction, 
    StoreType, StorageRequirements, GeoLocation, TimeRange, BatchInfo
)
from app.models.database_models import (
    StoreDB, SKUDB, InventoryItemDB, SalesTransactionDB
)
from app.core.database import SessionLocal

logger = structlog.get_logger()


class DataIngestionService:
    """
    Service for ingesting data from multiple sources.
    
    Implements Requirement 5: Data Integration
    - WHEN connecting to POS systems, THE Platform SHALL capture sales transaction data
    - WHEN connecting to inventory systems, THE Platform SHALL capture stock levels
    - WHEN data comes from multiple sources, THE Platform SHALL handle different formats
    """
    
    def __init__(self):
        self.db = SessionLocal()
    
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()
    
    async def upload_sales_csv(self, csv_content: str, store_id: str) -> Dict[str, Any]:
        """
        Upload sales data from CSV file.
        
        Expected CSV format:
        transaction_id,sku_id,quantity,unit_price,timestamp,customer_id
        
        Returns processing summary with success/error counts.
        """
        logger.info("Processing sales CSV upload", store_id=store_id)
        
        try:
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            transactions = []
            errors = []
            
            for row_num, row in enumerate(csv_reader, 1):
                try:
                    # Parse and validate transaction data
                    transaction = self._parse_sales_row(row, store_id)
                    transactions.append(transaction)
                    
                except Exception as e:
                    errors.append({
                        "row": row_num,
                        "error": str(e),
                        "data": row
                    })
                    logger.warning("Failed to parse sales row", 
                                 row=row_num, error=str(e))
            
            # Bulk insert valid transactions
            success_count = 0
            if transactions:
                success_count = await self._bulk_insert_sales(transactions)
            
            logger.info("Sales CSV processing completed",
                       total_rows=len(transactions) + len(errors),
                       success_count=success_count,
                       error_count=len(errors))
            
            return {
                "status": "completed",
                "total_rows": len(transactions) + len(errors),
                "success_count": success_count,
                "error_count": len(errors),
                "errors": errors[:10]  # Return first 10 errors
            }
            
        except Exception as e:
            logger.error("Failed to process sales CSV", error=str(e))
            raise
    
    async def upload_inventory_csv(self, csv_content: str, store_id: str) -> Dict[str, Any]:
        """
        Upload inventory data from CSV file.
        
        Expected CSV format:
        sku_id,current_stock,reorder_point,safety_stock,batch_id,expiry_date,batch_quantity
        
        Returns processing summary.
        """
        logger.info("Processing inventory CSV upload", store_id=store_id)
        
        try:
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            inventory_items = []
            errors = []
            
            for row_num, row in enumerate(csv_reader, 1):
                try:
                    inventory_item = self._parse_inventory_row(row, store_id)
                    inventory_items.append(inventory_item)
                    
                except Exception as e:
                    errors.append({
                        "row": row_num,
                        "error": str(e),
                        "data": row
                    })
                    logger.warning("Failed to parse inventory row",
                                 row=row_num, error=str(e))
            
            # Bulk upsert inventory items
            success_count = 0
            if inventory_items:
                success_count = await self._bulk_upsert_inventory(inventory_items)
            
            logger.info("Inventory CSV processing completed",
                       total_rows=len(inventory_items) + len(errors),
                       success_count=success_count,
                       error_count=len(errors))
            
            return {
                "status": "completed",
                "total_rows": len(inventory_items) + len(errors),
                "success_count": success_count,
                "error_count": len(errors),
                "errors": errors[:10]
            }
            
        except Exception as e:
            logger.error("Failed to process inventory CSV", error=str(e))
            raise
    
    async def upload_sku_master_csv(self, csv_content: str) -> Dict[str, Any]:
        """
        Upload SKU master data from CSV file.
        
        Expected CSV format:
        sku_id,name,category,subcategory,brand,unit_cost,selling_price,shelf_life_days
        """
        logger.info("Processing SKU master CSV upload")
        
        try:
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            skus = []
            errors = []
            
            for row_num, row in enumerate(csv_reader, 1):
                try:
                    sku = self._parse_sku_row(row)
                    skus.append(sku)
                    
                except Exception as e:
                    errors.append({
                        "row": row_num,
                        "error": str(e),
                        "data": row
                    })
                    logger.warning("Failed to parse SKU row",
                                 row=row_num, error=str(e))
            
            # Bulk upsert SKUs
            success_count = 0
            if skus:
                success_count = await self._bulk_upsert_skus(skus)
            
            logger.info("SKU master CSV processing completed",
                       total_rows=len(skus) + len(errors),
                       success_count=success_count,
                       error_count=len(errors))
            
            return {
                "status": "completed",
                "total_rows": len(skus) + len(errors),
                "success_count": success_count,
                "error_count": len(errors),
                "errors": errors[:10]
            }
            
        except Exception as e:
            logger.error("Failed to process SKU master CSV", error=str(e))
            raise
    
    def _parse_sales_row(self, row: Dict[str, str], store_id: str) -> SalesTransaction:
        """Parse a single sales CSV row into SalesTransaction model"""
        return SalesTransaction(
            transaction_id=row['transaction_id'],
            store_id=store_id,
            sku_id=row['sku_id'],
            quantity=int(row['quantity']),
            unit_price=Decimal(row['unit_price']),
            total_amount=Decimal(row['unit_price']) * int(row['quantity']),
            timestamp=datetime.fromisoformat(row['timestamp']),
            customer_id=row.get('customer_id') or None
        )
    
    def _parse_inventory_row(self, row: Dict[str, str], store_id: str) -> InventoryItem:
        """Parse a single inventory CSV row into InventoryItem model"""
        current_stock = int(row['current_stock'])
        reserved_stock = int(row.get('reserved_stock', 0))
        
        # Parse batch information if provided
        batch_info = []
        if row.get('batch_id') and row.get('expiry_date'):
            batch_info.append(BatchInfo(
                batch_id=row['batch_id'],
                expiry_date=date.fromisoformat(row['expiry_date']),
                quantity=int(row.get('batch_quantity', current_stock)),
                cost_per_unit=Decimal(row.get('batch_cost', '0.00'))
            ))
        
        return InventoryItem(
            sku_id=row['sku_id'],
            store_id=store_id,
            current_stock=current_stock,
            reserved_stock=reserved_stock,
            available_stock=current_stock - reserved_stock,
            reorder_point=int(row['reorder_point']),
            safety_stock=int(row['safety_stock']),
            batch_info=batch_info
        )
    
    def _parse_sku_row(self, row: Dict[str, str]) -> SKU:
        """Parse a single SKU CSV row into SKU model"""
        return SKU(
            sku_id=row['sku_id'],
            name=row['name'],
            category=row['category'],
            subcategory=row.get('subcategory', ''),
            brand=row.get('brand', ''),
            unit_cost=Decimal(row['unit_cost']),
            selling_price=Decimal(row['selling_price']),
            shelf_life_days=int(row['shelf_life_days']),
            storage_requirements=StorageRequirements(
                requires_refrigeration=row.get('requires_refrigeration', '').lower() == 'true',
                requires_freezing=row.get('requires_freezing', '').lower() == 'true'
            )
        )
    
    async def _bulk_insert_sales(self, transactions: List[SalesTransaction]) -> int:
        """Bulk insert sales transactions into database"""
        try:
            db_transactions = []
            for txn in transactions:
                db_txn = SalesTransactionDB(
                    transaction_id=txn.transaction_id,
                    store_id=txn.store_id,
                    sku_id=txn.sku_id,
                    quantity=txn.quantity,
                    unit_price=txn.unit_price,
                    total_amount=txn.total_amount,
                    timestamp=txn.timestamp,
                    customer_id=txn.customer_id
                )
                db_transactions.append(db_txn)
            
            self.db.bulk_save_objects(db_transactions)
            self.db.commit()
            
            return len(db_transactions)
            
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to bulk insert sales transactions", error=str(e))
            raise
    
    async def _bulk_upsert_inventory(self, inventory_items: List[InventoryItem]) -> int:
        """Bulk upsert inventory items into database"""
        try:
            success_count = 0
            
            for item in inventory_items:
                # Check if inventory item exists
                existing = self.db.query(InventoryItemDB).filter(
                    InventoryItemDB.sku_id == item.sku_id,
                    InventoryItemDB.store_id == item.store_id
                ).first()
                
                if existing:
                    # Update existing item
                    existing.current_stock = item.current_stock
                    existing.reserved_stock = item.reserved_stock
                    existing.available_stock = item.available_stock
                    existing.reorder_point = item.reorder_point
                    existing.safety_stock = item.safety_stock
                    existing.batch_info = [self._serialize_batch_info(batch) for batch in item.batch_info]
                    existing.last_updated = datetime.utcnow()
                else:
                    # Create new item
                    db_item = InventoryItemDB(
                        sku_id=item.sku_id,
                        store_id=item.store_id,
                        current_stock=item.current_stock,
                        reserved_stock=item.reserved_stock,
                        available_stock=item.available_stock,
                        reorder_point=item.reorder_point,
                        safety_stock=item.safety_stock,
                        batch_info=[self._serialize_batch_info(batch) for batch in item.batch_info]
                    )
                    self.db.add(db_item)
                
                success_count += 1
            
            self.db.commit()
            return success_count
            
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to bulk upsert inventory items", error=str(e))
            raise
    
    def _serialize_batch_info(self, batch: BatchInfo) -> Dict[str, Any]:
        """Serialize BatchInfo to JSON-compatible dict"""
        return {
            "batch_id": batch.batch_id,
            "expiry_date": batch.expiry_date.isoformat(),  # Convert date to string
            "quantity": batch.quantity,
            "cost_per_unit": float(batch.cost_per_unit)  # Convert Decimal to float
        }
    
    async def _bulk_upsert_skus(self, skus: List[SKU]) -> int:
        """Bulk upsert SKUs into database"""
        try:
            success_count = 0
            
            for sku in skus:
                # Check if SKU exists
                existing = self.db.query(SKUDB).filter(
                    SKUDB.sku_id == sku.sku_id
                ).first()
                
                if existing:
                    # Update existing SKU
                    existing.name = sku.name
                    existing.category = sku.category
                    existing.subcategory = sku.subcategory
                    existing.brand = sku.brand
                    existing.unit_cost = sku.unit_cost
                    existing.selling_price = sku.selling_price
                    existing.shelf_life_days = sku.shelf_life_days
                    existing.storage_requirements = sku.storage_requirements.dict()
                    existing.updated_at = datetime.utcnow()
                else:
                    # Create new SKU
                    db_sku = SKUDB(
                        sku_id=sku.sku_id,
                        name=sku.name,
                        category=sku.category,
                        subcategory=sku.subcategory,
                        brand=sku.brand,
                        unit_cost=sku.unit_cost,
                        selling_price=sku.selling_price,
                        shelf_life_days=sku.shelf_life_days,
                        storage_requirements=sku.storage_requirements.dict()
                    )
                    self.db.add(db_sku)
                
                success_count += 1
            
            self.db.commit()
            return success_count
            
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to bulk upsert SKUs", error=str(e))
            raise
    
    async def create_sample_store(self, store_id: str = "STORE001") -> Store:
        """Create a sample kirana store for MVP testing"""
        sample_store = Store(
            store_id=store_id,
            name="Sample Kirana Store",
            location=GeoLocation(
                latitude=28.6139,
                longitude=77.2090,
                address="123 Main Street",
                city="New Delhi",
                state="Delhi",
                pincode="110001"
            ),
            store_type=StoreType.KIRANA,
            capacity_constraints={"max_items": 1000, "storage_sqft": 500},
            operating_hours=TimeRange(start_time="08:00", end_time="22:00")
        )
        
        # Check if store already exists
        existing = self.db.query(StoreDB).filter(
            StoreDB.store_id == store_id
        ).first()
        
        if not existing:
            db_store = StoreDB(
                store_id=sample_store.store_id,
                name=sample_store.name,
                store_type=sample_store.store_type.value,
                location_data=sample_store.location.dict(),
                capacity_constraints=sample_store.capacity_constraints,
                operating_hours=sample_store.operating_hours.dict()
            )
            self.db.add(db_store)
            self.db.commit()
            
            logger.info("Created sample store", store_id=store_id)
        
        return sample_store