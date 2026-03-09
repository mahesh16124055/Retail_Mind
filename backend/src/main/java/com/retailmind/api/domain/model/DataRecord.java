package com.retailmind.api.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * Represents a single data record for import/export operations.
 * Contains core inventory fields and supports additional custom fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataRecord {
    
    /**
     * Unique identifier for the record (optional for new records)
     */
    private String id;
    
    /**
     * SKU name or product identifier
     */
    private String skuName;
    
    /**
     * Product category
     */
    private String category;
    
    /**
     * Quantity in stock
     */
    private int quantity;
    
    /**
     * Selling price
     */
    private double price;
    
    /**
     * Cost price
     */
    private double cost;
    
    /**
     * Additional custom fields that may be present in import data
     */
    @Builder.Default
    private Map<String, Object> additionalFields = new HashMap<>();
    
    /**
     * Validate that the record has all required fields
     */
    public boolean isValid() {
        return skuName != null && !skuName.trim().isEmpty()
                && category != null && !category.trim().isEmpty()
                && quantity >= 0
                && price >= 0
                && cost >= 0;
    }
    
    /**
     * Get a validation error message if the record is invalid
     */
    public String getValidationError() {
        if (skuName == null || skuName.trim().isEmpty()) {
            return "skuName is required";
        }
        if (category == null || category.trim().isEmpty()) {
            return "category is required";
        }
        if (quantity < 0) {
            return "quantity must be non-negative";
        }
        if (price < 0) {
            return "price must be non-negative";
        }
        if (cost < 0) {
            return "cost must be non-negative";
        }
        return null;
    }
}
