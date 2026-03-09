package com.retailmind.api.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Represents a backup of store data created before destructive import operations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Backup {
    
    /**
     * Unique identifier for the backup
     */
    private String backupId;
    
    /**
     * Store ID that this backup belongs to
     */
    private String storeId;
    
    /**
     * Timestamp when the backup was created
     */
    private LocalDateTime createdAt;
    
    /**
     * Timestamp when the backup will expire and be deleted
     */
    private LocalDateTime expiresAt;
    
    /**
     * Number of records in the backup
     */
    private int recordCount;
    
    /**
     * Storage location (S3 key or DynamoDB identifier)
     */
    private String storageLocation;
    
    /**
     * Check if the backup has expired
     */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
    
    /**
     * Check if the backup is still valid (not expired)
     */
    public boolean isValid() {
        return !isExpired();
    }
}
