package com.retailmind.api.domain.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

@DynamoDbBean
public class Store {

    // In a single-table design, PK could be "STORE" and SK could be "STORE#123"
    private String pk;
    private String sk;

    private String storeId;
    private String name;
    private String location;
    private String storeType;
    private Double totalDailySalesAverage;

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

    public String getStoreId() {
        return storeId;
    }

    public void setStoreId(String storeId) {
        this.storeId = storeId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getStoreType() {
        return storeType;
    }

    public void setStoreType(String storeType) {
        this.storeType = storeType;
    }

    public Double getTotalDailySalesAverage() {
        return totalDailySalesAverage;
    }

    public void setTotalDailySalesAverage(Double totalDailySalesAverage) {
        this.totalDailySalesAverage = totalDailySalesAverage;
    }
}
