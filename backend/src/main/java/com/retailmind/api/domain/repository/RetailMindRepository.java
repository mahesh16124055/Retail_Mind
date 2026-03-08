package com.retailmind.api.domain.repository;

import com.retailmind.api.domain.model.InventoryItem;
import com.retailmind.api.domain.model.Sku;
import com.retailmind.api.domain.model.Store;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.util.List;
import java.util.stream.Collectors;

@Repository
public class RetailMindRepository {

    private final DynamoDbTable<Store> storeTable;
    private final DynamoDbTable<Sku> skuTable;
    private final DynamoDbTable<InventoryItem> inventoryTable;

    public RetailMindRepository(DynamoDbEnhancedClient enhancedClient) {
        // Assuming a multi-table or distinct logical table name approach for simplicity
        // here,
        // though single-table is possible with the same EnhancedClient by mapping a
        // base item.
        this.storeTable = enhancedClient.table("RetailMind_Store", TableSchema.fromBean(Store.class));
        this.skuTable = enhancedClient.table("RetailMind_Sku", TableSchema.fromBean(Sku.class));
        this.inventoryTable = enhancedClient.table("RetailMind_Inventory", TableSchema.fromBean(InventoryItem.class));
    }

    // --- Store Operations ---
    public void saveStore(Store store) {
        storeTable.putItem(store);
    }

    public Store getStore(String storeId) {
        Key key = Key.builder().partitionValue("STORE").sortValue("STORE#" + storeId).build();
        return storeTable.getItem(key);
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
}
