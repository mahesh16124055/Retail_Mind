package com.retailmind.api.properties;

import com.retailmind.api.application.service.DemandPredictionService;
import com.retailmind.api.domain.model.DemandForecast;
import com.retailmind.api.domain.model.SalesTransaction;
import com.retailmind.api.domain.repository.RetailMindRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quicktheories.core.Gen;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.quicktheories.QuickTheory.qt;
import static org.quicktheories.generators.SourceDSL.*;

/**
 * Property-Based Tests for Demand Prediction Service
 * 
 * Property 1: Prediction Accuracy
 * For any SKU with sufficient historical sales data, 
 * the demand prediction should be reasonable and non-negative
 */
@ExtendWith(MockitoExtension.class)
public class DemandPredictionPropertiesTest {

    @Mock
    private RetailMindRepository repository;

    @InjectMocks
    private DemandPredictionService demandPredictionService;

    /**
     * Property 1: Prediction Non-Negativity
     * For any valid historical sales data, predictions must be non-negative
     */
    @Test
    public void testPredictionNonNegativity() {
        qt()
            .forAll(
                integers().between(1, 100),  // daily demand
                integers().between(7, 30)     // history days
            )
            .checkAssert((dailyDemand, historyDays) -> {
                // Generate mock sales transactions
                List<SalesTransaction> transactions = generateMockTransactions(
                    "store1", "sku1", dailyDemand, historyDays
                );
                
                when(repository.getSalesTransactions(anyString(), anyString(), anyInt()))
                    .thenReturn(transactions);
                when(repository.saveDemandForecast(any())).thenReturn(null);
                
                // Execute prediction
                DemandForecast forecast = demandPredictionService.predictDemand("sku1", "store1", 7);
                
                // Property: Prediction must be non-negative
                assertTrue(forecast.getPredictedDemand() >= 0, 
                    "Predicted demand must be non-negative");
                assertTrue(forecast.getConfidenceLower() >= 0,
                    "Confidence lower bound must be non-negative");
            });
    }

    /**
     * Property 2: Confidence Interval Validity
     * For any prediction, confidence lower <= predicted <= confidence upper
     */
    @Test
    public void testConfidenceIntervalValidity() {
        qt()
            .forAll(
                integers().between(5, 50),
                integers().between(10, 30)
            )
            .checkAssert((dailyDemand, historyDays) -> {
                List<SalesTransaction> transactions = generateMockTransactions(
                    "store1", "sku1", dailyDemand, historyDays
                );
                
                when(repository.getSalesTransactions(anyString(), anyString(), anyInt()))
                    .thenReturn(transactions);
                when(repository.saveDemandForecast(any())).thenReturn(null);
                
                DemandForecast forecast = demandPredictionService.predictDemand("sku1", "store1", 7);
                
                // Property: Lower <= Predicted <= Upper
                assertTrue(forecast.getConfidenceLower() <= forecast.getPredictedDemand(),
                    "Confidence lower must be <= predicted demand");
                assertTrue(forecast.getPredictedDemand() <= forecast.getConfidenceUpper(),
                    "Predicted demand must be <= confidence upper");
            });
    }

    /**
     * Property 3: Prediction Stability
     * Similar historical patterns should produce similar predictions
     */
    @Test
    public void testPredictionStability() {
        qt()
            .forAll(integers().between(10, 50))
            .checkAssert(dailyDemand -> {
                List<SalesTransaction> transactions1 = generateMockTransactions(
                    "store1", "sku1", dailyDemand, 30
                );
                List<SalesTransaction> transactions2 = generateMockTransactions(
                    "store1", "sku1", dailyDemand, 30
                );
                
                when(repository.getSalesTransactions(anyString(), anyString(), anyInt()))
                    .thenReturn(transactions1)
                    .thenReturn(transactions2);
                when(repository.saveDemandForecast(any())).thenReturn(null);
                
                DemandForecast forecast1 = demandPredictionService.predictDemand("sku1", "store1", 7);
                DemandForecast forecast2 = demandPredictionService.predictDemand("sku1", "store1", 7);
                
                // Property: Similar inputs produce similar outputs (within 20% tolerance)
                double difference = Math.abs(forecast1.getPredictedDemand() - forecast2.getPredictedDemand());
                double tolerance = dailyDemand * 0.2;
                assertTrue(difference <= tolerance,
                    "Similar historical patterns should produce similar predictions");
            });
    }

    /**
     * Property 4: Forecast Horizon Consistency
     * Longer horizons should not produce wildly different predictions
     */
    @Test
    public void testForecastHorizonConsistency() {
        qt()
            .forAll(integers().between(10, 50))
            .checkAssert(dailyDemand -> {
                List<SalesTransaction> transactions = generateMockTransactions(
                    "store1", "sku1", dailyDemand, 30
                );
                
                when(repository.getSalesTransactions(anyString(), anyString(), anyInt()))
                    .thenReturn(transactions);
                when(repository.saveDemandForecast(any())).thenReturn(null);
                
                DemandForecast forecast1Day = demandPredictionService.predictDemand("sku1", "store1", 1);
                DemandForecast forecast7Day = demandPredictionService.predictDemand("sku1", "store1", 7);
                
                // Property: 7-day forecast should be reasonable relative to 1-day
                // (not more than 10x different)
                double ratio = forecast7Day.getPredictedDemand() / Math.max(1, forecast1Day.getPredictedDemand());
                assertTrue(ratio <= 10.0,
                    "7-day forecast should not be more than 10x the 1-day forecast");
            });
    }

    // Helper method to generate mock sales transactions
    private List<SalesTransaction> generateMockTransactions(String storeId, String skuId, 
                                                           int avgDailyDemand, int days) {
        List<SalesTransaction> transactions = new ArrayList<>();
        
        for (int i = 0; i < days; i++) {
            SalesTransaction transaction = new SalesTransaction();
            transaction.setPk("STORE#" + storeId + "#SKU#" + skuId);
            transaction.setSk("SALE#" + Instant.now().minus(i, ChronoUnit.DAYS).toEpochMilli());
            transaction.setTransactionId(UUID.randomUUID().toString());
            transaction.setStoreId(storeId);
            transaction.setSkuId(skuId);
            
            // Add some variance (±20%)
            int quantity = (int) (avgDailyDemand * (0.8 + Math.random() * 0.4));
            transaction.setQuantity(quantity);
            transaction.setUnitPrice(50.0);
            transaction.setTotalAmount(quantity * 50.0);
            transaction.setTimestamp(Instant.now().minus(i, ChronoUnit.DAYS));
            
            transactions.add(transaction);
        }
        
        return transactions;
    }
}
