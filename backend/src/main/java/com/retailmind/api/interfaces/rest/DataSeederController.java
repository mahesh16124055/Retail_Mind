package com.retailmind.api.interfaces.rest;

import com.retailmind.api.domain.model.InventoryItem;
import com.retailmind.api.domain.model.Sku;
import com.retailmind.api.domain.model.Store;
import com.retailmind.api.domain.repository.RetailMindRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.model.ResourceInUseException;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/data")
@CrossOrigin(origins = "*")
public class DataSeederController {

    private final RetailMindRepository repository;
    private final DynamoDbEnhancedClient enhancedClient;

    public DataSeederController(RetailMindRepository repository, DynamoDbEnhancedClient enhancedClient) {
        this.repository = repository;
        this.enhancedClient = enhancedClient;
    }

    @PostMapping("/init-tables")
    public ResponseEntity<String> initTables() {
        try {
            createTableIfNotExists("RetailMind_Store", TableSchema.fromBean(Store.class));
            createTableIfNotExists("RetailMind_Sku", TableSchema.fromBean(Sku.class));
            createTableIfNotExists("RetailMind_Inventory", TableSchema.fromBean(InventoryItem.class));
            return ResponseEntity.ok("Tables created or already exist");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error creating tables: " + e.getMessage());
        }
    }

    private <T> void createTableIfNotExists(String tableName, TableSchema<T> schema) {
        try {
            enhancedClient.table(tableName, schema).createTable();
        } catch (ResourceInUseException alreadyExists) {
            // Table already exists, which is fine for idempotent initialization
        }
    }

    @PostMapping("/seed/{storeId}")
    public ResponseEntity<String> seedData(@PathVariable String storeId) {

        // Create Mock Store
        Store store = new Store();
        store.setPk("STORE");
        store.setSk("STORE#" + storeId);
        store.setStoreId(storeId);
        store.setName("Demo Kirana Express");
        store.setLocation("Bangalore");
        store.setStoreType("MINI_MART");
        store.setTotalDailySalesAverage(15000.0);
        repository.saveStore(store);

        // Array of mock SKUs for demo purposes
        String[] mockSkuNames = { "Parle-G 100g", "Amul Butter 500g", "Maggi Masala 2-Min", "Aashirvaad Atta 5kg",
                "Tata Salt 1kg" };
        String[] mockCategories = { "Snacks", "Dairy", "Snacks", "Staples", "Staples" };
        int[] mockQuantities = { 1, 4, 10, 25, 40 }; // Mix of critical, high, medium, and healthy stock

        for (int i = 0; i < mockSkuNames.length; i++) {
            String skuId = UUID.randomUUID().toString();

            Sku sku = new Sku();
            sku.setPk("STORE#" + storeId);
            sku.setSk("SKU#" + skuId);
            sku.setSkuId(skuId);
            sku.setName(mockSkuNames[i]);
            sku.setCategory(mockCategories[i]);
            repository.saveSku(sku);

            InventoryItem item = new InventoryItem();
            item.setPk("STORE#" + storeId + "#SKU#" + skuId);
            item.setSk("BATCH#" + UUID.randomUUID().toString());
            item.setStoreId(storeId);
            item.setSkuId(skuId);
            item.setQuantity(mockQuantities[i]);
            repository.saveInventoryItem(item);
        }

        return ResponseEntity.ok("Seed data successfully injected for store: " + storeId);
    }
}
