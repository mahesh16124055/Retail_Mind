package com.retailmind.api.domain.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbIgnore;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

import java.time.Instant;
import java.util.Map;

@DynamoDbBean
public class Recommendation {

    private String pk; // "STORE#{storeId}"
    private String sk; // "REC#{recommendationId}"
    
    private String recommendationId;
    private String recommendationType; // REORDER, PRICING, REDISTRIBUTION, PROMOTIONAL
    private String skuId;
    private String storeId;
    private String action;
    private Map<String, Object> parameters;
    private String expectedOutcome;
    private Double confidenceLevel;
    private String implementationComplexity; // LOW, MEDIUM, HIGH
    private Double estimatedRoi;
    private Instant createdAt;
    private String status; // PENDING, ACCEPTED, REJECTED, IMPLEMENTED

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

    public String getRecommendationId() {
        return recommendationId;
    }

    public void setRecommendationId(String recommendationId) {
        this.recommendationId = recommendationId;
    }

    public String getRecommendationType() {
        return recommendationType;
    }

    public void setRecommendationType(String recommendationType) {
        this.recommendationType = recommendationType;
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

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    @DynamoDbIgnore
    public Map<String, Object> getParameters() {
        return parameters;
    }

    public void setParameters(Map<String, Object> parameters) {
        this.parameters = parameters;
    }

    public String getExpectedOutcome() {
        return expectedOutcome;
    }

    public void setExpectedOutcome(String expectedOutcome) {
        this.expectedOutcome = expectedOutcome;
    }

    public Double getConfidenceLevel() {
        return confidenceLevel;
    }

    public void setConfidenceLevel(Double confidenceLevel) {
        this.confidenceLevel = confidenceLevel;
    }

    public String getImplementationComplexity() {
        return implementationComplexity;
    }

    public void setImplementationComplexity(String implementationComplexity) {
        this.implementationComplexity = implementationComplexity;
    }

    public Double getEstimatedRoi() {
        return estimatedRoi;
    }

    public void setEstimatedRoi(Double estimatedRoi) {
        this.estimatedRoi = estimatedRoi;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
