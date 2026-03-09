package com.retailmind.api.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Result of a data import operation containing statistics and error information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportResult {
    
    /**
     * Number of records added during the import
     */
    @Builder.Default
    private int recordsAdded = 0;
    
    /**
     * Number of records updated during the import
     */
    @Builder.Default
    private int recordsUpdated = 0;
    
    /**
     * Number of records deleted during the import
     */
    @Builder.Default
    private int recordsDeleted = 0;
    
    /**
     * List of error messages encountered during import
     */
    @Builder.Default
    private List<String> errors = new ArrayList<>();
    
    /**
     * ID of the backup created before import (if applicable)
     */
    private String backupId;
    
    /**
     * Timestamp when the import operation completed
     */
    private LocalDateTime completedAt;
    
    /**
     * Check if the import was successful (no errors)
     */
    public boolean isSuccessful() {
        return errors.isEmpty();
    }
    
    /**
     * Get total number of records processed
     */
    public int getTotalRecordsProcessed() {
        return recordsAdded + recordsUpdated + recordsDeleted;
    }
}
