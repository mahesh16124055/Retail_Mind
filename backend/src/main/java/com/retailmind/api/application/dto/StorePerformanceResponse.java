package com.retailmind.api.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorePerformanceResponse {
    private String storeId;
    private String storeName;
    private String location;
    private Integer totalSkus;
    private Integer criticalCount;
    private Integer highRiskCount;
    private Double averageStockLevel;
    private Double stockoutRate;
    private Double overstockRate;
    private String performanceGrade; // A, B, C, D, F
    private List<String> topRisks;
    private Double revenueAtRisk;
}
