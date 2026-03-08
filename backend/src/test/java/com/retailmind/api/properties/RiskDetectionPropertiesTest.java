package com.retailmind.api.properties;

import com.retailmind.api.application.service.DemandPredictionService;
import com.retailmind.api.application.service.RiskDetectionService;
import com.retailmind.api.domain.model.DemandForecast;
import com.retailmind.api.domain.model.InventoryItem;
import com.retailmind.api.domain.model.Risk;
import com.retailmind.api.domain.repository.RetailMindRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.quicktheories.QuickTheory.qt;
import static org.quicktheories.generators.SourceDSL.*;

/**
 * Property-Based Tests for Risk Detection Service
 * 
 * Property 6: Stockout Alert Timing
 * Property 7: Expiry Risk Detection
 * Property 9: Slow-Moving Stock Identification
 */
@ExtendWith(MockitoExtension.class)
public class RiskDetectionPropertiesTest {

    @Mock
    private RetailMindRepository repository;

    @Mock
    private DemandPredictionService demandPredictionService;

    @InjectMocks
    private RiskDetectionService riskDetectionService;

    /**
     * Property 6: Stockout Risk Severity
     * For any inventory level and demand, risk severity should be appropriate
     */
    @Test
    public void testStockoutRiskSeverity() {
        qt()
            .forAll(
                integers().between(0, 10),   // current stock
                integers().between(1, 5)      // daily demand
            )
            .checkAssert((stock, demand) -> {
                List<InventoryItem> items = createMockInventory("store1", "sku1", stock);
                DemandForecast forecast = createMockForecast("sku1", "store1", demand);
                
                when(repository.getInventoryForSku(anyString(), anyString())).thenReturn(items);
                when(demandPredictionService.predictDemand(anyString(), anyString(), anyInt()))
                    .thenReturn(forecast);
                when(repository.saveRisk(any())).thenReturn(null);
                
                Risk risk = riskDetectionService.detectStockoutRisk("sku1", "store1");
                
                double daysUntilStockout = (double) stock / demand;
                
                if (daysUntilStockout <= 1 && risk != null) {
                    assertEquals("CRITICAL", risk.getSeverity(),
                        "Stock running out in 1 day should be CRITICAL");
                } else if (daysUntilStockout <= 2 && risk != null) {
                    assertEquals("HIGH", risk.getSeverity(),
                        "Stock running out in 2 days should be HIGH");
                }
                
                // Property: Risk score should be between 0 and 1
                if (risk != null) {
                    assertTrue(risk.getRiskScore() >= 0 && risk.getRiskScore() <= 1,
                        "Risk score must be between 0 and 1");
                }
            });
    }

    /**
     * Property 7: Expiry Risk Detection Logic
     * Products near expiry with low demand velocity should be flagged
     */
    @Test
    public void testExpiryRiskDetection() {
        qt()
            .forAll(
                integers().between(1, 7),    // days until expiry
                integers().between(10, 50),  // quantity
                integers().between(1, 5)     // daily demand
            )
            .checkAssert((daysToExpiry, quantity, demand) -> {
                LocalDate expiryDate = LocalDate.now().plusDays(daysToExpiry);
                List<InventoryItem> items = createMockInventoryWithExpiry(
                    "store1", "sku1", quantity, expiryDate.toString()
                );
                DemandForecast forecast = createMockForecast("sku1", "store1", demand);
                
                when(repository.getInventoryForSku(anyString(), anyString())).thenReturn(items);
                when(demandPredictionService.predictDemand(anyString(), anyString(), anyInt()))
                    .thenReturn(forecast);
                when(repository.saveRisk(any())).thenReturn(null);
                
                List<Risk> risks = riskDetectionService.detectExpiryRisk("sku1", "store1");
                
                double daysToSellOut = (double) quantity / demand;
                
                // Property: If product won't sell before expiry, risk should be detected
                if (daysToSellOut > daysToExpiry && daysToExpiry <= 7) {
                    assertFalse(risks.isEmpty(),
                        "Expiry risk should be detected when product won't sell before expiry");
                    
                    Risk risk = risks.get(0);
                    assertEquals("EXPIRY", risk.getRiskType());
                    
                    if (daysToExpiry <= 1) {
                        assertEquals("CRITICAL", risk.getSeverity());
                    }
                }
            });
    }

    /**
     * Property 9: Overstock Detection
     * High inventory relative to demand should be flagged as overstock
     */
    @Test
    public void testOverstockDetection() {
        qt()
            .forAll(
                integers().between(100, 500),  // high stock
                integers().between(1, 5)        // low daily demand
            )
            .checkAssert((stock, demand) -> {
                List<InventoryItem> items = createMockInventory("store1", "sku1", stock);
                DemandForecast forecast = createMockForecast("sku1", "store1", demand);
                
                when(repository.getInventoryForSku(anyString(), anyString())).thenReturn(items);
                when(demandPredictionService.predictDemand(anyString(), anyString(), anyInt()))
                    .thenReturn(forecast);
                when(repository.saveRisk(any())).thenReturn(null);
                
                Risk risk = riskDetectionService.detectOverstockRisk("sku1", "store1");
                
                double daysOfStock = (double) stock / demand;
                
                // Property: More than 30 days of stock should trigger overstock risk
                if (daysOfStock > 30) {
                    assertNotNull(risk, "Overstock risk should be detected for >30 days inventory");
                    assertEquals("OVERSTOCK", risk.getRiskType());
                    assertTrue(risk.getRiskScore() >= 0.4,
                        "Overstock should have meaningful risk score");
                }
            });
    }

    /**
     * Property: Risk Score Monotonicity
     * Higher risk situations should have higher risk scores
     */
    @Test
    public void testRiskScoreMonotonicity() {
        qt()
            .forAll(
                integers().between(1, 5),
                integers().between(5, 10)
            )
            .checkAssert((lowStock, highStock) -> {
                int demand = 3;
                
                // Low stock scenario
                List<InventoryItem> lowStockItems = createMockInventory("store1", "sku1", lowStock);
                DemandForecast forecast = createMockForecast("sku1", "store1", demand);
                
                when(repository.getInventoryForSku(anyString(), anyString())).thenReturn(lowStockItems);
                when(demandPredictionService.predictDemand(anyString(), anyString(), anyInt()))
                    .thenReturn(forecast);
                when(repository.saveRisk(any())).thenReturn(null);
                
                Risk lowStockRisk = riskDetectionService.detectStockoutRisk("sku1", "store1");
                
                // High stock scenario
                List<InventoryItem> highStockItems = createMockInventory("store1", "sku1", highStock);
                when(repository.getInventoryForSku(anyString(), anyString())).thenReturn(highStockItems);
                
                Risk highStockRisk = riskDetectionService.detectStockoutRisk("sku1", "store1");
                
                // Property: Lower stock should have higher risk score
                if (lowStockRisk != null && highStockRisk != null) {
                    assertTrue(lowStockRisk.getRiskScore() >= highStockRisk.getRiskScore(),
                        "Lower stock should have higher or equal risk score");
                }
            });
    }

    // Helper methods
    private List<InventoryItem> createMockInventory(String storeId, String skuId, int quantity) {
        List<InventoryItem> items = new ArrayList<>();
        InventoryItem item = new InventoryItem();
        item.setPk("STORE#" + storeId + "#SKU#" + skuId);
        item.setSk("BATCH#" + UUID.randomUUID().toString());
        item.setStoreId(storeId);
        item.setSkuId(skuId);
        item.setQuantity(quantity);
        items.add(item);
        return items;
    }

    private List<InventoryItem> createMockInventoryWithExpiry(String storeId, String skuId, 
                                                              int quantity, String expiryDate) {
        List<InventoryItem> items = createMockInventory(storeId, skuId, quantity);
        items.get(0).setExpiryDate(expiryDate);
        return items;
    }

    private DemandForecast createMockForecast(String skuId, String storeId, double demand) {
        DemandForecast forecast = new DemandForecast();
        forecast.setSkuId(skuId);
        forecast.setStoreId(storeId);
        forecast.setPredictedDemand(demand);
        forecast.setConfidenceLower(demand * 0.8);
        forecast.setConfidenceUpper(demand * 1.2);
        forecast.setModelUsed("MOCK");
        return forecast;
    }
}
