package com.retailmind.api.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertResponse {
    private String alertId;
    private String storeId;
    private String skuId;
    private String skuName;
    private String alertType; // STOCKOUT, OVERSTOCK, PRICE_ANOMALY, DEMAND_SPIKE
    private String severity; // CRITICAL, HIGH, MEDIUM, LOW
    private String message;
    private LocalDateTime timestamp;
    private Boolean acknowledged;
    private String actionRequired;
}
