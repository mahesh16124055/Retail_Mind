package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.service.DatabaseConfigService;
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
    private final DatabaseConfigService databaseConfigService;

    public DataSeederController(RetailMindRepository repository, 
                                DynamoDbEnhancedClient enhancedClient,
                                DatabaseConfigService databaseConfigService) {
        this.repository = repository;
        this.enhancedClient = enhancedClient;
        this.databaseConfigService = databaseConfigService;
    }

    @PostMapping("/init-tables")
    public ResponseEntity<String> initTables() {
        try {
            createTableIfNotExists("RetailMind_Store", TableSchema.fromBean(Store.class));
            createTableIfNotExists("RetailMind_Sku", TableSchema.fromBean(Sku.class));
            createTableIfNotExists("RetailMind_Inventory", TableSchema.fromBean(InventoryItem.class));
            createTableIfNotExists("RetailMind_Sales", TableSchema.fromBean(com.retailmind.api.domain.model.SalesTransaction.class));
            createTableIfNotExists("RetailMind_Forecast", TableSchema.fromBean(com.retailmind.api.domain.model.DemandForecast.class));
            createTableIfNotExists("RetailMind_Risk", TableSchema.fromBean(com.retailmind.api.domain.model.Risk.class));
            createTableIfNotExists("RetailMind_User", TableSchema.fromBean(com.retailmind.api.domain.model.User.class));
            
            // Explicitly wait for User table to be ACTIVE before creating admin user
            System.out.println("Waiting for User table to become ACTIVE...");
            waitForTableActive("RetailMind_User");
            System.out.println("User table is ACTIVE, creating admin user...");
            
            // Create default admin user if not exists
            createDefaultAdminUser();
            
            return ResponseEntity.ok("All tables created or already exist. Default admin user: admin/admin123");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error creating tables: " + e.getMessage());
        }
    }
    
    private void createDefaultAdminUser() {
        try {
            System.out.println("Checking if admin user already exists...");
            com.retailmind.api.domain.model.User existingUser = repository.getUserByUsername("admin");
            if (existingUser == null) {
                System.out.println("Admin user not found, creating new admin user...");
                com.retailmind.api.domain.model.User admin = new com.retailmind.api.domain.model.User();
                admin.setPk("USER");
                admin.setSk("USER#" + UUID.randomUUID().toString());
                admin.setUserId(UUID.randomUUID().toString());
                admin.setUsername("admin");
                admin.setEmail("admin@retailmind.com");
                // Password: admin123 (BCrypt hash)
                admin.setPasswordHash("$2a$10$DCHidv5bx6ouava93nnpuugfyH0wmfPoT..iyi7NeGztTsxOXCKHq");
                admin.setRoles(java.util.List.of("ADMIN", "STORE_MANAGER"));
                admin.setEnabled(true);
                admin.setCreatedAt(java.time.Instant.now());
                repository.saveUser(admin);
                System.out.println("Admin user created successfully with username: admin");
            } else {
                System.out.println("Admin user already exists, skipping creation");
            }
        } catch (Exception e) {
            System.err.println("Error creating default admin user: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private <T> void createTableIfNotExists(String tableName, TableSchema<T> schema) {
        try {
            enhancedClient.table(tableName, schema).createTable();
            // Wait for table to become active
            waitForTableActive(tableName);
        } catch (ResourceInUseException alreadyExists) {
            // Table already exists, which is fine for idempotent initialization
        }
    }
    
    private void waitForTableActive(String tableName) {
        try {
            System.out.println("Waiting for table " + tableName + " to become ACTIVE...");
            software.amazon.awssdk.services.dynamodb.DynamoDbClient lowLevelClient = 
                software.amazon.awssdk.services.dynamodb.DynamoDbClient.create();
            
            for (int i = 0; i < 30; i++) { // Wait up to 30 seconds
                try {
                    var response = lowLevelClient.describeTable(r -> r.tableName(tableName));
                    String status = response.table().tableStatus().toString();
                    System.out.println("Table " + tableName + " status: " + status);
                    if ("ACTIVE".equals(status)) {
                        System.out.println("Table " + tableName + " is now ACTIVE");
                        return;
                    }
                    Thread.sleep(1000);
                } catch (Exception e) {
                    System.out.println("Waiting for table " + tableName + " (attempt " + (i+1) + "/30)...");
                    Thread.sleep(1000);
                }
            }
            System.err.println("Timeout waiting for table " + tableName + " to become ACTIVE");
        } catch (Exception e) {
            System.err.println("Error waiting for table: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @PostMapping("/seed/{storeId}")
    public ResponseEntity<String> seedData(@PathVariable String storeId) {
        
        // Check data mode - in production mode, don't seed mock data
        if (databaseConfigService.isProductionMode()) {
            return ResponseEntity.ok("Production mode active - using real database data. Mock data seeding skipped.");
        }
        
        // Mock mode - generate sample data
        System.out.println("Mock mode active - generating sample data for store: " + storeId);

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
                "Tata Salt 1kg", "Britannia Milk Bikis", "Mother Dairy Milk 1L", "Colgate Toothpaste",
                "Lays Chips 50g", "Coca Cola 500ml" };
        String[] mockCategories = { "Snacks", "Dairy", "Snacks", "Staples", "Staples", 
                "Snacks", "Dairy", "Personal Care", "Snacks", "Beverages" };
        int[] mockQuantities = { 1, 4, 10, 25, 40, 8, 2, 15, 20, 30 };
        int[] shelfLifeDays = { 180, 30, 365, 365, 730, 180, 7, 730, 90, 180 };

        for (int i = 0; i < mockSkuNames.length; i++) {
            String skuId = UUID.randomUUID().toString();

            Sku sku = new Sku();
            sku.setPk("STORE#" + storeId);
            sku.setSk("SKU#" + skuId);
            sku.setSkuId(skuId);
            sku.setName(mockSkuNames[i]);
            sku.setCategory(mockCategories[i]);
            sku.setPrice(50.0 + (i * 10));
            sku.setCost(30.0 + (i * 5));
            repository.saveSku(sku);

            // Create inventory item with expiry date
            InventoryItem item = new InventoryItem();
            item.setPk("STORE#" + storeId + "#SKU#" + skuId);
            item.setSk("BATCH#" + UUID.randomUUID().toString());
            item.setStoreId(storeId);
            item.setSkuId(skuId);
            item.setBatchId(UUID.randomUUID().toString());
            item.setQuantity(mockQuantities[i]);
            item.setReorderPoint(mockQuantities[i] / 2);
            item.setSafetyStock(mockQuantities[i] / 4);
            
            // Set expiry date based on shelf life
            java.time.LocalDate expiryDate = java.time.LocalDate.now().plusDays(shelfLifeDays[i]);
            item.setExpiryDate(expiryDate.toString());
            item.setLastRestockDate(java.time.LocalDate.now().minusDays(7).toString());
            
            repository.saveInventoryItem(item);
            
            // Create some historical sales transactions for demand prediction
            seedSalesTransactions(storeId, skuId, mockQuantities[i]);
        }

        return ResponseEntity.ok("Seed data successfully injected for store: " + storeId);
    }
    
    private void seedSalesTransactions(String storeId, String skuId, int avgDailyQuantity) {
        // Create 30 days of historical sales data
        for (int day = 30; day >= 1; day--) {
            java.time.Instant saleTime = java.time.Instant.now().minus(day, java.time.temporal.ChronoUnit.DAYS);
            
            // Add some randomness to daily sales (±30%)
            int quantity = (int) (avgDailyQuantity * (0.7 + Math.random() * 0.6));
            
            com.retailmind.api.domain.model.SalesTransaction transaction = new com.retailmind.api.domain.model.SalesTransaction();
            transaction.setPk("STORE#" + storeId + "#SKU#" + skuId);
            transaction.setSk("SALE#" + saleTime.toEpochMilli());
            transaction.setTransactionId(UUID.randomUUID().toString());
            transaction.setStoreId(storeId);
            transaction.setSkuId(skuId);
            transaction.setQuantity(quantity);
            transaction.setUnitPrice(50.0);
            transaction.setTotalAmount(quantity * 50.0);
            transaction.setTimestamp(saleTime);
            
            repository.saveSalesTransaction(transaction);
        }
    }
}
