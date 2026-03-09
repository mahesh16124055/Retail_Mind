package com.retailmind.api.application.service;

import com.retailmind.api.application.dto.InventoryInsightResponse;
import com.retailmind.api.domain.model.DemandForecast;
import com.retailmind.api.domain.model.InventoryItem;
import com.retailmind.api.domain.model.Risk;
import com.retailmind.api.domain.model.Sku;
import com.retailmind.api.domain.repository.RetailMindRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class InventoryInsightsService {

    private final RetailMindRepository repository;
    private final BedrockGenAIService bedrockService;
    private final DemandPredictionService demandPredictionService;
    private final RiskDetectionService riskDetectionService;

    public InventoryInsightsService(RetailMindRepository repository, 
                                   BedrockGenAIService bedrockService,
                                   DemandPredictionService demandPredictionService,
                                   RiskDetectionService riskDetectionService) {
        this.repository = repository;
        this.bedrockService = bedrockService;
        this.demandPredictionService = demandPredictionService;
        this.riskDetectionService = riskDetectionService;
    }

    public List<InventoryInsightResponse> getInsightsForStore(String storeId, String scenario) {
        List<InventoryInsightResponse> insights = new ArrayList<>();

        // 1. Fetch available SKUs for the store
        List<Sku> skus = repository.getSkusForStore(storeId);

        // 2. Iterate through SKUs to evaluate inventory and generate AI recommendations
        for (Sku sku : skus) {
            List<InventoryItem> items = repository.getInventoryForSku(storeId, sku.getSkuId());
            int totalStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();

            // Get real demand prediction
            DemandForecast forecast = demandPredictionService.predictDemand(sku.getSkuId(), storeId, 1);
            int predictedDailyDemand = forecast.getPredictedDemand().intValue();

            // Detect risks
            Risk stockoutRisk = riskDetectionService.detectStockoutRisk(sku.getSkuId(), storeId);
            List<Risk> expiryRisks = riskDetectionService.detectExpiryRisk(sku.getSkuId(), storeId);
            Risk overstockRisk = riskDetectionService.detectOverstockRisk(sku.getSkuId(), storeId);

            // Determine overall risk level
            String riskLevel = determineOverallRiskLevel(stockoutRisk, expiryRisks, overstockRisk);

            // Generate AI recommendation for high-risk items
            String aiRec = "Stock appears healthy for now.";
            if (riskLevel.equals("CRITICAL") || riskLevel.equals("HIGH") || totalStock < 10) {
                aiRec = bedrockService.generateInventoryRecommendation(
                        sku.getName(),
                        totalStock,
                        predictedDailyDemand,
                        scenario);
            }

            insights.add(InventoryInsightResponse.builder()
                    .skuId(sku.getSkuId())
                    .skuName(sku.getName())
                    .currentStock(totalStock)
                    .riskLevel(riskLevel)
                    .aiRecommendation(aiRec)
                    .build());
        }

        // Deduplicate by SKU name - keep first occurrence
        List<InventoryInsightResponse> deduplicated = new ArrayList<>();
        for (InventoryInsightResponse insight : insights) {
            boolean exists = deduplicated.stream()
                    .anyMatch(i -> i.getSkuName().equals(insight.getSkuName()));
            if (!exists) {
                deduplicated.add(insight);
            }
        }

        return deduplicated;
    }

    private String determineOverallRiskLevel(Risk stockoutRisk, List<Risk> expiryRisks, Risk overstockRisk) {
        // Priority: CRITICAL > HIGH > MEDIUM > LOW
        if (stockoutRisk != null && "CRITICAL".equals(stockoutRisk.getSeverity())) {
            return "CRITICAL";
        }
        
        for (Risk expiryRisk : expiryRisks) {
            if ("CRITICAL".equals(expiryRisk.getSeverity())) {
                return "CRITICAL";
            }
        }
        
        if (stockoutRisk != null && "HIGH".equals(stockoutRisk.getSeverity())) {
            return "HIGH";
        }
        
        for (Risk expiryRisk : expiryRisks) {
            if ("HIGH".equals(expiryRisk.getSeverity())) {
                return "HIGH";
            }
        }
        
        if (stockoutRisk != null && "MEDIUM".equals(stockoutRisk.getSeverity())) {
            return "MEDIUM";
        }
        
        for (Risk expiryRisk : expiryRisks) {
            if ("MEDIUM".equals(expiryRisk.getSeverity())) {
                return "MEDIUM";
            }
        }
        
        if (overstockRisk != null) {
            return overstockRisk.getSeverity();
        }
        
        return "LOW";
    }
}
