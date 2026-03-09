package com.retailmind.api.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for data import operations.
 * Contains the results of the import including statistics and any errors.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataImportResponse {
    
    /**
     * Number of records added during the import
     */
    private int recordsAdded;
    
    /**
     * Number of records updated during the import
     */
    private int recordsUpdated;
    
    /**
     * Number of records deleted during the import
     */
    private int recordsDeleted;
    
    /**
     * List of error messages encountered during import
     */
    private List<String> errors;
    
    /**
     * ID of the backup created before import (if applicable)
     */
    private String backupId;
    
    /**
     * Timestamp when the import operation completed
     */
    private LocalDateTime completedAt;
    
    /**
     * Whether the import was successful
     */
    private boolean successful;
    
    /**
     * Total number of records processed
     */
    private int totalRecordsProcessed;
}
