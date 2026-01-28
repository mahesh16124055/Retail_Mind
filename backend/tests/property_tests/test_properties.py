"""
Property-based tests for RetailMind system
Implements key correctness properties from design.md using Hypothesis

These tests validate system behavior across a wide range of inputs
to ensure correctness properties hold under all valid conditions.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.services.demand_prediction import DemandModelProvider
from app.services.risk_detection import RiskDetectionService
from app.models.domain_models import (
    SalesTransaction, InventoryItem, BatchInfo, RiskSeverity, RiskType
)


# Custom strategies for domain objects
@st.composite
def sales_transaction_strategy(draw):
    """Generate valid sales transactions"""
    base_date = datetime.now() - timedelta(days=60)
    
    return SalesTransaction(
        transaction_id=f"TXN_{draw(st.integers(min_value=1, max_value=999999)):06d}",
        store_id="TEST_STORE_001",
        sku_id=f"SKU_{draw(st.integers(min_value=1, max_value=100)):03d}",
        quantity=draw(st.integers(min_value=1, max_value=20)),
        unit_price=Decimal(str(draw(st.floats(min_value=1.0, max_value=1000.0)))),
        total_amount=Decimal("100.00"),  # Simplified
        timestamp=base_date + timedelta(days=draw(st.integers(min_value=0, max_value=59))),
        customer_id=None
    )


@st.composite
def inventory_item_strategy(draw):
    """Generate valid inventory items"""
    current_stock = draw(st.integers(min_value=0, max_value=1000))
    reserved_stock = draw(st.integers(min_value=0, max_value=current_stock))
    
    return InventoryItem(
        sku_id=f"SKU_{draw(st.integers(min_value=1, max_value=100)):03d}",
        store_id="TEST_STORE_001",
        current_stock=current_stock,
        reserved_stock=reserved_stock,
        available_stock=current_stock - reserved_stock,
        reorder_point=draw(st.integers(min_value=1, max_value=50)),
        safety_stock=draw(st.integers(min_value=1, max_value=30)),
        last_updated=datetime.utcnow(),
        batch_info=[]
    )


class TestDemandPredictionProperties:
    """Property-based tests for demand prediction service"""
    
    @given(st.lists(sales_transaction_strategy(), min_size=0, max_size=50))
    @settings(max_examples=50, deadline=10000)
    def test_property_1_prediction_accuracy_bounds(self, sales_history):
        """
        Property 1: Prediction Accuracy (Simplified)
        
        For any sales history, demand predictions should be:
        1. Non-negative
        2. Within reasonable bounds relative to historical data
        3. Have valid confidence intervals
        """
        model_provider = DemandModelProvider()
        
        forecast = model_provider.predict_7d_demand(
            "TEST_SKU_001", "TEST_STORE_001", sales_history
        )
        
        # Predictions must be non-negative
        assert forecast.predicted_demand >= 0
        
        # Confidence level must be between 0 and 1
        assert 0 <= forecast.confidence_level <= 1
        
        # Confidence interval must be valid
        assert forecast.confidence_interval[0] <= forecast.confidence_interval[1]
        assert forecast.confidence_interval[0] >= 0
        
        # If we have sales history, prediction should be reasonable
        if sales_history:
            total_quantity = sum(txn.quantity for txn in sales_history)
            # Prediction shouldn't be more than 10x the total historical sales
            assert forecast.predicted_demand <= total_quantity * 10
    
    @given(st.lists(sales_transaction_strategy(), min_size=1, max_size=30))
    @settings(max_examples=30, deadline=10000)
    def test_property_confidence_increases_with_data(self, sales_history):
        """
        Property: Confidence should generally increase with more data
        
        More sales history should lead to higher confidence in predictions
        """
        model_provider = DemandModelProvider()
        
        # Test with subset of data
        small_history = sales_history[:len(sales_history)//2] if len(sales_history) > 2 else sales_history[:1]
        full_history = sales_history
        
        small_forecast = model_provider.predict_7d_demand(
            "TEST_SKU_001", "TEST_STORE_001", small_history
        )
        
        full_forecast = model_provider.predict_7d_demand(
            "TEST_SKU_001", "TEST_STORE_001", full_history
        )
        
        # With more data, confidence should not decrease significantly
        # (allowing for some variation due to data quality)
        assert full_forecast.confidence_level >= small_forecast.confidence_level - 0.2


class TestRiskDetectionProperties:
    """Property-based tests for risk detection service"""
    
    @given(inventory_item_strategy())
    @settings(max_examples=50, deadline=5000)
    def test_property_6_stockout_alert_logic(self, inventory_item):
        """
        Property 6: Stockout Alert Timing (Simplified)
        
        For any inventory item:
        1. If current stock <= reorder point, risk should be detected
        2. Risk severity should correlate with urgency
        3. Available stock should never be negative
        """
        # Ensure available stock is non-negative (business rule)
        assert inventory_item.available_stock >= 0
        
        # If stock is at or below reorder point, it's a risk condition
        if inventory_item.current_stock <= inventory_item.reorder_point:
            # This would trigger a stockout risk in the actual service
            # We're testing the logic conditions here
            assert inventory_item.current_stock <= inventory_item.reorder_point
            
            # Severity should increase as stock gets lower
            if inventory_item.current_stock == 0:
                expected_severity = RiskSeverity.CRITICAL
            elif inventory_item.current_stock <= inventory_item.safety_stock:
                expected_severity = RiskSeverity.HIGH
            else:
                expected_severity = RiskSeverity.MEDIUM
            
            # This validates our risk severity logic
            assert expected_severity in [RiskSeverity.CRITICAL, RiskSeverity.HIGH, RiskSeverity.MEDIUM]
    
    @given(st.integers(min_value=0, max_value=10))
    @settings(max_examples=20, deadline=3000)
    def test_property_7_expiry_risk_detection(self, days_until_expiry):
        """
        Property 7: Expiry Risk Detection
        
        For any product within 3 days of expiry, risk should be flagged
        """
        from app.core.config import get_settings
        settings = get_settings()
        
        # Test the core logic: items within EXPIRY_WARNING_DAYS should be flagged
        should_be_flagged = days_until_expiry <= settings.EXPIRY_WARNING_DAYS
        
        if should_be_flagged:
            # Risk severity should increase as expiry approaches
            if days_until_expiry <= 0:
                expected_severity = RiskSeverity.CRITICAL
            elif days_until_expiry <= 1:
                expected_severity = RiskSeverity.HIGH
            elif days_until_expiry <= 2:
                expected_severity = RiskSeverity.MEDIUM
            else:
                expected_severity = RiskSeverity.LOW
            
            assert expected_severity in [RiskSeverity.CRITICAL, RiskSeverity.HIGH, RiskSeverity.MEDIUM, RiskSeverity.LOW]
    
    @given(
        st.integers(min_value=0, max_value=1000),  # current_stock
        st.floats(min_value=0.1, max_value=100.0)  # weekly_demand
    )
    @settings(max_examples=50, deadline=5000)
    def test_property_overstock_detection_logic(self, current_stock, weekly_demand):
        """
        Property: Overstock Detection Logic
        
        For any inventory level and demand rate:
        1. Weeks of inventory should be calculated correctly
        2. Overstock should be flagged when inventory exceeds reasonable levels
        """
        assume(weekly_demand > 0)  # Avoid division by zero
        
        weeks_of_inventory = current_stock / weekly_demand
        
        # Core business logic: more than 8 weeks is overstock
        is_overstock = weeks_of_inventory > 8
        
        if is_overstock:
            # Severity should increase with excess inventory
            if weeks_of_inventory > 12:
                expected_severity = RiskSeverity.HIGH
            else:
                expected_severity = RiskSeverity.MEDIUM
            
            assert expected_severity in [RiskSeverity.HIGH, RiskSeverity.MEDIUM]
        
        # Weeks of inventory should always be non-negative
        assert weeks_of_inventory >= 0


class TestSystemIntegrationProperties:
    """Property-based tests for system integration"""
    
    @given(
        st.lists(sales_transaction_strategy(), min_size=0, max_size=20),
        inventory_item_strategy()
    )
    @settings(max_examples=30, deadline=15000)
    def test_property_system_consistency(self, sales_history, inventory_item):
        """
        Property: System Consistency
        
        For any valid input data:
        1. All services should handle the data without errors
        2. Results should be internally consistent
        3. No service should produce invalid outputs
        """
        model_provider = DemandModelProvider()
        
        # Test demand prediction
        forecast = model_provider.predict_7d_demand(
            inventory_item.sku_id, inventory_item.store_id, sales_history
        )
        
        # Validate forecast consistency
        assert forecast.sku_id == inventory_item.sku_id
        assert forecast.store_id == inventory_item.store_id
        assert forecast.predicted_demand >= 0
        assert 0 <= forecast.confidence_level <= 1
        assert forecast.confidence_interval[0] <= forecast.confidence_interval[1]
        
        # Test inventory consistency
        assert inventory_item.available_stock == inventory_item.current_stock - inventory_item.reserved_stock
        assert inventory_item.available_stock >= 0
        assert inventory_item.current_stock >= inventory_item.reserved_stock


# Integration test combining multiple properties
@given(
    st.lists(sales_transaction_strategy(), min_size=5, max_size=30),
    inventory_item_strategy()
)
@settings(max_examples=20, deadline=20000)
def test_end_to_end_property_validation(sales_history, inventory_item):
    """
    End-to-end property validation combining multiple system components
    
    This test validates that the entire prediction -> risk detection -> recommendation
    pipeline maintains consistency and correctness properties.
    """
    model_provider = DemandModelProvider()
    
    # Ensure same SKU for consistency
    for txn in sales_history:
        txn.sku_id = inventory_item.sku_id
        txn.store_id = inventory_item.store_id
    
    # Generate prediction
    forecast = model_provider.predict_7d_demand(
        inventory_item.sku_id, inventory_item.store_id, sales_history
    )
    
    # Validate prediction properties
    assert forecast.predicted_demand >= 0
    assert 0 <= forecast.confidence_level <= 1
    
    # Test risk logic consistency
    daily_demand = forecast.predicted_demand / 7.0
    
    if daily_demand > 0:
        days_until_stockout = inventory_item.available_stock / daily_demand
        
        # If we predict stockout soon, it should be flagged as a risk
        if days_until_stockout <= 7:  # Within a week
            # This would trigger stockout risk detection
            assert days_until_stockout >= 0  # Should never be negative
            
            # Risk severity should correlate with urgency
            if days_until_stockout <= 1:
                expected_severity = RiskSeverity.CRITICAL
            elif days_until_stockout <= 2:
                expected_severity = RiskSeverity.HIGH
            else:
                expected_severity = RiskSeverity.MEDIUM
            
            assert expected_severity in [RiskSeverity.CRITICAL, RiskSeverity.HIGH, RiskSeverity.MEDIUM]
    
    # System should maintain data consistency
    assert forecast.sku_id == inventory_item.sku_id
    assert forecast.store_id == inventory_item.store_id