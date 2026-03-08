package com.retailmind.api.domain.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

import java.time.Instant;

@DynamoDbBean
public class Risk {

    private String pk; // "STORE#{storeId}"
    private String sk; // "RISK#{riskId}"
    
    private String riskId;
    private String riskType; // STOCKOUT, EXPIRY, OVERSTOCK, ANOMALY
    private String skuId;
    private String storeId;
    private String severity; // LOW, MEDIUM, HIGH, CRITICAL
    private Double riskScore;
    private Double estimatedImpact;
    private Long timeToImpactSeconds;
    private Instant detectedAt;
    private String status; // ACTIVE, RESOLVED, IGNORED

    @DynamoDbPartitionKey
    public String getPk() {
        return pk;
    }

    public void setPk(String pk) {
        this.pk = pk;
    }

    @DynamoDbSortKey
    public String getSk() {
        return sk;
    }

    public void setSk(String sk) {
        this.sk = sk;
    }

    public String getRiskId() {
        return riskId;
    }

    public void setRiskId(String riskId) {
        this.riskId = riskId;
    }

    public String getRiskType() {
        return riskType;
    }

    public void setRiskType(String riskType) {
        this.riskType = riskType;
    }

    public String getSkuId() {
        return skuId;
    }

    public void setSkuId(String skuId) {
        this.skuId = skuId;
    }

    public String getStoreId() {
        return storeId;
    }

    public void setStoreId(String storeId) {
        this.storeId = storeId;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public Double getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(Double riskScore) {
        this.riskScore = riskScore;
    }

    public Double getEstimatedImpact() {
        return estimatedImpact;
    }

    public void setEstimatedImpact(Double estimatedImpact) {
        this.estimatedImpact = estimatedImpact;
    }

    public Long getTimeToImpactSeconds() {
        return timeToImpactSeconds;
    }

    public void setTimeToImpactSeconds(Long timeToImpactSeconds) {
        this.timeToImpactSeconds = timeToImpactSeconds;
    }

    public Instant getDetectedAt() {
        return detectedAt;
    }

    public void setDetectedAt(Instant detectedAt) {
        this.detectedAt = detectedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
