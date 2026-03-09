package com.retailmind.api.application.service;

import com.retailmind.api.domain.model.DemandForecast;
import com.retailmind.api.domain.model.InventoryItem;
import com.retailmind.api.domain.model.Risk;
import com.retailmind.api.domain.model.Sku;
import com.retailmind.api.domain.repository.RetailMindRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RiskDetectionService {

    private final RetailMindRepository repository;
    private final DemandPredictionService demandPredictionService;
    private final DatabaseConfigService databaseConfigService;
    private final MockDataGeneratorService mockDataGeneratorService;

    public RiskDetectionService(RetailMindRepository repository, 
                                 DemandPredictionService demandPredictionService,
                                 DatabaseConfigService databaseConfigService,
                                 MockDataGeneratorService mockDataGeneratorService) {
        this.repository = repository;
        this.demandPredictionService = demandPredictionService;
        this.databaseConfigService = databaseConfigService;
        this.mockDataGeneratorService = mockDataGeneratorService;
    }

    /**
     * Detect all risks for a store
     * In Mock mode, generates sample risks instead of querying database
     */
    public List<Risk> detectAllRisks(String storeId) {
        // Check data mode - in Mock mode, generate sample data
        if (databaseConfigService.isMockMode()) {
            return mockDataGeneratorService.generateMockRisks(storeId, 5);
        }
        
        // Production mode - fetch from database
        List<Risk> allRisks = new ArrayList<>();
        
        List<Sku> skus = repository.getSkusForStore(storeId);
        
        for (Sku sku : skus) {
            // Detect stockout risk
            Risk stockoutRisk = detectStockoutRisk(sku.getSkuId(), storeId);
            if (stockoutRisk != null) {
                allRisks.add(stockoutRisk);
            }
            
            // Detect expiry risks
            allRisks.addAll(detectExpiryRisk(sku.getSkuId(), storeId));
            
            // Detect overstock risk
            Risk overstockRisk = detectOverstockRisk(sku.getSkuId(), storeId);
            if (overstockRisk != null) {
                allRisks.add(overstockRisk);
            }
        }
        
        return allRisks;
    }

    /**
     * Detect stockout risk for a specific SKU
     * Property 6: Stockout Alert Timing - alerts 24-48 hours before expected stockout
     */
    public Risk detectStockoutRisk(String skuId, String storeId) {
        List<InventoryItem> items = repository.getInventoryForSku(storeId, skuId);
        int totalStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();
        
        // Get demand forecast
        DemandForecast forecast = demandPredictionService.predictDemand(skuId, storeId, 1);
        double dailyDemand = forecast.getPredictedDemand();
        
        if (dailyDemand <= 0) {
            return null; // No risk if no demand
        }
        
        // Calculate days until stockout
        double daysUntilStockout = totalStock / dailyDemand;
        
        // Only create risk if stockout is within 7 days
        if (daysUntilStockout > 7) {
            return null;
        }
        
        String severity;
        double riskScore;
        
        if (daysUntilStockout <= 1) {
            severity = "CRITICAL";
            riskScore = 0.95;
        } else if (daysUntilStockout <= 2) {
            severity = "HIGH";
            riskScore = 0.75;
        } else if (daysUntilStockout <= 4) {
            severity = "MEDIUM";
            riskScore = 0.50;
        } else {
            severity = "LOW";
            riskScore = 0.25;
        }
        
        Risk risk = new Risk();
        risk.setPk("STORE#" + storeId);
        risk.setSk("RISK#" + UUID.randomUUID().toString());
        risk.setRiskId(UUID.randomUUID().toString());
        risk.setRiskType("STOCKOUT");
        risk.setSkuId(skuId);
        risk.setStoreId(storeId);
        risk.setSeverity(severity);
        risk.setRiskScore(riskScore);
        risk.setEstimatedImpact(dailyDemand * 100.0); // Estimated revenue loss per day
        risk.setTimeToImpactSeconds((long) (daysUntilStockout * 24 * 3600));
        risk.setDetectedAt(Instant.now());
        risk.setStatus("ACTIVE");
        
        // Save risk to DynamoDB
        repository.saveRisk(risk);
        
        return risk;
    }

    /**
     * Detect expiry risks for products approaching expiration
     * Property 7: Expiry Risk Detection - flag products based on demand velocity and shelf life
     */
    public List<Risk> detectExpiryRisk(String skuId, String storeId) {
        List<Risk> expiryRisks = new ArrayList<>();
        List<InventoryItem> items = repository.getInventoryForSku(storeId, skuId);
        
        // Get demand forecast
        DemandForecast forecast = demandPredictionService.predictDemand(skuId, storeId, 1);
        double dailyDemand = forecast.getPredictedDemand();
        
        for (InventoryItem item : items) {
            if (item.getExpiryDate() == null || item.getExpiryDate().isEmpty()) {
                continue;
            }
            
            try {
                LocalDate expiryDate = LocalDate.parse(item.getExpiryDate());
                long daysUntilExpiry = ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
                
                if (daysUntilExpiry < 0) {
                    continue; // Already expired
                }
                
                // Calculate if stock will sell before expiry
                double daysToSellOut = dailyDemand > 0 ? item.getQuantity() / dailyDemand : Double.MAX_VALUE;
                
                // Risk if product won't sell before expiry
                if (daysToSellOut > daysUntilExpiry && daysUntilExpiry <= 7) {
                    String severity;
                    double riskScore;
                    
                    if (daysUntilExpiry <= 1) {
                        severity = "CRITICAL";
                        riskScore = 0.95;
                    } else if (daysUntilExpiry <= 3) {
                        severity = "HIGH";
                        riskScore = 0.75;
                    } else if (daysUntilExpiry <= 5) {
                        severity = "MEDIUM";
                        riskScore = 0.50;
                    } else {
                        severity = "LOW";
                        riskScore = 0.25;
                    }
                    
                    Risk risk = new Risk();
                    risk.setPk("STORE#" + storeId);
                    risk.setSk("RISK#" + UUID.randomUUID().toString());
                    risk.setRiskId(UUID.randomUUID().toString());
                    risk.setRiskType("EXPIRY");
                    risk.setSkuId(skuId);
                    risk.setStoreId(storeId);
                    risk.setSeverity(severity);
                    risk.setRiskScore(riskScore);
                    risk.setEstimatedImpact((double) item.getQuantity() * 50.0); // Estimated loss value
                    risk.setTimeToImpactSeconds(daysUntilExpiry * 24 * 3600);
                    risk.setDetectedAt(Instant.now());
                    risk.setStatus("ACTIVE");
                    
                    repository.saveRisk(risk);
                    expiryRisks.add(risk);
                }
            } catch (Exception e) {
                // Skip invalid expiry dates
                continue;
            }
        }
        
        return expiryRisks;
    }

    /**
     * Detect overstock situations
     * Property 9: Slow-Moving Stock Identification
     */
    public Risk detectOverstockRisk(String skuId, String storeId) {
        List<InventoryItem> items = repository.getInventoryForSku(storeId, skuId);
        int totalStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();
        
        // Get demand forecast
        DemandForecast forecast = demandPredictionService.predictDemand(skuId, storeId, 1);
        double dailyDemand = forecast.getPredictedDemand();
        
        if (dailyDemand <= 0) {
            return null;
        }
        
        // Calculate inventory turnover (days of stock)
        double daysOfStock = totalStock / dailyDemand;
        
        // Overstock if more than 30 days of inventory
        if (daysOfStock <= 30) {
            return null;
        }
        
        String severity;
        double riskScore;
        
        if (daysOfStock > 90) {
            severity = "HIGH";
            riskScore = 0.80;
        } else if (daysOfStock > 60) {
            severity = "MEDIUM";
            riskScore = 0.60;
        } else {
            severity = "LOW";
            riskScore = 0.40;
        }
        
        Risk risk = new Risk();
        risk.setPk("STORE#" + storeId);
        risk.setSk("RISK#" + UUID.randomUUID().toString());
        risk.setRiskId(UUID.randomUUID().toString());
        risk.setRiskType("OVERSTOCK");
        risk.setSkuId(skuId);
        risk.setStoreId(storeId);
        risk.setSeverity(severity);
        risk.setRiskScore(riskScore);
        risk.setEstimatedImpact(totalStock * 10.0); // Estimated capital tied up
        risk.setTimeToImpactSeconds(0L); // Already impacting
        risk.setDetectedAt(Instant.now());
        risk.setStatus("ACTIVE");
        
        repository.saveRisk(risk);
        
        return risk;
    }

    /**
     * Calculate overall risk score for a SKU
     */
    public double calculateRiskScore(String skuId, String storeId) {
        Risk stockoutRisk = detectStockoutRisk(skuId, storeId);
        List<Risk> expiryRisks = detectExpiryRisk(skuId, storeId);
        Risk overstockRisk = detectOverstockRisk(skuId, storeId);
        
        double maxRiskScore = 0.0;
        
        if (stockoutRisk != null) {
            maxRiskScore = Math.max(maxRiskScore, stockoutRisk.getRiskScore());
        }
        
        for (Risk risk : expiryRisks) {
            maxRiskScore = Math.max(maxRiskScore, risk.getRiskScore());
        }
        
        if (overstockRisk != null) {
            maxRiskScore = Math.max(maxRiskScore, overstockRisk.getRiskScore());
        }
        
        return maxRiskScore;
    }
}
