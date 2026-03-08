package com.retailmind.api.application.service;

import com.retailmind.api.application.dto.DemandForecastResponse;
import com.retailmind.api.domain.model.DemandForecast;
import com.retailmind.api.domain.model.Sku;
import com.retailmind.api.domain.model.Store;
import com.retailmind.api.domain.repository.RetailMindRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ForecastVisualizationService {
    
    private final RetailMindRepository repository;
    private final DemandPredictionService demandPredictionService;
    
    @Cacheable(value = "demandForecast", key = "#skuId + '_' + #days")
    public DemandForecastResponse getForecastVisualization(String skuId, int days) {
        log.info("Generating {}-day forecast visualization for SKU: {}", days, skuId);
        
        // Find which store has this SKU by checking all stores
        List<Store> stores = repository.getAllStores();
        String storeId = null;
        Sku sku = null;
        
        for (Store store : stores) {
            Sku foundSku = repository.getSku(store.getStoreId(), skuId);
            if (foundSku != null) {
                storeId = store.getStoreId();
                sku = foundSku;
                log.info("Found SKU {} in store {}", skuId, storeId);
                break;
            }
        }
        
        // Fallback if SKU not found in any store
        if (sku == null || storeId == null) {
            log.warn("SKU {} not found in any store, using default store 101", skuId);
            storeId = stores.isEmpty() ? "101" : stores.get(0).getStoreId();
            sku = repository.getSku(storeId, skuId);
        }
        
        String skuName = sku != null ? sku.getName() : "Unknown";
        
        List<DemandForecastResponse.ForecastDataPoint> forecast = new ArrayList<>();
        LocalDate startDate = LocalDate.now();
        
        DemandForecast baselineForecast = demandPredictionService.predictDemand(skuId, storeId, days);
        double baselineDemand = baselineForecast.getPredictedDemand();
        double dailyDemand = baselineDemand / days;
        
        for (int i = 0; i < days; i++) {
            LocalDate date = startDate.plusDays(i);
            
            // Add seasonality and variance
            double seasonalMultiplier = getSeasonalMultiplier(date);
            double variance = 0.15; // 15% confidence interval
            
            double predicted = dailyDemand * seasonalMultiplier;
            double lowerBound = predicted * (1 - variance);
            double upperBound = predicted * (1 + variance);
            
            String seasonalFactor = determineSeasonalFactor(date);
            
            forecast.add(DemandForecastResponse.ForecastDataPoint.builder()
                    .date(date)
                    .predictedDemand(predicted)
                    .lowerBound(lowerBound)
                    .upperBound(upperBound)
                    .seasonalFactor(seasonalFactor)
                    .build());
        }
        
        double confidenceScore = 0.85; // 85% confidence
        String trendDirection = determineTrend(forecast);
        
        return DemandForecastResponse.builder()
                .skuId(skuId)
                .skuName(skuName)
                .forecast(forecast)
                .confidenceScore(confidenceScore)
                .trendDirection(trendDirection)
                .build();
    }
    
    private double getSeasonalMultiplier(LocalDate date) {
        int dayOfWeek = date.getDayOfWeek().getValue();
        int dayOfMonth = date.getDayOfMonth();
        
        // Weekend boost
        if (dayOfWeek >= 6) return 1.3;
        
        // Festival season (Oct-Nov, assume Diwali period)
        if (date.getMonthValue() >= 10 && date.getMonthValue() <= 11) return 1.5;
        
        // Month-end salary days
        if (dayOfMonth >= 28) return 1.2;
        
        return 1.0;
    }
    
    private String determineSeasonalFactor(LocalDate date) {
        int month = date.getMonthValue();
        if (month >= 10 && month <= 11) return "FESTIVAL";
        if (month >= 6 && month <= 9) return "SLUMP"; // Monsoon
        return "NORMAL";
    }
    
    private String determineTrend(List<DemandForecastResponse.ForecastDataPoint> forecast) {
        if (forecast.size() < 2) return "STABLE";
        
        double firstHalf = forecast.subList(0, forecast.size() / 2).stream()
                .mapToDouble(DemandForecastResponse.ForecastDataPoint::getPredictedDemand)
                .average().orElse(0);
        
        double secondHalf = forecast.subList(forecast.size() / 2, forecast.size()).stream()
                .mapToDouble(DemandForecastResponse.ForecastDataPoint::getPredictedDemand)
                .average().orElse(0);
        
        double change = ((secondHalf - firstHalf) / firstHalf) * 100;
        
        if (change > 10) return "INCREASING";
        if (change < -10) return "DECREASING";
        return "STABLE";
    }
}
