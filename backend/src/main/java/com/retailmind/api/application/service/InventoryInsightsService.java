package com.retailmind.api.application.service;

import com.retailmind.api.application.dto.InventoryInsightResponse;
import com.retailmind.api.domain.model.InventoryItem;
import com.retailmind.api.domain.model.Sku;
import com.retailmind.api.domain.repository.RetailMindRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class InventoryInsightsService {

    private final RetailMindRepository repository;
    private final BedrockGenAIService bedrockService;

    public InventoryInsightsService(RetailMindRepository repository, BedrockGenAIService bedrockService) {
        this.repository = repository;
        this.bedrockService = bedrockService;
    }

    public List<InventoryInsightResponse> getInsightsForStore(String storeId, String scenario) {
        List<InventoryInsightResponse> insights = new ArrayList<>();

        // 1. Fetch available SKUs for the store
        List<Sku> skus = repository.getSkusForStore(storeId);

        // 2. Iterate through SKUs to evaluate inventory and generate AI recommendations
        for (Sku sku : skus) {
            List<InventoryItem> items = repository.getInventoryForSku(storeId, sku.getSkuId());
            int totalStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();

            // Basic hardcoded logic for MVP (Assuming average daily demand is roughly
            // totalStock / 3 for demo)
            // In a full implementation, average daily demand would be calculated from
            // historical orders.
            int mockAverageDailyDemand = Math.max(1, totalStock / 3);

            String riskLevel = determineRiskLevel(totalStock, mockAverageDailyDemand);

            // Only generate an AI recommendation for items with High/Critical risk, or
            // randomly for the demo to save tokens.
            String aiRec = "Stock appears healthy for now.";
            if (riskLevel.equals("CRITICAL") || riskLevel.equals("HIGH") || totalStock < 5) {
                aiRec = bedrockService.generateInventoryRecommendation(
                        sku.getName(),
                        totalStock,
                        mockAverageDailyDemand,
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

        return insights;
    }

    private String determineRiskLevel(int totalStock, int dailyDemand) {
        if (totalStock == 0)
            return "CRITICAL";

        int daysOfCoverage = totalStock / dailyDemand;

        if (daysOfCoverage < 3)
            return "HIGH";
        if (daysOfCoverage < 7)
            return "MEDIUM";
        return "LOW";
    }
}
