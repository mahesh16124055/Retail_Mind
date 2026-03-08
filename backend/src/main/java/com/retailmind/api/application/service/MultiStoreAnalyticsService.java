package com.retailmind.api.application.service;

import com.retailmind.api.application.dto.StorePerformanceResponse;
import com.retailmind.api.domain.model.InventoryItem;
import com.retailmind.api.domain.model.Risk;
import com.retailmind.api.domain.model.Sku;
import com.retailmind.api.domain.model.Store;
import com.retailmind.api.domain.repository.RetailMindRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MultiStoreAnalyticsService {
    
    private final RetailMindRepository repository;
    private final RiskDetectionService riskDetectionService;
    
    @Cacheable(value = "storePerformance", key = "#root.methodName")
    public List<StorePerformanceResponse> getAllStorePerformance() {
        log.info("Calculating performance metrics for all stores");
        
        List<Store> stores = repository.getAllStores();
        
        return stores.stream()
                .map(this::calculateStorePerformance)
                .sorted(Comparator.comparing(StorePerformanceResponse::getPerformanceGrade))
                .collect(Collectors.toList());
    }
    
    private StorePerformanceResponse calculateStorePerformance(Store store) {
        List<Sku> skus = repository.getSkusForStore(store.getStoreId());
        
        int totalSkus = skus.size();
        int criticalCount = 0;
        int highRiskCount = 0;
        int stockoutCount = 0;
        int overstockCount = 0;
        double totalStock = 0;
        double revenueAtRisk = 0;
        
        List<String> topRisks = new ArrayList<>();
        
        for (Sku sku : skus) {
            List<InventoryItem> items = repository.getInventoryForSku(store.getStoreId(), sku.getSkuId());
            int skuStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();
            totalStock += skuStock;
            
            Risk stockoutRisk = riskDetectionService.detectStockoutRisk(sku.getSkuId(), store.getStoreId());
            
            if (stockoutRisk != null && "CRITICAL".equals(stockoutRisk.getSeverity())) {
                criticalCount++;
                topRisks.add(sku.getName());
                revenueAtRisk += skuStock * (sku.getPrice() != null ? sku.getPrice() : 50);
            } else if (stockoutRisk != null && "HIGH".equals(stockoutRisk.getSeverity())) {
                highRiskCount++;
            }
            
            if (skuStock < 10) stockoutCount++;
            if (skuStock > 80) overstockCount++;
        }
        
        double avgStockLevel = totalSkus > 0 ? totalStock / totalSkus : 0;
        double stockoutRate = totalSkus > 0 ? (double) stockoutCount / totalSkus * 100 : 0;
        double overstockRate = totalSkus > 0 ? (double) overstockCount / totalSkus * 100 : 0;
        
        String grade = calculatePerformanceGrade(stockoutRate, overstockRate, criticalCount, totalSkus);
        
        return StorePerformanceResponse.builder()
                .storeId(store.getStoreId())
                .storeName(store.getName())
                .location(store.getLocation())
                .totalSkus(totalSkus)
                .criticalCount(criticalCount)
                .highRiskCount(highRiskCount)
                .averageStockLevel(avgStockLevel)
                .stockoutRate(stockoutRate)
                .overstockRate(overstockRate)
                .performanceGrade(grade)
                .topRisks(topRisks.stream().limit(3).collect(Collectors.toList()))
                .revenueAtRisk(revenueAtRisk)
                .build();
    }
    
    private String calculatePerformanceGrade(double stockoutRate, double overstockRate, int criticalCount, int totalSkus) {
        double criticalRate = totalSkus > 0 ? (double) criticalCount / totalSkus * 100 : 0;
        double totalIssueRate = stockoutRate + overstockRate + criticalRate;
        
        if (totalIssueRate < 10) return "A";
        if (totalIssueRate < 25) return "B";
        if (totalIssueRate < 40) return "C";
        if (totalIssueRate < 60) return "D";
        return "F";
    }
}
