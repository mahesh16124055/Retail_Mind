package com.retailmind.api.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * Database configuration model containing connection details and credentials.
 * Supports MySQL, PostgreSQL, MongoDB, and DynamoDB database types.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DatabaseConfig {
    
    /**
     * Type of database (MySQL, PostgreSQL, MongoDB, DynamoDB)
     */
    private DatabaseType type;
    
    /**
     * Database host address
     */
    private String host;
    
    /**
     * Database port number (1-65535)
     */
    private int port;
    
    /**
     * Database name
     */
    private String database;
    
    /**
     * Database username
     */
    private String username;
    
    /**
     * Plaintext password (used temporarily during validation, cleared after encryption)
     */
    private String password;
    
    /**
     * Encrypted password (encrypted using AWS KMS)
     */
    private String encryptedPassword;
    
    /**
     * Connection pool size (5-50 connections)
     */
    @Builder.Default
    private int poolSize = 10;
    
    /**
     * AWS Region (for DynamoDB)
     */
    private String region;
    
    /**
     * AWS Access Key ID (for DynamoDB)
     */
    private String accessKeyId;
    
    /**
     * AWS Secret Access Key (for DynamoDB)
     */
    private String secretAccessKey;
    
    /**
     * Table prefix (for DynamoDB)
     */
    private String tablePrefix;
    
    /**
     * Additional database-specific properties
     */
    @Builder.Default
    private Map<String, String> additionalProperties = new HashMap<>();
    
    /**
     * Database type enumeration
     */
    public enum DatabaseType {
        MYSQL,
        POSTGRESQL,
        MONGODB,
        DYNAMODB
    }
}
