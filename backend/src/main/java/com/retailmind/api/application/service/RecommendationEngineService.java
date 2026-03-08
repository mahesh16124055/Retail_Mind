package com.retailmind.api.application.service;

import com.retailmind.api.domain.model.*;
import com.retailmind.api.domain.repository.RetailMindRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Recommendation Engine Service
 * Generates actionable recommendations based on risks and predictions
 * 
 * Property 11: Risk-Based Recommendations
 * Property 12: Complete Reorder Recommendations
 * Property 13: Expiry-Based Action Recommendations
 */
@Service
public class RecommendationEngineService {

    private final RetailMindRepository repository;
    private final DemandPredictionService demandPredictionService;
    private final RiskDetectionService riskDetectionService;

    // Constants for EOQ calculation
    private static final double DEFAULT_ORDERING_COST = 100.0; // Cost per order
    private static final double DEFAULT_HOLDING_COST_RATE = 0.25; // 25% of unit cost per year

    public RecommendationEngineService(RetailMindRepository repository,
                                      DemandPredictionService demandPredictionService,
                                      RiskDetectionService riskDetectionService) {
        this.repository = repository;
        this.demandPredictionService = demandPredictionService;
        this.riskDetectionService = riskDetectionService;
    }

    /**
     * Generate all recommendations for a store
     */
    public List<Recommendation> generateRecommendations(String storeId) {
        List<Recommendation> recommendations = new ArrayList<>();
        
        List<Sku> skus = repository.getSkusForStore(storeId);
        
        for (Sku sku : skus) {
            // Generate reorder recommendations
            Recommendation reorderRec = generateReorderRecommendation(sku, storeId);
            if (reorderRec != null) {
                recommendations.add(reorderRec);
            }
            
            // Generate pricing recommendations for expiry
            List<Recommendation> pricingRecs = generatePricingRecommendations(sku, storeId);
            recommendations.addAll(pricingRecs);
            
            // Generate redistribution recommendations for overstock
            Recommendation redistRec = generateRedistributionRecommendation(sku, storeId);
            if (redistRec != null) {
                recommendations.add(redistRec);
            }
        }
        
        // Rank recommendations by priority
        return rankRecommendations(recommendations);
    }

    /**
     * Generate reorder recommendation using EOQ formula
     * Property 12: Complete Reorder Recommendations
     */
    public Recommendation generateReorderRecommendation(Sku sku, String storeId) {
        List<InventoryItem> items = repository.getInventoryForSku(storeId, sku.getSkuId());
        int currentStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();
        
        // Get demand forecast
        DemandForecast forecast = demandPredictionService.predictDemand(sku.getSkuId(), storeId, 1);
        double dailyDemand = forecast.getPredictedDemand();
        
        if (dailyDemand <= 0) {
            return null; // No recommendation if no demand
        }
        
        // Calculate reorder point
        int leadTimeDays = 3; // Assume 3-day lead time
        int reorderPoint = (int) Math.ceil(dailyDemand * leadTimeDays);
        
        // Only recommend if below reorder point
        if (currentStock > reorderPoint) {
            return null;
        }
        
        // Calculate EOQ (Economic Order Quantity)
        double annualDemand = dailyDemand * 365;
        double unitCost = sku.getCost() != null ? sku.getCost() : 50.0;
        double holdingCost = unitCost * DEFAULT_HOLDING_COST_RATE;
        
        double eoq = Math.sqrt((2 * annualDemand * DEFAULT_ORDERING_COST) / holdingCost);
        int orderQuantity = (int) Math.ceil(eoq);
        
        // Calculate expected ROI
        double stockoutCost = dailyDemand * unitCost * 2; // Assume 2x cost for stockout
        double orderingCost = DEFAULT_ORDERING_COST;
        double holdingCostTotal = orderQuantity * holdingCost / 365 * 30; // 30 days
        double expectedSavings = stockoutCost - orderingCost - holdingCostTotal;
        double roi = expectedSavings / (orderingCost + holdingCostTotal);
        
        // Create recommendation
        Recommendation recommendation = new Recommendation();
        recommendation.setPk("STORE#" + storeId);
        recommendation.setSk("REC#" + UUID.randomUUID().toString());
        recommendation.setRecommendationId(UUID.randomUUID().toString());
        recommendation.setRecommendationType("REORDER");
        recommendation.setSkuId(sku.getSkuId());
        recommendation.setStoreId(storeId);
        recommendation.setAction("REORDER_NOW");
        
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("orderQuantity", orderQuantity);
        parameters.put("reorderPoint", reorderPoint);
        parameters.put("currentStock", currentStock);
        parameters.put("leadTimeDays", leadTimeDays);
        parameters.put("eoq", eoq);
        parameters.put("unitCost", unitCost);
        
        recommendation.setParameters(parameters);
        recommendation.setExpectedOutcome(String.format(
            "Ordering %d units will prevent stockout and optimize inventory costs. Expected savings: ₹%.2f",
            orderQuantity, expectedSavings
        ));
        recommendation.setConfidenceLevel(0.85);
        recommendation.setImplementationComplexity("MEDIUM");
        recommendation.setEstimatedRoi(roi);
        recommendation.setCreatedAt(Instant.now());
        recommendation.setStatus("PENDING");
        
        return recommendation;
    }

    /**
     * Generate pricing recommendations for products near expiry
     * Property 13: Expiry-Based Action Recommendations
     */
    public List<Recommendation> generatePricingRecommendations(Sku sku, String storeId) {
        List<Recommendation> recommendations = new ArrayList<>();
        List<InventoryItem> items = repository.getInventoryForSku(storeId, sku.getSkuId());
        
        DemandForecast forecast = demandPredictionService.predictDemand(sku.getSkuId(), storeId, 1);
        double dailyDemand = forecast.getPredictedDemand();
        
        for (InventoryItem item : items) {
            if (item.getExpiryDate() == null || item.getExpiryDate().isEmpty()) {
                continue;
            }
            
            try {
                LocalDate expiryDate = LocalDate.parse(item.getExpiryDate());
                long daysUntilExpiry = ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
                
                if (daysUntilExpiry < 0 || daysUntilExpiry > 7) {
                    continue; // Skip expired or not urgent
                }
                
                double daysToSellOut = dailyDemand > 0 ? item.getQuantity() / dailyDemand : Double.MAX_VALUE;
                
                // Only recommend if won't sell before expiry
                if (daysToSellOut <= daysUntilExpiry) {
                    continue;
                }
                
                // Calculate discount percentage
                int discountPercent;
                if (daysUntilExpiry <= 1) {
                    discountPercent = 50; // 50% off for 1 day
                } else if (daysUntilExpiry <= 3) {
                    discountPercent = 30; // 30% off for 3 days
                } else {
                    discountPercent = 15; // 15% off for 7 days
                }
                
                double currentPrice = sku.getPrice() != null ? sku.getPrice() : 100.0;
                double discountedPrice = currentPrice * (1 - discountPercent / 100.0);
                
                // Calculate expected outcome
                double potentialLoss = item.getQuantity() * currentPrice;
                double expectedRevenue = item.getQuantity() * discountedPrice * 0.8; // Assume 80% sell-through
                double roi = (expectedRevenue - potentialLoss) / potentialLoss;
                
                Recommendation recommendation = new Recommendation();
                recommendation.setPk("STORE#" + storeId);
                recommendation.setSk("REC#" + UUID.randomUUID().toString());
                recommendation.setRecommendationId(UUID.randomUUID().toString());
                recommendation.setRecommendationType("PRICING");
                recommendation.setSkuId(sku.getSkuId());
                recommendation.setStoreId(storeId);
                recommendation.setAction("APPLY_DISCOUNT");
                
                Map<String, Object> parameters = new HashMap<>();
                parameters.put("discountPercent", discountPercent);
                parameters.put("originalPrice", currentPrice);
                parameters.put("discountedPrice", discountedPrice);
                parameters.put("daysUntilExpiry", daysUntilExpiry);
                parameters.put("quantity", item.getQuantity());
                parameters.put("batchId", item.getBatchId());
                
                recommendation.setParameters(parameters);
                recommendation.setExpectedOutcome(String.format(
                    "Apply %d%% discount to sell before expiry. Expected revenue: ₹%.2f vs potential loss: ₹%.2f",
                    discountPercent, expectedRevenue, potentialLoss
                ));
                recommendation.setConfidenceLevel(0.75);
                recommendation.setImplementationComplexity("LOW");
                recommendation.setEstimatedRoi(roi);
                recommendation.setCreatedAt(Instant.now());
                recommendation.setStatus("PENDING");
                
                recommendations.add(recommendation);
            } catch (Exception e) {
                // Skip invalid dates
                continue;
            }
        }
        
        return recommendations;
    }

    /**
     * Generate redistribution recommendation for overstock
     * Property 14: Overstock Resolution Recommendations
     */
    public Recommendation generateRedistributionRecommendation(Sku sku, String storeId) {
        List<InventoryItem> items = repository.getInventoryForSku(storeId, sku.getSkuId());
        int currentStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();
        
        DemandForecast forecast = demandPredictionService.predictDemand(sku.getSkuId(), storeId, 1);
        double dailyDemand = forecast.getPredictedDemand();
        
        if (dailyDemand <= 0) {
            return null;
        }
        
        double daysOfStock = currentStock / dailyDemand;
        
        // Only recommend if more than 60 days of stock
        if (daysOfStock <= 60) {
            return null;
        }
        
        // Calculate optimal stock level (30 days)
        int optimalStock = (int) Math.ceil(dailyDemand * 30);
        int excessStock = currentStock - optimalStock;
        
        if (excessStock <= 0) {
            return null;
        }
        
        double unitCost = sku.getCost() != null ? sku.getCost() : 50.0;
        double capitalTiedUp = excessStock * unitCost;
        double holdingCostSavings = capitalTiedUp * DEFAULT_HOLDING_COST_RATE;
        
        Recommendation recommendation = new Recommendation();
        recommendation.setPk("STORE#" + storeId);
        recommendation.setSk("REC#" + UUID.randomUUID().toString());
        recommendation.setRecommendationId(UUID.randomUUID().toString());
        recommendation.setRecommendationType("REDISTRIBUTION");
        recommendation.setSkuId(sku.getSkuId());
        recommendation.setStoreId(storeId);
        recommendation.setAction("REDISTRIBUTE_STOCK");
        
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("excessStock", excessStock);
        parameters.put("currentStock", currentStock);
        parameters.put("optimalStock", optimalStock);
        parameters.put("daysOfStock", daysOfStock);
        parameters.put("capitalTiedUp", capitalTiedUp);
        
        recommendation.setParameters(parameters);
        recommendation.setExpectedOutcome(String.format(
            "Redistribute %d units to other stores. Free up ₹%.2f capital and save ₹%.2f in holding costs annually",
            excessStock, capitalTiedUp, holdingCostSavings
        ));
        recommendation.setConfidenceLevel(0.70);
        recommendation.setImplementationComplexity("HIGH");
        recommendation.setEstimatedRoi(holdingCostSavings / capitalTiedUp);
        recommendation.setCreatedAt(Instant.now());
        recommendation.setStatus("PENDING");
        
        return recommendation;
    }

    /**
     * Rank recommendations by priority
     * Property 15: Recommendation Ranking
     */
    public List<Recommendation> rankRecommendations(List<Recommendation> recommendations) {
        recommendations.sort((r1, r2) -> {
            // Priority 1: Confidence level (higher is better)
            int confidenceCompare = Double.compare(r2.getConfidenceLevel(), r1.getConfidenceLevel());
            if (confidenceCompare != 0) return confidenceCompare;
            
            // Priority 2: ROI (higher is better)
            int roiCompare = Double.compare(r2.getEstimatedRoi(), r1.getEstimatedRoi());
            if (roiCompare != 0) return roiCompare;
            
            // Priority 3: Implementation complexity (lower is better)
            return r1.getImplementationComplexity().compareTo(r2.getImplementationComplexity());
        });
        
        return recommendations;
    }
}
