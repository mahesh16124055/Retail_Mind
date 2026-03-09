package com.retailmind.api.application.service;

import com.retailmind.api.domain.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Service for generating mock/sample data when in Mock Data Mode
 * This allows testing and demonstration without requiring real database connections
 */
@Service
@Slf4j
public class MockDataGeneratorService {

    private static final String[] MOCK_SKU_NAMES = {
        "Parle-G 100g", "Amul Butter 500g", "Maggi Masala 2-Min", "Aashirvaad Atta 5kg",
        "Tata Salt 1kg", "Britannia Milk Bikis", "Mother Dairy Milk 1L", "Colgate Toothpaste",
        "Lays Chips 50g", "Coca Cola 500ml", "Dove Soap", "Surf Excel 1kg",
        "Fortune Oil 1L", "Nescafe Coffee", "Red Label Tea", "Sunfeast Biscuits",
        "Kurkure Masala Munch", "Haldiram Bhujia", "Amul Cheese Slices", "Bru Coffee",
        "Vim Dishwash Bar", "Rin Detergent", "Clinic Plus Shampoo", "Fair & Lovely Cream"
    };

    private static final String[] MOCK_CATEGORIES = {
        "Snacks", "Dairy", "Instant Food", "Staples", "Staples",
        "Snacks", "Dairy", "Personal Care", "Snacks", "Beverages",
        "Personal Care", "Household", "Staples", "Beverages", "Beverages", "Snacks",
        "Snacks", "Snacks", "Dairy", "Beverages",
        "Household", "Household", "Personal Care", "Personal Care"
    };

    private static final String[] INDIAN_STORE_NAMES = {
        "Sharma Kirana Store, Varanasi",
        "Patel General Store, Ahmedabad",
        "Kumar Provision Store, Chennai",
        "Singh Supermarket, Amritsar",
        "Reddy Stores, Hyderabad",
        "Gupta Traders, Delhi",
        "Mehta Kirana, Mumbai",
        "Joshi General Store, Pune"
    };

    /**
     * Generate mock sales transactions for a SKU
     */
    public List<SalesTransaction> generateMockSalesTransactions(String storeId, String skuId, int days) {
        log.debug("Generating {} days of mock sales transactions for SKU: {}", days, skuId);
        
        List<SalesTransaction> transactions = new ArrayList<>();
        Random random = new Random(skuId.hashCode()); // Consistent data for same SKU
        
        for (int day = days; day >= 1; day--) {
            Instant saleTime = Instant.now().minus(day, ChronoUnit.DAYS);
            
            // Generate 1-3 transactions per day
            int transactionsPerDay = 1 + random.nextInt(3);
            
            for (int i = 0; i < transactionsPerDay; i++) {
                int quantity = 1 + random.nextInt(10);
                double unitPrice = 20.0 + random.nextDouble() * 100.0;
                
                SalesTransaction transaction = new SalesTransaction();
                transaction.setPk("STORE#" + storeId + "#SKU#" + skuId);
                transaction.setSk("SALE#" + saleTime.toEpochMilli() + "#" + i);
                transaction.setTransactionId(UUID.randomUUID().toString());
                transaction.setStoreId(storeId);
                transaction.setSkuId(skuId);
                transaction.setQuantity(quantity);
                transaction.setUnitPrice(unitPrice);
                transaction.setTotalAmount(quantity * unitPrice);
                transaction.setTimestamp(saleTime.plus(i * 3, ChronoUnit.HOURS));
                
                transactions.add(transaction);
            }
        }
        
        return transactions;
    }

    /**
     * Generate mock demand forecast
     */
    public DemandForecast generateMockDemandForecast(String skuId, String storeId, int horizonDays) {
        log.debug("Generating mock demand forecast for SKU: {}, horizon: {} days", skuId, horizonDays);
        
        Random random = new Random(skuId.hashCode() + horizonDays);
        double baseDemand = 5.0 + random.nextDouble() * 20.0;
        
        DemandForecast forecast = new DemandForecast();
        forecast.setPk("STORE#" + storeId + "#SKU#" + skuId);
        forecast.setSk("FORECAST#" + LocalDate.now().plusDays(horizonDays));
        forecast.setForecastId(UUID.randomUUID().toString());
        forecast.setSkuId(skuId);
        forecast.setStoreId(storeId);
        forecast.setForecastDate(LocalDate.now().plusDays(horizonDays).toString());
        forecast.setPredictedDemand(baseDemand);
        forecast.setConfidenceLower(baseDemand * 0.8);
        forecast.setConfidenceUpper(baseDemand * 1.2);
        forecast.setModelUsed("MOCK_DATA_GENERATOR");
        forecast.setCreatedAt(Instant.now());
        
        return forecast;
    }

    /**
     * Generate mock inventory items for a store
     */
    public List<InventoryItem> generateMockInventoryItems(String storeId, int count) {
        log.debug("Generating {} mock inventory items for store: {}", count, storeId);
        
        List<InventoryItem> items = new ArrayList<>();
        Random random = new Random(storeId.hashCode());
        
        for (int i = 0; i < Math.min(count, MOCK_SKU_NAMES.length); i++) {
            String skuId = "MOCK_SKU_" + i;
            int quantity = 5 + random.nextInt(50);
            
            InventoryItem item = new InventoryItem();
            item.setPk("STORE#" + storeId + "#SKU#" + skuId);
            item.setSk("BATCH#" + UUID.randomUUID().toString());
            item.setStoreId(storeId);
            item.setSkuId(skuId);
            item.setBatchId(UUID.randomUUID().toString());
            item.setQuantity(quantity);
            item.setReorderPoint(quantity / 2);
            item.setSafetyStock(quantity / 4);
            item.setExpiryDate(LocalDate.now().plusDays(30 + random.nextInt(300)).toString());
            item.setLastRestockDate(LocalDate.now().minusDays(random.nextInt(30)).toString());
            
            items.add(item);
        }
        
        return items;
    }

    /**
     * Generate mock SKUs for a store
     */
    public List<Sku> generateMockSkus(String storeId, int count) {
        log.debug("Generating {} mock SKUs for store: {}", count, storeId);
        
        List<Sku> skus = new ArrayList<>();
        Random random = new Random(storeId.hashCode());
        
        for (int i = 0; i < Math.min(count, MOCK_SKU_NAMES.length); i++) {
            String skuId = "MOCK_SKU_" + i;
            
            Sku sku = new Sku();
            sku.setPk("STORE#" + storeId);
            sku.setSk("SKU#" + skuId);
            sku.setSkuId(skuId);
            sku.setName(MOCK_SKU_NAMES[i]);
            sku.setCategory(MOCK_CATEGORIES[i]);
            sku.setPrice(20.0 + random.nextDouble() * 100.0);
            sku.setCost(10.0 + random.nextDouble() * 50.0);
            
            skus.add(sku);
        }
        
        return skus;
    }

    /**
     * Generate mock risks for a store
     */
    public List<Risk> generateMockRisks(String storeId, int count) {
        log.debug("Generating {} mock risks for store: {}", count, storeId);
        
        List<Risk> risks = new ArrayList<>();
        Random random = new Random(storeId.hashCode());
        
        String[] riskTypes = {"STOCKOUT", "EXPIRY", "OVERSTOCK", "DEMAND_SPIKE"};
        String[] severities = {"HIGH", "MEDIUM", "LOW"};
        
        for (int i = 0; i < count; i++) {
            String skuId = "MOCK_SKU_" + random.nextInt(MOCK_SKU_NAMES.length);
            String riskType = riskTypes[random.nextInt(riskTypes.length)];
            String severity = severities[random.nextInt(severities.length)];
            
            Risk risk = new Risk();
            risk.setPk("STORE#" + storeId + "#SKU#" + skuId);
            risk.setSk("RISK#" + Instant.now().toEpochMilli() + "#" + i);
            risk.setRiskId(UUID.randomUUID().toString());
            risk.setStoreId(storeId);
            risk.setSkuId(skuId);
            risk.setRiskType(riskType);
            risk.setSeverity(severity);
            risk.setRiskScore(severity.equals("HIGH") ? 0.8 : severity.equals("MEDIUM") ? 0.5 : 0.3);
            risk.setEstimatedImpact(1000.0 + random.nextDouble() * 5000.0);
            risk.setTimeToImpactSeconds((long) (random.nextInt(7) * 24 * 3600));
            risk.setDetectedAt(Instant.now());
            risk.setStatus("ACTIVE");
            
            risks.add(risk);
        }
        
        return risks;
    }

    /**
     * Generate mock store with realistic Indian name
     */
    public Store generateMockStore(String storeId) {
        log.debug("Generating mock store: {}", storeId);
        
        // Use realistic Indian store names
        String storeName = INDIAN_STORE_NAMES[Math.abs(storeId.hashCode()) % INDIAN_STORE_NAMES.length];
        
        Store store = new Store();
        store.setPk("STORE");
        store.setSk("STORE#" + storeId);
        store.setStoreId(storeId);
        store.setName(storeName);
        store.setLocation(storeName.split(",")[1].trim()); // Extract city
        store.setStoreType("KIRANA_STORE");
        store.setTotalDailySalesAverage(15000.0 + new Random(storeId.hashCode()).nextDouble() * 10000.0);
        
        return store;
    }
}
