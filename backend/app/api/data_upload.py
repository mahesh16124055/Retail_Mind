"""
Data Upload API Router - Requirement 5: Data Integration

Provides endpoints for uploading data:
- CSV file uploads for sales, inventory, and SKU data
- Sample data generation for testing
- Data validation and processing status
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import structlog

from app.core.database import get_db
from app.services.data_ingestion import DataIngestionService

logger = structlog.get_logger()
router = APIRouter()


@router.post("/upload/sales/{store_id}")
async def upload_sales_data(
    store_id: str,
    file: UploadFile = File(..., description="CSV file with sales transaction data"),
    db: Session = Depends(get_db)
):
    """
    Upload sales transaction data from CSV file.
    
    Expected CSV format:
    transaction_id,sku_id,quantity,unit_price,timestamp,customer_id
    
    Implements Requirement 5.1: Capture sales transaction data
    """
    logger.info("Uploading sales data", store_id=store_id, filename=file.filename)
    
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        # Read file content
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        # Process the data
        ingestion_service = DataIngestionService()
        result = await ingestion_service.upload_sales_csv(csv_content, store_id)
        
        logger.info("Sales data upload completed", 
                   store_id=store_id, 
                   success_count=result['success_count'],
                   error_count=result['error_count'])
        
        return {
            "message": "Sales data uploaded successfully",
            "store_id": store_id,
            "filename": file.filename,
            "processing_result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to upload sales data", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/upload/inventory/{store_id}")
async def upload_inventory_data(
    store_id: str,
    file: UploadFile = File(..., description="CSV file with inventory data"),
    db: Session = Depends(get_db)
):
    """
    Upload inventory data from CSV file.
    
    Expected CSV format:
    sku_id,current_stock,reorder_point,safety_stock,batch_id,expiry_date,batch_quantity
    
    Implements Requirement 5.2: Capture stock levels and replenishment data
    """
    logger.info("Uploading inventory data", store_id=store_id, filename=file.filename)
    
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        # Read file content
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        # Process the data
        ingestion_service = DataIngestionService()
        result = await ingestion_service.upload_inventory_csv(csv_content, store_id)
        
        logger.info("Inventory data upload completed", 
                   store_id=store_id, 
                   success_count=result['success_count'],
                   error_count=result['error_count'])
        
        return {
            "message": "Inventory data uploaded successfully",
            "store_id": store_id,
            "filename": file.filename,
            "processing_result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to upload inventory data", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/upload/sku-master")
async def upload_sku_master_data(
    file: UploadFile = File(..., description="CSV file with SKU master data"),
    db: Session = Depends(get_db)
):
    """
    Upload SKU master data from CSV file.
    
    Expected CSV format:
    sku_id,name,category,subcategory,brand,unit_cost,selling_price,shelf_life_days
    
    This data is shared across all stores.
    """
    logger.info("Uploading SKU master data", filename=file.filename)
    
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        # Read file content
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        # Process the data
        ingestion_service = DataIngestionService()
        result = await ingestion_service.upload_sku_master_csv(csv_content)
        
        logger.info("SKU master data upload completed", 
                   success_count=result['success_count'],
                   error_count=result['error_count'])
        
        return {
            "message": "SKU master data uploaded successfully",
            "filename": file.filename,
            "processing_result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to upload SKU master data", error=str(e))
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/sample-data/{store_id}")
async def generate_sample_data(
    store_id: str,
    num_skus: int = Form(20, description="Number of SKUs to generate"),
    days_of_sales: int = Form(30, description="Days of sales history to generate"),
    db: Session = Depends(get_db)
):
    """
    Generate sample data for testing and demonstration.
    
    Creates realistic sample data including:
    - Sample store
    - SKU master data
    - Inventory levels
    - Sales transaction history
    """
    logger.info("Generating sample data", 
               store_id=store_id, num_skus=num_skus, days_of_sales=days_of_sales)
    
    try:
        ingestion_service = DataIngestionService()
        
        # Create sample store
        store = await ingestion_service.create_sample_store(store_id)
        
        # Generate sample data
        sample_data = await _generate_sample_dataset(
            store_id, num_skus, days_of_sales, ingestion_service
        )
        
        logger.info("Sample data generation completed", 
                   store_id=store_id, 
                   skus_created=sample_data['skus_created'],
                   transactions_created=sample_data['transactions_created'])
        
        return {
            "message": "Sample data generated successfully",
            "store_id": store_id,
            "store_name": store.name,
            "data_generated": sample_data
        }
        
    except Exception as e:
        logger.error("Failed to generate sample data", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Sample data generation failed: {str(e)}")


@router.get("/upload-status/{store_id}")
async def get_upload_status(
    store_id: str,
    db: Session = Depends(get_db)
):
    """
    Get data upload status and statistics for a store.
    """
    logger.info("Getting upload status", store_id=store_id)
    
    try:
        from app.models.database_models import (
            InventoryItemDB, SalesTransactionDB, SKUDB
        )
        from datetime import datetime, timedelta
        
        # Count inventory items
        inventory_count = db.query(InventoryItemDB).filter(
            InventoryItemDB.store_id == store_id
        ).count()
        
        # Count sales transactions (last 30 days)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        sales_count = db.query(SalesTransactionDB).filter(
            SalesTransactionDB.store_id == store_id,
            SalesTransactionDB.timestamp >= cutoff_date
        ).count()
        
        # Count total SKUs
        sku_count = db.query(SKUDB).count()
        
        # Get latest transaction timestamp
        latest_transaction = db.query(SalesTransactionDB).filter(
            SalesTransactionDB.store_id == store_id
        ).order_by(SalesTransactionDB.timestamp.desc()).first()
        
        latest_transaction_time = None
        if latest_transaction:
            latest_transaction_time = latest_transaction.timestamp.isoformat()
        
        status = {
            "store_id": store_id,
            "data_status": {
                "inventory_items": inventory_count,
                "sales_transactions_30d": sales_count,
                "total_skus": sku_count,
                "latest_transaction": latest_transaction_time
            },
            "data_quality": {
                "has_inventory_data": inventory_count > 0,
                "has_sales_data": sales_count > 0,
                "has_sku_data": sku_count > 0,
                "ready_for_analysis": inventory_count > 0 and sku_count > 0
            },
            "last_checked": datetime.utcnow().isoformat()
        }
        
        logger.info("Upload status retrieved", 
                   store_id=store_id, 
                   inventory_items=inventory_count,
                   sales_transactions=sales_count)
        
        return status
        
    except Exception as e:
        logger.error("Failed to get upload status", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get upload status")


async def _generate_sample_dataset(
    store_id: str, 
    num_skus: int, 
    days_of_sales: int, 
    ingestion_service: DataIngestionService
) -> Dict[str, Any]:
    """Generate realistic sample dataset for testing"""
    
    import random
    from datetime import datetime, timedelta
    from decimal import Decimal
    
    # Sample product categories and names
    sample_products = [
        {"name": "Basmati Rice 1kg", "category": "Grains", "brand": "India Gate", "cost": 80, "price": 95, "shelf_life": 365},
        {"name": "Toor Dal 1kg", "category": "Pulses", "brand": "Tata Sampann", "cost": 120, "price": 140, "shelf_life": 180},
        {"name": "Sunflower Oil 1L", "category": "Oils", "brand": "Fortune", "cost": 140, "price": 165, "shelf_life": 365},
        {"name": "Wheat Flour 1kg", "category": "Grains", "brand": "Aashirvaad", "cost": 45, "price": 55, "shelf_life": 180},
        {"name": "Sugar 1kg", "category": "Sweeteners", "brand": "Dhampure", "cost": 42, "price": 50, "shelf_life": 730},
        {"name": "Tea Powder 250g", "category": "Beverages", "brand": "Tata Tea", "cost": 85, "price": 100, "shelf_life": 730},
        {"name": "Milk 1L", "category": "Dairy", "brand": "Amul", "cost": 50, "price": 60, "shelf_life": 3},
        {"name": "Bread 400g", "category": "Bakery", "brand": "Britannia", "cost": 25, "price": 30, "shelf_life": 3},
        {"name": "Biscuits 200g", "category": "Snacks", "brand": "Parle-G", "cost": 15, "price": 20, "shelf_life": 90},
        {"name": "Soap 100g", "category": "Personal Care", "brand": "Lux", "cost": 25, "price": 35, "shelf_life": 1095},
        {"name": "Shampoo 200ml", "category": "Personal Care", "brand": "Head & Shoulders", "cost": 120, "price": 150, "shelf_life": 1095},
        {"name": "Toothpaste 100g", "category": "Personal Care", "brand": "Colgate", "cost": 45, "price": 60, "shelf_life": 730},
        {"name": "Detergent 1kg", "category": "Household", "brand": "Surf Excel", "cost": 180, "price": 220, "shelf_life": 1095},
        {"name": "Salt 1kg", "category": "Spices", "brand": "Tata Salt", "cost": 18, "price": 25, "shelf_life": 1095},
        {"name": "Turmeric Powder 100g", "category": "Spices", "brand": "MDH", "cost": 35, "price": 45, "shelf_life": 365},
        {"name": "Onions 1kg", "category": "Vegetables", "brand": "Local", "cost": 25, "price": 35, "shelf_life": 14},
        {"name": "Potatoes 1kg", "category": "Vegetables", "brand": "Local", "cost": 20, "price": 30, "shelf_life": 21},
        {"name": "Tomatoes 1kg", "category": "Vegetables", "brand": "Local", "cost": 30, "price": 45, "shelf_life": 7},
        {"name": "Bananas 1kg", "category": "Fruits", "brand": "Local", "cost": 40, "price": 55, "shelf_life": 5},
        {"name": "Apples 1kg", "category": "Fruits", "brand": "Kashmir", "cost": 120, "price": 150, "shelf_life": 14}
    ]
    
    # Generate SKU master data CSV
    selected_products = random.sample(sample_products, min(num_skus, len(sample_products)))
    sku_csv_lines = ["sku_id,name,category,subcategory,brand,unit_cost,selling_price,shelf_life_days"]
    
    for i, product in enumerate(selected_products):
        sku_id = f"SKU{i+1:03d}"
        line = f"{sku_id},{product['name']},{product['category']},,{product['brand']},{product['cost']},{product['price']},{product['shelf_life']}"
        sku_csv_lines.append(line)
    
    sku_csv = "\n".join(sku_csv_lines)
    sku_result = await ingestion_service.upload_sku_master_csv(sku_csv)
    
    # Generate inventory data CSV
    inventory_csv_lines = ["sku_id,current_stock,reorder_point,safety_stock,batch_id,expiry_date,batch_quantity"]
    
    for i, product in enumerate(selected_products):
        sku_id = f"SKU{i+1:03d}"
        current_stock = random.randint(10, 200)
        reorder_point = random.randint(5, 30)
        safety_stock = random.randint(5, 20)
        
        # Generate expiry date based on shelf life
        expiry_date = (datetime.now() + timedelta(days=random.randint(1, product['shelf_life']))).date()
        batch_id = f"BATCH{i+1:03d}"
        
        line = f"{sku_id},{current_stock},{reorder_point},{safety_stock},{batch_id},{expiry_date},{current_stock}"
        inventory_csv_lines.append(line)
    
    inventory_csv = "\n".join(inventory_csv_lines)
    inventory_result = await ingestion_service.upload_inventory_csv(inventory_csv, store_id)
    
    # Generate sales transaction data CSV
    sales_csv_lines = ["transaction_id,sku_id,quantity,unit_price,timestamp,customer_id"]
    transaction_count = 0
    
    for day in range(days_of_sales):
        date = datetime.now() - timedelta(days=day)
        
        # Generate 5-20 transactions per day
        daily_transactions = random.randint(5, 20)
        
        for txn in range(daily_transactions):
            transaction_count += 1
            product = random.choice(selected_products)
            sku_id = f"SKU{selected_products.index(product)+1:03d}"
            quantity = random.randint(1, 5)
            unit_price = product['price']
            
            # Random time during the day
            timestamp = date.replace(
                hour=random.randint(8, 20),
                minute=random.randint(0, 59),
                second=random.randint(0, 59)
            )
            
            txn_id = f"TXN{transaction_count:06d}"
            customer_id = f"CUST{random.randint(1, 100):03d}" if random.random() > 0.3 else ""
            
            line = f"{txn_id},{sku_id},{quantity},{unit_price},{timestamp.isoformat()},{customer_id}"
            sales_csv_lines.append(line)
    
    sales_csv = "\n".join(sales_csv_lines)
    sales_result = await ingestion_service.upload_sales_csv(sales_csv, store_id)
    
    return {
        "skus_created": sku_result['success_count'],
        "inventory_items_created": inventory_result['success_count'],
        "transactions_created": sales_result['success_count'],
        "days_of_history": days_of_sales
    }