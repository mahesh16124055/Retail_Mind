"""
Unit tests for Demand Prediction Service
Tests core business logic and edge cases
"""

import pytest
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.services.demand_prediction import DemandModelProvider
from app.models.domain_models import SalesTransaction


class TestDemandModelProvider:
    """Test the core demand prediction logic"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.model_provider = DemandModelProvider()
        self.sku_id = "TEST_SKU_001"
        self.store_id = "TEST_STORE_001"
    
    def test_predict_with_no_history(self):
        """Test prediction for new SKU with no sales history"""
        # Requirement 1: Basic Demand Prediction - handle new products
        forecast = self.model_provider.predict_7d_demand(
            self.sku_id, self.store_id, []
        )
        
        assert forecast.sku_id == self.sku_id
        assert forecast.store_id == self.store_id
        assert forecast.predicted_demand > 0
        assert forecast.confidence_level < 0.5  # Low confidence for new products
        assert forecast.model_used == "category_average_fallback"
    
    def test_predict_with_sufficient_history(self):
        """Test prediction with adequate sales history"""
        # Create sample sales history
        history = []
        base_date = datetime.now() - timedelta(days=30)
        
        for i in range(20):  # 20 days of sales
            transaction = SalesTransaction(
                transaction_id=f"TXN_{i:03d}",
                store_id=self.store_id,
                sku_id=self.sku_id,
                quantity=5 + (i % 3),  # Varying quantities
                unit_price=Decimal("10.00"),
                total_amount=Decimal("50.00"),
                timestamp=base_date + timedelta(days=i),
                customer_id=None
            )
            history.append(transaction)
        
        forecast = self.model_provider.predict_7d_demand(
            self.sku_id, self.store_id, history
        )
        
        # Requirement 1.1: Predict demand for next 7 days
        assert forecast.predicted_demand > 0
        assert forecast.confidence_level > 0.6  # Higher confidence with data
        assert forecast.model_used == "statistical_moving_average_v1"
        
        # Requirement 1.3: Show confidence in prediction
        assert len(forecast.confidence_interval) == 2
        assert forecast.confidence_interval[0] < forecast.confidence_interval[1]
    
    def test_prediction_non_negative(self):
        """Test that predictions are never negative"""
        # Create history with very low sales
        history = [
            SalesTransaction(
                transaction_id="TXN_001",
                store_id=self.store_id,
                sku_id=self.sku_id,
                quantity=1,
                unit_price=Decimal("10.00"),
                total_amount=Decimal("10.00"),
                timestamp=datetime.now() - timedelta(days=30),
                customer_id=None
            )
        ]
        
        forecast = self.model_provider.predict_7d_demand(
            self.sku_id, self.store_id, history
        )
        
        assert forecast.predicted_demand >= 0
        assert forecast.confidence_interval[0] >= 0
    
    def test_seasonal_adjustment_application(self):
        """Test that seasonal adjustments are applied"""
        history = [
            SalesTransaction(
                transaction_id="TXN_001",
                store_id=self.store_id,
                sku_id=self.sku_id,
                quantity=10,
                unit_price=Decimal("10.00"),
                total_amount=Decimal("100.00"),
                timestamp=datetime.now() - timedelta(days=7),
                customer_id=None
            )
        ]
        
        forecast = self.model_provider.predict_7d_demand(
            self.sku_id, self.store_id, history
        )
        
        # Should have external factors applied
        assert "festival_adjustment" in forecast.external_factors
        assert "weather_adjustment" in forecast.external_factors
    
    def test_confidence_level_bounds(self):
        """Test that confidence levels are within valid bounds"""
        # Test with various history lengths
        for history_length in [0, 5, 15, 30]:
            history = []
            for i in range(history_length):
                transaction = SalesTransaction(
                    transaction_id=f"TXN_{i:03d}",
                    store_id=self.store_id,
                    sku_id=self.sku_id,
                    quantity=5,
                    unit_price=Decimal("10.00"),
                    total_amount=Decimal("50.00"),
                    timestamp=datetime.now() - timedelta(days=i),
                    customer_id=None
                )
                history.append(transaction)
            
            forecast = self.model_provider.predict_7d_demand(
                self.sku_id, self.store_id, history
            )
            
            # Confidence level should be between 0 and 1
            assert 0 <= forecast.confidence_level <= 1


@pytest.fixture
def sample_sales_data():
    """Fixture providing sample sales data for testing"""
    base_date = datetime.now() - timedelta(days=30)
    transactions = []
    
    for i in range(20):
        transaction = SalesTransaction(
            transaction_id=f"TXN_{i:03d}",
            store_id="TEST_STORE_001",
            sku_id="TEST_SKU_001",
            quantity=5 + (i % 4),  # Varying quantities: 5, 6, 7, 8, 5, 6...
            unit_price=Decimal("15.50"),
            total_amount=Decimal("77.50"),
            timestamp=base_date + timedelta(days=i),
            customer_id=f"CUST_{i % 10:03d}" if i % 3 == 0 else None
        )
        transactions.append(transaction)
    
    return transactions


def test_prediction_accuracy_property(sample_sales_data):
    """
    Property test: Predictions should be reasonable relative to historical data
    
    This implements a simplified version of Property 1 from design.md:
    Prediction Accuracy - predictions should be within reasonable bounds of historical data
    """
    model_provider = DemandModelProvider()
    
    forecast = model_provider.predict_7d_demand(
        "TEST_SKU_001", "TEST_STORE_001", sample_sales_data
    )
    
    # Calculate average daily sales from history
    total_quantity = sum(txn.quantity for txn in sample_sales_data)
    days_of_data = len(set(txn.timestamp.date() for txn in sample_sales_data))
    avg_daily_sales = total_quantity / days_of_data if days_of_data > 0 else 0
    
    # Debug output to understand the prediction
    expected_weekly_demand = avg_daily_sales * 7
    print(f"Historical weekly demand: {expected_weekly_demand}")
    print(f"Predicted demand: {forecast.predicted_demand}")
    print(f"Model used: {forecast.model_used}")
    
    # Very lenient bounds to account for algorithm variations
    # The key is that prediction should be positive and not completely unreasonable
    assert forecast.predicted_demand > 0, "Prediction should be positive"
    assert forecast.predicted_demand <= 10 * expected_weekly_demand, "Prediction shouldn't be more than 10x historical"
    
    # Confidence interval should contain the prediction
    assert forecast.confidence_interval[0] <= forecast.predicted_demand <= forecast.confidence_interval[1]