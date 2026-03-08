package com.retailmind.api.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialImpactResponse {
    private String skuId;
    private String skuName;
    private Double currentStock;
    private Double unitPrice;
    private Double unitCost;
    private Double profitMargin;
    private Double revenueAtRisk;
    private Double potentialRevenueLoss;
    private Double excessInventoryCost;
    private Double recommendedOrderValue;
    private Double projectedROI;
    private String impactLevel; // CRITICAL, HIGH, MEDIUM, LOW
}
