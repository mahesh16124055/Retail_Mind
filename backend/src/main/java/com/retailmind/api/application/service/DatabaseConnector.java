package com.retailmind.api.application.service;

import com.retailmind.api.domain.model.ConnectionStatus;
import com.retailmind.api.domain.model.DatabaseConfig;

import java.util.List;
import java.util.Map;

/**
 * Interface for database connectivity operations.
 * Provides unified interface for connecting to different database types.
 */
public interface DatabaseConnector {
    
    /**
     * Validates a database connection with the provided configuration.
     * Tests connectivity and returns status with latency information.
     *
     * @param config Database configuration to validate
     * @return Connection status with success/failure and error details
     */
    ConnectionStatus validateConnection(DatabaseConfig config);
    
    /**
     * Saves database configuration with encrypted credentials.
     * Validates connection before saving.
     *
     * @param config Database configuration to save
     * @throws IllegalStateException if connection validation fails
     */
    void saveConfig(DatabaseConfig config);
    
    /**
     * Executes a query and returns results as a list of maps.
     * Each map represents a row with column names as keys.
     *
     * @param sql SQL query to execute
     * @param params Query parameters
     * @return List of result rows
     */
    List<Map<String, Object>> query(String sql, Object... params);
    
    /**
     * Executes an update/insert/delete statement.
     *
     * @param sql SQL statement to execute
     * @param params Statement parameters
     * @return Number of rows affected
     */
    int execute(String sql, Object... params);
}
