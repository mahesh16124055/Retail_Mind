package com.retailmind.api.application.service;

import com.retailmind.api.application.dto.FinancialImpactResponse;
import com.retailmind.api.domain.model.DemandForecast;
import com.retailmind.api.domain.model.InventoryItem;
import com.retailmind.api.domain.model.Sku;
import com.retailmind.api.domain.repository.RetailMindRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FinancialAnalyticsService {
    
    private final RetailMindRepository repository;
    private final DemandPredictionService demandPredictionService;
    
    @Cacheable(value = "financialImpact", key = "#storeId")
    public List<FinancialImpactResponse> calculateFinancialImpact(String storeId) {
        log.info("Calculating financial impact for store: {}", storeId);
        
        List<Sku> skus = repository.getSkusForStore(storeId);
        
        return skus.stream()
                .map(sku -> calculateItemFinancialImpact(sku, storeId))
                .sorted((a, b) -> Double.compare(b.getRevenueAtRisk(), a.getRevenueAtRisk()))
                .collect(Collectors.toList());
    }
    
    private FinancialImpactResponse calculateItemFinancialImpact(Sku sku, String storeId) {
        List<InventoryItem> items = repository.getInventoryForSku(storeId, sku.getSkuId());
        int totalStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();
        
        double unitPrice = sku.getPrice() != null ? sku.getPrice() : 100.0;
        double unitCost = sku.getCost() != null ? sku.getCost() : unitPrice * 0.7;
        double profitMargin = ((unitPrice - unitCost) / unitPrice) * 100;
        
        // Calculate revenue at risk (stockout scenario)
        DemandForecast forecast = demandPredictionService.predictDemand(sku.getSkuId(), storeId, 7);
        double predictedDemand = forecast.getPredictedDemand();
        double revenueAtRisk = 0;
        double potentialRevenueLoss = 0;
        
        if (totalStock < predictedDemand) {
            double shortfall = predictedDemand - totalStock;
            revenueAtRisk = shortfall * unitPrice;
            potentialRevenueLoss = shortfall * (unitPrice - unitCost);
        }
        
        // Calculate excess inventory cost
        double excessInventoryCost = 0;
        if (totalStock > predictedDemand * 2) {
            double excess = totalStock - (predictedDemand * 1.5);
            excessInventoryCost = excess * unitCost * 0.15; // 15% holding cost
        }
        
        // Recommended order value
        double optimalStock = predictedDemand * 1.2; // 20% safety stock
        double recommendedOrder = Math.max(0, optimalStock - totalStock);
        double recommendedOrderValue = recommendedOrder * unitCost;
        
        // Projected ROI
        double projectedROI = recommendedOrderValue > 0 
                ? ((recommendedOrder * (unitPrice - unitCost)) / recommendedOrderValue) * 100 
                : 0;
        
        String impactLevel = determineImpactLevel(revenueAtRisk, excessInventoryCost);
        
        return FinancialImpactResponse.builder()
                .skuId(sku.getSkuId())
                .skuName(sku.getName())
                .currentStock((double) totalStock)
                .unitPrice(unitPrice)
                .unitCost(unitCost)
                .profitMargin(profitMargin)
                .revenueAtRisk(revenueAtRisk)
                .potentialRevenueLoss(potentialRevenueLoss)
                .excessInventoryCost(excessInventoryCost)
                .recommendedOrderValue(recommendedOrderValue)
                .projectedROI(projectedROI)
                .impactLevel(impactLevel)
                .build();
    }
    
    private String determineImpactLevel(double revenueAtRisk, double excessCost) {
        double totalImpact = revenueAtRisk + excessCost;
        if (totalImpact > 5000) return "CRITICAL";
        if (totalImpact > 2000) return "HIGH";
        if (totalImpact > 500) return "MEDIUM";
        return "LOW";
    }
}
