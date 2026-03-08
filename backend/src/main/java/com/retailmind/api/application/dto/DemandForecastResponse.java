package com.retailmind.api.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemandForecastResponse {
    private String skuId;
    private String skuName;
    private List<ForecastDataPoint> forecast;
    private Double confidenceScore;
    private String trendDirection; // INCREASING, DECREASING, STABLE
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForecastDataPoint {
        private LocalDate date;
        private Double predictedDemand;
        private Double lowerBound;
        private Double upperBound;
        private String seasonalFactor; // NORMAL, FESTIVAL, SLUMP
    }
}
