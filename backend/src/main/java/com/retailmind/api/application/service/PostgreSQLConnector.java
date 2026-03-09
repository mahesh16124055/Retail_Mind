package com.retailmind.api.application.service;

import com.retailmind.api.domain.model.ConnectionStatus;
import com.retailmind.api.domain.model.DatabaseConfig;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PostgreSQL database connector implementation.
 * Provides connection validation, configuration management, and query execution for PostgreSQL databases.
 */
@Slf4j
@Service
public class PostgreSQLConnector implements DatabaseConnector {
    
    private final CredentialEncryptionService encryptionService;
    private HikariDataSource dataSource;
    
    public PostgreSQLConnector(CredentialEncryptionService encryptionService) {
        this.encryptionService = encryptionService;
    }
    
    @Override
    public ConnectionStatus validateConnection(DatabaseConfig config) {
        long startTime = System.currentTimeMillis();
        
        try {
            log.info("Validating PostgreSQL connection to {}:{}/{}", 
                    config.getHost(), config.getPort(), config.getDatabase());
            
            String jdbcUrl = buildJdbcUrl(config);
            String password = encryptionService.decrypt(config.getEncryptedPassword());
            
            // Create temporary connection for validation
            HikariConfig hikariConfig = new HikariConfig();
            hikariConfig.setJdbcUrl(jdbcUrl);
            hikariConfig.setUsername(config.getUsername());
            hikariConfig.setPassword(password);
            hikariConfig.setConnectionTimeout(10000); // 10 seconds
            hikariConfig.setMaximumPoolSize(1); // Only need one connection for validation
            
            try (HikariDataSource testDataSource = new HikariDataSource(hikariConfig);
                 Connection conn = testDataSource.getConnection()) {
                
                // Test connection with simple query
                try (PreparedStatement stmt = conn.prepareStatement("SELECT 1")) {
                    stmt.execute();
                }
                
                long latency = System.currentTimeMillis() - startTime;
                log.info("PostgreSQL connection validated successfully in {}ms", latency);
                
                return ConnectionStatus.builder()
                        .connected(true)
                        .latencyMs(latency)
                        .testedAt(LocalDateTime.now())
                        .build();
            }
            
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startTime;
            log.error("PostgreSQL connection validation failed", e);
            
            return ConnectionStatus.builder()
                    .connected(false)
                    .errorMessage(buildErrorMessage(e))
                    .latencyMs(latency)
                    .testedAt(LocalDateTime.now())
                    .build();
        }
    }
    
    @Override
    public void saveConfig(DatabaseConfig config) {
        log.info("Saving PostgreSQL configuration for {}", config.getDatabase());
        
        // Validate connection before saving
        ConnectionStatus status = validateConnection(config);
        if (!status.isConnected()) {
            throw new IllegalStateException("Cannot save configuration: " + status.getErrorMessage());
        }
        
        // Initialize connection pool
        initializeDataSource(config);
        
        log.info("PostgreSQL configuration saved successfully");
    }
    
    @Override
    public List<Map<String, Object>> query(String sql, Object... params) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            // Set parameters
            for (int i = 0; i < params.length; i++) {
                stmt.setObject(i + 1, params[i]);
            }
            
            // Execute query
            try (ResultSet rs = stmt.executeQuery()) {
                return mapResultSet(rs);
            }
            
        } catch (Exception e) {
            log.error("Query execution failed: {}", sql, e);
            throw new RuntimeException("Query execution failed: " + e.getMessage(), e);
        }
    }
    
    @Override
    public int execute(String sql, Object... params) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            // Set parameters
            for (int i = 0; i < params.length; i++) {
                stmt.setObject(i + 1, params[i]);
            }
            
            // Execute update
            return stmt.executeUpdate();
            
        } catch (Exception e) {
            log.error("Statement execution failed: {}", sql, e);
            throw new RuntimeException("Statement execution failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Initializes HikariCP connection pool with the provided configuration.
     */
    private void initializeDataSource(DatabaseConfig config) {
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
        }
        
        String jdbcUrl = buildJdbcUrl(config);
        String password = encryptionService.decrypt(config.getEncryptedPassword());
        
        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(jdbcUrl);
        hikariConfig.setUsername(config.getUsername());
        hikariConfig.setPassword(password);
        hikariConfig.setMinimumIdle(5);
        hikariConfig.setMaximumPoolSize(Math.min(Math.max(config.getPoolSize(), 5), 50));
        hikariConfig.setConnectionTimeout(10000); // 10 seconds
        hikariConfig.setIdleTimeout(600000); // 10 minutes
        hikariConfig.setMaxLifetime(1800000); // 30 minutes
        hikariConfig.setLeakDetectionThreshold(60000); // 1 minute
        
        dataSource = new HikariDataSource(hikariConfig);
        
        log.info("PostgreSQL connection pool initialized with size: {}", hikariConfig.getMaximumPoolSize());
    }
    
    /**
     * Builds JDBC URL from database configuration.
     */
    private String buildJdbcUrl(DatabaseConfig config) {
        return String.format("jdbc:postgresql://%s:%d/%s",
                config.getHost(), config.getPort(), config.getDatabase());
    }
    
    /**
     * Maps ResultSet to list of maps.
     */
    private List<Map<String, Object>> mapResultSet(ResultSet rs) throws Exception {
        List<Map<String, Object>> results = new ArrayList<>();
        ResultSetMetaData metaData = rs.getMetaData();
        int columnCount = metaData.getColumnCount();
        
        while (rs.next()) {
            Map<String, Object> row = new HashMap<>();
            for (int i = 1; i <= columnCount; i++) {
                row.put(metaData.getColumnName(i), rs.getObject(i));
            }
            results.add(row);
        }
        
        return results;
    }
    
    /**
     * Builds user-friendly error message from exception.
     */
    private String buildErrorMessage(Exception e) {
        String message = e.getMessage();
        
        if (message.contains("Connection refused") || message.contains("could not connect")) {
            return "Unable to connect to database. Please verify the host and port are correct and the database is running.";
        } else if (message.contains("password authentication failed")) {
            return "Authentication failed. Please check your username and password.";
        } else if (message.contains("database") && message.contains("does not exist")) {
            return "Database not found. Please verify the database name is correct.";
        } else if (message.contains("timeout")) {
            return "Connection timeout. The database may be unreachable or overloaded.";
        } else {
            return "Connection failed: " + message;
        }
    }
}
