package com.retailmind.api.application.service;

import com.retailmind.api.application.dto.AlertResponse;
import com.retailmind.api.domain.model.DemandForecast;
import com.retailmind.api.domain.model.InventoryItem;
import com.retailmind.api.domain.model.Sku;
import com.retailmind.api.domain.repository.RetailMindRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {
    
    private final RetailMindRepository repository;
    private final DemandPredictionService demandPredictionService;
    private final Map<String, AlertResponse> alertCache = new HashMap<>();
    
    public List<AlertResponse> getActiveAlerts(String storeId) {
        log.info("Generating active alerts for store: {}", storeId);
        
        List<Sku> skus = repository.getSkusForStore(storeId);
        List<AlertResponse> alerts = new ArrayList<>();
        
        for (Sku sku : skus) {
            alerts.addAll(generateAlertsForItem(sku, storeId));
        }
        
        return alerts.stream()
                .sorted(Comparator.comparing(AlertResponse::getSeverity)
                        .thenComparing(AlertResponse::getTimestamp).reversed())
                .collect(Collectors.toList());
    }
    
    private List<AlertResponse> generateAlertsForItem(Sku sku, String storeId) {
        List<AlertResponse> alerts = new ArrayList<>();
        List<InventoryItem> items = repository.getInventoryForSku(storeId, sku.getSkuId());
        int totalStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();
        String skuName = sku.getName();
        
        // Stockout alert
        if (totalStock < 5) {
            alerts.add(createAlert(
                    storeId, sku.getSkuId(), skuName,
                    "STOCKOUT", "CRITICAL",
                    String.format("Critical: Only %d units left! Immediate reorder required.", totalStock),
                    "Order immediately to prevent stockout"
            ));
        } else if (totalStock < 15) {
            alerts.add(createAlert(
                    storeId, sku.getSkuId(), skuName,
                    "LOW_STOCK", "HIGH",
                    String.format("Low stock warning: %d units remaining", totalStock),
                    "Schedule reorder within 24 hours"
            ));
        }
        
        // Overstock alert
        if (totalStock > 90) {
            alerts.add(createAlert(
                    storeId, sku.getSkuId(), skuName,
                    "OVERSTOCK", "MEDIUM",
                    String.format("Overstock detected: %d units (excess inventory)", totalStock),
                    "Consider promotional pricing or redistribution"
            ));
        }
        
        // Demand spike alert
        DemandForecast forecast = demandPredictionService.predictDemand(sku.getSkuId(), storeId, 7);
        double predictedDemand = forecast.getPredictedDemand();
        if (predictedDemand > totalStock * 1.5) {
            alerts.add(createAlert(
                    storeId, sku.getSkuId(), skuName,
                    "DEMAND_SPIKE", "HIGH",
                    String.format("Predicted demand spike: %.0f units expected vs %d in stock", 
                            predictedDemand, totalStock),
                    "Increase order quantity by 50%"
            ));
        }
        
        return alerts;
    }
    
    private AlertResponse createAlert(String storeId, String skuId, String skuName,
                                     String alertType, String severity, String message, String action) {
        String alertId = UUID.randomUUID().toString();
        
        return AlertResponse.builder()
                .alertId(alertId)
                .storeId(storeId)
                .skuId(skuId)
                .skuName(skuName)
                .alertType(alertType)
                .severity(severity)
                .message(message)
                .timestamp(LocalDateTime.now())
                .acknowledged(false)
                .actionRequired(action)
                .build();
    }
    
    public void acknowledgeAlert(String alertId) {
        AlertResponse alert = alertCache.get(alertId);
        if (alert != null) {
            alert.setAcknowledged(true);
            log.info("Alert {} acknowledged", alertId);
        }
    }
}
