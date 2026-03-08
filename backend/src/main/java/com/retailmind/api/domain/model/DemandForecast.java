package com.retailmind.api.domain.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbIgnore;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@DynamoDbBean
public class DemandForecast {

    private String pk; // "STORE#{storeId}#SKU#{skuId}"
    private String sk; // "FORECAST#{forecastDate}"
    
    private String forecastId;
    private String skuId;
    private String storeId;
    private String forecastDate; // ISO-8601 date
    private Double predictedDemand;
    private Double confidenceLower;
    private Double confidenceUpper;
    private String modelUsed;
    private Map<String, Object> externalFactors;
    private Instant createdAt;

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

    public String getForecastId() {
        return forecastId;
    }

    public void setForecastId(String forecastId) {
        this.forecastId = forecastId;
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

    public String getForecastDate() {
        return forecastDate;
    }

    public void setForecastDate(String forecastDate) {
        this.forecastDate = forecastDate;
    }

    public Double getPredictedDemand() {
        return predictedDemand;
    }

    public void setPredictedDemand(Double predictedDemand) {
        this.predictedDemand = predictedDemand;
    }

    public Double getConfidenceLower() {
        return confidenceLower;
    }

    public void setConfidenceLower(Double confidenceLower) {
        this.confidenceLower = confidenceLower;
    }

    public Double getConfidenceUpper() {
        return confidenceUpper;
    }

    public void setConfidenceUpper(Double confidenceUpper) {
        this.confidenceUpper = confidenceUpper;
    }

    public String getModelUsed() {
        return modelUsed;
    }

    public void setModelUsed(String modelUsed) {
        this.modelUsed = modelUsed;
    }

    @DynamoDbIgnore
    public Map<String, Object> getExternalFactors() {
        return externalFactors;
    }

    public void setExternalFactors(Map<String, Object> externalFactors) {
        this.externalFactors = externalFactors;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
