package com.retailmind.api.domain.repository;

import com.retailmind.api.domain.model.*;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Repository
public class RetailMindRepository {

    private final DynamoDbTable<Store> storeTable;
    private final DynamoDbTable<Sku> skuTable;
    private final DynamoDbTable<InventoryItem> inventoryTable;
    private final DynamoDbTable<SalesTransaction> salesTable;
    private final DynamoDbTable<DemandForecast> forecastTable;
    private final DynamoDbTable<Risk> riskTable;
    private final DynamoDbTable<User> userTable;

    public RetailMindRepository(DynamoDbEnhancedClient enhancedClient) {
        this.storeTable = enhancedClient.table("RetailMind_Store", TableSchema.fromBean(Store.class));
        this.skuTable = enhancedClient.table("RetailMind_Sku", TableSchema.fromBean(Sku.class));
        this.inventoryTable = enhancedClient.table("RetailMind_Inventory", TableSchema.fromBean(InventoryItem.class));
        this.salesTable = enhancedClient.table("RetailMind_Sales", TableSchema.fromBean(SalesTransaction.class));
        this.forecastTable = enhancedClient.table("RetailMind_Forecast", TableSchema.fromBean(DemandForecast.class));
        this.riskTable = enhancedClient.table("RetailMind_Risk", TableSchema.fromBean(Risk.class));
        this.userTable = enhancedClient.table("RetailMind_User", TableSchema.fromBean(User.class));
    }

    // --- Store Operations ---
    public void saveStore(Store store) {
        storeTable.putItem(store);
    }

    public Store getStore(String storeId) {
        Key key = Key.builder().partitionValue("STORE").sortValue("STORE#" + storeId).build();
        return storeTable.getItem(key);
    }

    public List<Store> getAllStores() {
        QueryConditional queryConditional = QueryConditional
                .keyEqualTo(Key.builder().partitionValue("STORE").build());
        return storeTable.query(r -> r.queryConditional(queryConditional))
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    // --- SKU Operations ---
    public void saveSku(Sku sku) {
        skuTable.putItem(sku);
    }

    public List<Sku> getSkusForStore(String storeId) {
        QueryConditional queryConditional = QueryConditional
                .keyEqualTo(Key.builder().partitionValue("STORE#" + storeId).build());

        return skuTable.query(r -> r.queryConditional(queryConditional))
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    public Sku getSku(String storeId, String skuId) {
        Key key = Key.builder()
                .partitionValue("STORE#" + storeId)
                .sortValue("SKU#" + skuId)
                .build();
        return skuTable.getItem(key);
    }

    // --- Inventory Operations ---
    public void saveInventoryItem(InventoryItem item) {
        inventoryTable.putItem(item);
    }

    public List<InventoryItem> getInventoryForSku(String storeId, String skuId) {
        String pk = "STORE#" + storeId + "#SKU#" + skuId;
        QueryConditional queryConditional = QueryConditional
                .keyEqualTo(Key.builder().partitionValue(pk).build());

        return inventoryTable.query(r -> r.queryConditional(queryConditional))
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    // --- Sales Transaction Operations ---
    public void saveSalesTransaction(SalesTransaction transaction) {
        // Set TTL for 90 days from now (for automatic cleanup)
        transaction.setTtl(Instant.now().plus(90, ChronoUnit.DAYS).getEpochSecond());
        salesTable.putItem(transaction);
    }

    public List<SalesTransaction> getSalesTransactions(String storeId, String skuId, int days) {
        String pk = "STORE#" + storeId + "#SKU#" + skuId;
        QueryConditional queryConditional = QueryConditional
                .keyEqualTo(Key.builder().partitionValue(pk).build());

        Instant cutoffTime = Instant.now().minus(days, ChronoUnit.DAYS);

        return salesTable.query(r -> r.queryConditional(queryConditional))
                .items()
                .stream()
                .filter(t -> t.getTimestamp().isAfter(cutoffTime))
                .collect(Collectors.toList());
    }

    // --- Demand Forecast Operations ---
    public void saveDemandForecast(DemandForecast forecast) {
        forecastTable.putItem(forecast);
    }

    public DemandForecast getDemandForecast(String storeId, String skuId, String forecastDate) {
        Key key = Key.builder()
                .partitionValue("STORE#" + storeId + "#SKU#" + skuId)
                .sortValue("FORECAST#" + forecastDate)
                .build();
        return forecastTable.getItem(key);
    }

    public List<DemandForecast> getForecasts(String storeId, String skuId) {
        String pk = "STORE#" + storeId + "#SKU#" + skuId;
        QueryConditional queryConditional = QueryConditional
                .keyEqualTo(Key.builder().partitionValue(pk).build());

        return forecastTable.query(r -> r.queryConditional(queryConditional))
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    // --- Risk Operations ---
    public void saveRisk(Risk risk) {
        riskTable.putItem(risk);
    }

    public List<Risk> getRisksForStore(String storeId) {
        QueryConditional queryConditional = QueryConditional
                .keyEqualTo(Key.builder().partitionValue("STORE#" + storeId).build());

        return riskTable.query(r -> r.queryConditional(queryConditional))
                .items()
                .stream()
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .collect(Collectors.toList());
    }

    public List<Risk> getRisksForSku(String storeId, String skuId) {
        return getRisksForStore(storeId).stream()
                .filter(r -> skuId.equals(r.getSkuId()))
                .collect(Collectors.toList());
    }

    // --- User Operations ---
    public void saveUser(User user) {
        userTable.putItem(user);
    }

    public User getUser(String userId) {
        Key key = Key.builder()
                .partitionValue("USER")
                .sortValue("USER#" + userId)
                .build();
        return userTable.getItem(key);
    }

    public User getUserByUsername(String username) {
        // For simplicity, scan for username (in production, use GSI)
        return userTable.scan().items().stream()
                .filter(u -> username.equals(u.getUsername()))
                .findFirst()
                .orElse(null);
    }

    public List<User> getAllUsers() {
        QueryConditional queryConditional = QueryConditional
                .keyEqualTo(Key.builder().partitionValue("USER").build());
        return userTable.query(r -> r.queryConditional(queryConditional))
                .items()
                .stream()
                .collect(Collectors.toList());
    }
}
