package com.retailmind.api.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.retailmind.api.domain.model.Backup;
import com.retailmind.api.domain.model.DataRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for creating, storing, and restoring data backups.
 * Backups are stored in S3 with automatic expiration after retention period.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BackupService {
    
    private final S3Client s3Client;
    private final ObjectMapper objectMapper;
    
    private static final String BACKUP_BUCKET = "retailmind-backups";
    private static final int DEFAULT_RETENTION_DAYS = 7;
    
    /**
     * Create a backup of the provided data records
     * 
     * @param storeId Store identifier
     * @param records List of data records to backup
     * @return Backup object with metadata
     */
    public Backup createBackup(String storeId, List<DataRecord> records) {
        String backupId = generateBackupId();
        LocalDateTime createdAt = LocalDateTime.now();
        LocalDateTime expiresAt = createdAt.plusDays(DEFAULT_RETENTION_DAYS);
        
        String storageLocation = String.format("backups/%s/%s.json", storeId, backupId);
        
        try {
            // Serialize records to JSON
            String jsonData = objectMapper.writeValueAsString(records);
            byte[] data = jsonData.getBytes();
            
            // Upload to S3 with lifecycle expiration
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(BACKUP_BUCKET)
                    .key(storageLocation)
                    .contentType("application/json")
                    .metadata(java.util.Map.of(
                            "storeId", storeId,
                            "backupId", backupId,
                            "recordCount", String.valueOf(records.size()),
                            "createdAt", createdAt.toString(),
                            "expiresAt", expiresAt.toString()
                    ))
                    .build();
            
            s3Client.putObject(putRequest, RequestBody.fromBytes(data));
            
            log.info("Created backup {} for store {} with {} records", 
                    backupId, storeId, records.size());
            
            return Backup.builder()
                    .backupId(backupId)
                    .storeId(storeId)
                    .createdAt(createdAt)
                    .expiresAt(expiresAt)
                    .recordCount(records.size())
                    .storageLocation(storageLocation)
                    .build();
                    
        } catch (Exception e) {
            log.error("Failed to create backup for store {}", storeId, e);
            throw new RuntimeException("Failed to create backup", e);
        }
    }
    
    /**
     * Restore data from a backup
     * 
     * @param backupId Backup identifier
     * @return List of restored data records
     */
    public List<DataRecord> restore(String backupId) {
        try {
            Backup backup = getBackup(backupId);
            
            if (backup.isExpired()) {
                throw new IllegalStateException("Backup has expired: " + backupId);
            }
            
            // Download from S3
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(BACKUP_BUCKET)
                    .key(backup.getStorageLocation())
                    .build();
            
            byte[] data = s3Client.getObjectAsBytes(getRequest).asByteArray();
            
            // Deserialize JSON to records
            List<DataRecord> records = objectMapper.readValue(
                    data,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, DataRecord.class)
            );
            
            log.info("Restored {} records from backup {}", records.size(), backupId);
            
            return records;
            
        } catch (Exception e) {
            log.error("Failed to restore backup {}", backupId, e);
            throw new RuntimeException("Failed to restore backup", e);
        }
    }
    
    /**
     * Get backup metadata
     * 
     * @param backupId Backup identifier
     * @return Backup object with metadata
     */
    public Backup getBackup(String backupId) {
        try {
            // List objects with the backup ID prefix
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(BACKUP_BUCKET)
                    .prefix("backups/")
                    .build();
            
            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
            
            // Find the backup with matching ID
            for (S3Object s3Object : listResponse.contents()) {
                if (s3Object.key().contains(backupId)) {
                    // Get object metadata
                    HeadObjectRequest headRequest = HeadObjectRequest.builder()
                            .bucket(BACKUP_BUCKET)
                            .key(s3Object.key())
                            .build();
                    
                    HeadObjectResponse headResponse = s3Client.headObject(headRequest);
                    java.util.Map<String, String> metadata = headResponse.metadata();
                    
                    return Backup.builder()
                            .backupId(backupId)
                            .storeId(metadata.get("storeid"))
                            .createdAt(LocalDateTime.parse(metadata.get("createdat")))
                            .expiresAt(LocalDateTime.parse(metadata.get("expiresat")))
                            .recordCount(Integer.parseInt(metadata.get("recordcount")))
                            .storageLocation(s3Object.key())
                            .build();
                }
            }
            
            throw new IllegalArgumentException("Backup not found: " + backupId);
            
        } catch (Exception e) {
            log.error("Failed to get backup {}", backupId, e);
            throw new RuntimeException("Failed to get backup", e);
        }
    }
    
    /**
     * Check if a backup exists
     * 
     * @param backupId Backup identifier
     * @return true if backup exists, false otherwise
     */
    public boolean backupExists(String backupId) {
        try {
            getBackup(backupId);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Generate a unique backup ID
     */
    private String generateBackupId() {
        return "backup-" + UUID.randomUUID().toString();
    }
}
