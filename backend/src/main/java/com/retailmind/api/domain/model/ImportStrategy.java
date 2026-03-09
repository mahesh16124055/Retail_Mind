package com.retailmind.api.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Defines the strategy for importing data into the system.
 * Supports three types: Replace (delete and insert), Append (insert only), and Update (update existing).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportStrategy {
    
    /**
     * The type of import operation to perform
     */
    private ImportType type;
    
    /**
     * Whether to create a backup before performing the import
     */
    @Builder.Default
    private boolean createBackup = true;
    
    /**
     * Number of days to retain the backup before automatic deletion
     */
    @Builder.Default
    private int backupRetentionDays = 7;
    
    /**
     * Enum defining the types of import operations
     */
    public enum ImportType {
        /**
         * Delete all existing data and insert new data
         */
        REPLACE,
        
        /**
         * Add new records without modifying existing records
         */
        APPEND,
        
        /**
         * Update records with matching identifiers
         */
        UPDATE
    }
}
