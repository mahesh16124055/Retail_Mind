package com.retailmind.api.application.service;

import com.retailmind.api.application.dto.DatabaseConfigRequest;
import com.retailmind.api.application.dto.DatabaseConfigResponse;
import com.retailmind.api.domain.model.ConnectionStatus;
import com.retailmind.api.domain.model.DatabaseConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DatabaseConfigService {

    private final Map<String, DatabaseConnector> connectors = new HashMap<>();
    private final CredentialEncryptionService encryptionService;
    
    private DatabaseConfig currentConfig;
    private String currentMode = "MOCK"; // MOCK or PRODUCTION

    public DatabaseConfigService(CredentialEncryptionService encryptionService,
                                  MySQLConnector mySQLConnector,
                                  PostgreSQLConnector postgreSQLConnector,
                                  MongoDBConnector mongoDBConnector) {
        this.encryptionService = encryptionService;
        this.connectors.put("mysql", mySQLConnector);
        this.connectors.put("postgresql", postgreSQLConnector);
        this.connectors.put("mongodb", mongoDBConnector);
    }

    public ConnectionStatus validateConnection(DatabaseConfigRequest request) {
        log.info("Validating connection for database type: {}", request.getType());
        
        try {
            DatabaseConnector connector = getConnector(request.getType());
            DatabaseConfig config = buildDatabaseConfig(request);
            
            ConnectionStatus status = connector.validateConnection(config);
            log.info("Connection validation result: {}", status.isConnected() ? "SUCCESS" : "FAILED");
            
            return status;
        } catch (Exception e) {
            log.error("Connection validation failed", e);
            return ConnectionStatus.builder()
                    .connected(false)
                    .errorMessage("Connection validation failed: " + e.getMessage())
                    .testedAt(LocalDateTime.now())
                    .build();
        }
    }

    public DatabaseConfigResponse saveConfiguration(DatabaseConfigRequest request) {
        log.info("Saving database configuration for type: {}", request.getType());
        
        // Validate connection before saving
        ConnectionStatus status = validateConnection(request);
        
        if (!status.isConnected()) {
            return DatabaseConfigResponse.builder()
                    .connected(false)
                    .message("Cannot save configuration: " + status.getErrorMessage())
                    .build();
        }
        
        // Encrypt password before storing
        DatabaseConfig config = buildDatabaseConfig(request);
        if (config.getPassword() != null && !config.getPassword().isEmpty()) {
            String encryptedPassword = encryptionService.encrypt(config.getPassword());
            config.setEncryptedPassword(encryptedPassword);
            config.setPassword(null); // Clear plaintext password
        }
        
        this.currentConfig = config;
        
        log.info("Database configuration saved successfully");
        
        return DatabaseConfigResponse.builder()
                .type(config.getType().name().toLowerCase())
                .host(config.getHost())
                .port(config.getPort())
                .database(config.getDatabase())
                .username(config.getUsername())
                .poolSize(config.getPoolSize())
                .region(config.getRegion())
                .tablePrefix(config.getTablePrefix())
                .connected(true)
                .message("Configuration saved successfully")
                .build();
    }

    public DatabaseConfigResponse getCurrentConfiguration() {
        if (currentConfig == null) {
            return DatabaseConfigResponse.builder()
                    .type("dynamodb")
                    .region("us-east-1")
                    .tablePrefix("RetailMind_")
                    .connected(true)
                    .message("Using default DynamoDB configuration")
                    .build();
        }
        
        return DatabaseConfigResponse.builder()
                .type(currentConfig.getType().name().toLowerCase())
                .host(currentConfig.getHost())
                .port(currentConfig.getPort())
                .database(currentConfig.getDatabase())
                .username(currentConfig.getUsername())
                .poolSize(currentConfig.getPoolSize())
                .region(currentConfig.getRegion())
                .tablePrefix(currentConfig.getTablePrefix())
                .connected(true)
                .message("Current configuration")
                .build();
    }

    public void switchMode(String mode) {
        if (!"MOCK".equalsIgnoreCase(mode) && !"PRODUCTION".equalsIgnoreCase(mode)) {
            throw new IllegalArgumentException("Invalid mode. Must be MOCK or PRODUCTION");
        }
        
        this.currentMode = mode.toUpperCase();
        log.info("Data mode switched to: {}", this.currentMode);
    }

    public String getCurrentMode() {
        return this.currentMode;
    }

    public boolean isProductionMode() {
        return "PRODUCTION".equalsIgnoreCase(this.currentMode);
    }

    public boolean isMockMode() {
        return "MOCK".equalsIgnoreCase(this.currentMode);
    }

    private DatabaseConnector getConnector(String type) {
        DatabaseConnector connector = connectors.get(type.toLowerCase());
        if (connector == null) {
            throw new IllegalArgumentException("Unsupported database type: " + type);
        }
        return connector;
    }

    private DatabaseConfig buildDatabaseConfig(DatabaseConfigRequest request) {
        DatabaseConfig.DatabaseType dbType;
        try {
            dbType = DatabaseConfig.DatabaseType.valueOf(request.getType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid database type: " + request.getType());
        }
        
        return DatabaseConfig.builder()
                .type(dbType)
                .host(request.getHost())
                .port(request.getPort() != null ? request.getPort() : 0)
                .database(request.getDatabase())
                .username(request.getUsername())
                .password(request.getPassword())
                .poolSize(request.getPoolSize() != null ? request.getPoolSize() : 10)
                .region(request.getRegion())
                .accessKeyId(request.getAccessKeyId())
                .secretAccessKey(request.getSecretAccessKey())
                .tablePrefix(request.getTablePrefix())
                .build();
    }
}
