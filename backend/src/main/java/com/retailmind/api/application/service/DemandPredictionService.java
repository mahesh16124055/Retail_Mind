package com.retailmind.api.application.service;

import com.retailmind.api.domain.model.DemandForecast;
import com.retailmind.api.domain.model.SalesTransaction;
import com.retailmind.api.domain.repository.RetailMindRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DemandPredictionService {

    private final RetailMindRepository repository;

    public DemandPredictionService(RetailMindRepository repository) {
        this.repository = repository;
    }

    /**
     * Predict demand for a SKU using historical sales data
     * Implements moving average with trend adjustment
     */
    public DemandForecast predictDemand(String skuId, String storeId, int horizonDays) {
        // Fetch historical sales transactions
        List<SalesTransaction> historicalSales = repository.getSalesTransactions(storeId, skuId, 30);
        
        if (historicalSales.isEmpty()) {
            return createDefaultForecast(skuId, storeId, horizonDays);
        }

        // Calculate daily demand from transactions
        Map<LocalDate, Integer> dailyDemand = aggregateDailyDemand(historicalSales);
        
        // Calculate moving average
        double movingAverage = calculateMovingAverage(dailyDemand, 7);
        
        // Calculate trend
        double trend = calculateTrend(dailyDemand);
        
        // Predict future demand with trend adjustment
        double predictedDemand = movingAverage + (trend * horizonDays);
        predictedDemand = Math.max(0, predictedDemand); // Ensure non-negative
        
        // Calculate confidence interval (±20% for MVP)
        double confidenceLower = predictedDemand * 0.8;
        double confidenceUpper = predictedDemand * 1.2;

        DemandForecast forecast = new DemandForecast();
        forecast.setPk("STORE#" + storeId + "#SKU#" + skuId);
        forecast.setSk("FORECAST#" + LocalDate.now().plusDays(horizonDays));
        forecast.setForecastId(UUID.randomUUID().toString());
        forecast.setSkuId(skuId);
        forecast.setStoreId(storeId);
        forecast.setForecastDate(LocalDate.now().plusDays(horizonDays).toString());
        forecast.setPredictedDemand(predictedDemand);
        forecast.setConfidenceLower(confidenceLower);
        forecast.setConfidenceUpper(confidenceUpper);
        forecast.setModelUsed("MOVING_AVERAGE_WITH_TREND");
        forecast.setCreatedAt(Instant.now());

        // Save forecast to DynamoDB
        repository.saveDemandForecast(forecast);

        return forecast;
    }

    /**
     * Batch predict demand for multiple SKUs
     */
    public List<DemandForecast> batchPredict(String storeId, List<String> skuIds, int horizonDays) {
        return skuIds.stream()
                .map(skuId -> predictDemand(skuId, storeId, horizonDays))
                .collect(Collectors.toList());
    }

    /**
     * Get 7-day forecast for a SKU
     */
    public List<DemandForecast> get7DayForecast(String skuId, String storeId) {
        List<DemandForecast> forecasts = new ArrayList<>();
        for (int day = 1; day <= 7; day++) {
            forecasts.add(predictDemand(skuId, storeId, day));
        }
        return forecasts;
    }

    private Map<LocalDate, Integer> aggregateDailyDemand(List<SalesTransaction> transactions) {
        Map<LocalDate, Integer> dailyDemand = new HashMap<>();
        
        for (SalesTransaction transaction : transactions) {
            LocalDate date = LocalDate.ofInstant(transaction.getTimestamp(), java.time.ZoneId.systemDefault());
            dailyDemand.merge(date, transaction.getQuantity(), Integer::sum);
        }
        
        return dailyDemand;
    }

    private double calculateMovingAverage(Map<LocalDate, Integer> dailyDemand, int windowSize) {
        if (dailyDemand.isEmpty()) {
            return 0.0;
        }

        List<Integer> recentDemands = dailyDemand.entrySet().stream()
                .sorted(Map.Entry.<LocalDate, Integer>comparingByKey().reversed())
                .limit(windowSize)
                .map(Map.Entry::getValue)
                .collect(Collectors.toList());

        return recentDemands.stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0);
    }

    private double calculateTrend(Map<LocalDate, Integer> dailyDemand) {
        if (dailyDemand.size() < 2) {
            return 0.0;
        }

        List<Map.Entry<LocalDate, Integer>> sortedEntries = dailyDemand.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .collect(Collectors.toList());

        // Simple linear regression for trend
        int n = sortedEntries.size();
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (int i = 0; i < n; i++) {
            double x = i;
            double y = sortedEntries.get(i).getValue();
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }

        double slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }

    private DemandForecast createDefaultForecast(String skuId, String storeId, int horizonDays) {
        // Default forecast when no historical data exists
        DemandForecast forecast = new DemandForecast();
        forecast.setPk("STORE#" + storeId + "#SKU#" + skuId);
        forecast.setSk("FORECAST#" + LocalDate.now().plusDays(horizonDays));
        forecast.setForecastId(UUID.randomUUID().toString());
        forecast.setSkuId(skuId);
        forecast.setStoreId(storeId);
        forecast.setForecastDate(LocalDate.now().plusDays(horizonDays).toString());
        forecast.setPredictedDemand(5.0); // Default assumption
        forecast.setConfidenceLower(2.0);
        forecast.setConfidenceUpper(10.0);
        forecast.setModelUsed("DEFAULT_NO_HISTORY");
        forecast.setCreatedAt(Instant.now());
        return forecast;
    }
}
