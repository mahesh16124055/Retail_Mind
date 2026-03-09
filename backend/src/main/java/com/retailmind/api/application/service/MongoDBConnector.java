package com.retailmind.api.application.service;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.MongoException;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import com.mongodb.connection.ConnectionPoolSettings;
import com.retailmind.api.domain.model.ConnectionStatus;
import com.retailmind.api.domain.model.DatabaseConfig;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * MongoDB database connector implementation.
 * Provides connection validation, configuration management, and query execution for MongoDB databases.
 */
@Slf4j
@Service
public class MongoDBConnector implements DatabaseConnector {
    
    private final CredentialEncryptionService encryptionService;
    private MongoClient mongoClient;
    private String databaseName;
    
    public MongoDBConnector(CredentialEncryptionService encryptionService) {
        this.encryptionService = encryptionService;
    }
    
    @Override
    public ConnectionStatus validateConnection(DatabaseConfig config) {
        long startTime = System.currentTimeMillis();
        
        try {
            log.info("Validating MongoDB connection to {}:{}/{}", 
                    config.getHost(), config.getPort(), config.getDatabase());
            
            String connectionString = buildConnectionString(config);
            
            // Create temporary client for validation
            MongoClientSettings settings = MongoClientSettings.builder()
                    .applyConnectionString(new ConnectionString(connectionString))
                    .applyToSocketSettings(builder -> 
                            builder.connectTimeout(10, TimeUnit.SECONDS))
                    .build();
            
            try (MongoClient testClient = MongoClients.create(settings)) {
                // Test connection with ping command
                MongoDatabase database = testClient.getDatabase(config.getDatabase());
                Document pingResult = database.runCommand(new Document("ping", 1));
                
                if (pingResult.getDouble("ok") == 1.0) {
                    long latency = System.currentTimeMillis() - startTime;
                    log.info("MongoDB connection validated successfully in {}ms", latency);
                    
                    return ConnectionStatus.builder()
                            .connected(true)
                            .latencyMs(latency)
                            .testedAt(LocalDateTime.now())
                            .build();
                } else {
                    throw new MongoException("Ping command failed");
                }
            }
            
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startTime;
            log.error("MongoDB connection validation failed", e);
            
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
        log.info("Saving MongoDB configuration for {}", config.getDatabase());
        
        // Validate connection before saving
        ConnectionStatus status = validateConnection(config);
        if (!status.isConnected()) {
            throw new IllegalStateException("Cannot save configuration: " + status.getErrorMessage());
        }
        
        // Initialize MongoDB client
        initializeClient(config);
        
        log.info("MongoDB configuration saved successfully");
    }
    
    @Override
    public List<Map<String, Object>> query(String sql, Object... params) {
        // MongoDB uses different query syntax, this is a simplified implementation
        // In a real implementation, you would parse the SQL or use MongoDB query syntax
        throw new UnsupportedOperationException(
                "MongoDB uses document-based queries. Use MongoDB-specific query methods instead.");
    }
    
    @Override
    public int execute(String sql, Object... params) {
        // MongoDB uses different command syntax
        throw new UnsupportedOperationException(
                "MongoDB uses document-based commands. Use MongoDB-specific command methods instead.");
    }
    
    /**
     * Executes a MongoDB find query on a collection.
     * 
     * @param collectionName Collection to query
     * @param filter Query filter document
     * @return List of documents as maps
     */
    public List<Map<String, Object>> findDocuments(String collectionName, Document filter) {
        try {
            MongoDatabase database = mongoClient.getDatabase(databaseName);
            List<Map<String, Object>> results = new ArrayList<>();
            
            database.getCollection(collectionName)
                    .find(filter)
                    .forEach(doc -> results.add(new HashMap<>(doc)));
            
            return results;
            
        } catch (Exception e) {
            log.error("MongoDB query execution failed", e);
            throw new RuntimeException("Query execution failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Inserts a document into a MongoDB collection.
     * 
     * @param collectionName Collection to insert into
     * @param document Document to insert
     */
    public void insertDocument(String collectionName, Document document) {
        try {
            MongoDatabase database = mongoClient.getDatabase(databaseName);
            database.getCollection(collectionName).insertOne(document);
            
        } catch (Exception e) {
            log.error("MongoDB insert failed", e);
            throw new RuntimeException("Insert failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Updates documents in a MongoDB collection.
     * 
     * @param collectionName Collection to update
     * @param filter Filter to match documents
     * @param update Update operations
     * @return Number of documents modified
     */
    public long updateDocuments(String collectionName, Document filter, Document update) {
        try {
            MongoDatabase database = mongoClient.getDatabase(databaseName);
            return database.getCollection(collectionName)
                    .updateMany(filter, update)
                    .getModifiedCount();
            
        } catch (Exception e) {
            log.error("MongoDB update failed", e);
            throw new RuntimeException("Update failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Deletes documents from a MongoDB collection.
     * 
     * @param collectionName Collection to delete from
     * @param filter Filter to match documents
     * @return Number of documents deleted
     */
    public long deleteDocuments(String collectionName, Document filter) {
        try {
            MongoDatabase database = mongoClient.getDatabase(databaseName);
            return database.getCollection(collectionName)
                    .deleteMany(filter)
                    .getDeletedCount();
            
        } catch (Exception e) {
            log.error("MongoDB delete failed", e);
            throw new RuntimeException("Delete failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Initializes MongoDB client with connection pooling.
     */
    private void initializeClient(DatabaseConfig config) {
        if (mongoClient != null) {
            mongoClient.close();
        }
        
        String connectionString = buildConnectionString(config);
        int poolSize = Math.min(Math.max(config.getPoolSize(), 5), 50);
        
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(connectionString))
                .applyToConnectionPoolSettings(builder -> 
                        builder.maxSize(poolSize)
                                .minSize(5)
                                .maxConnectionIdleTime(10, TimeUnit.MINUTES)
                                .maxConnectionLifeTime(30, TimeUnit.MINUTES))
                .applyToSocketSettings(builder -> 
                        builder.connectTimeout(10, TimeUnit.SECONDS))
                .build();
        
        mongoClient = MongoClients.create(settings);
        databaseName = config.getDatabase();
        
        log.info("MongoDB client initialized with pool size: {}", poolSize);
    }
    
    /**
     * Builds MongoDB connection string from database configuration.
     */
    private String buildConnectionString(DatabaseConfig config) {
        String password = encryptionService.decrypt(config.getEncryptedPassword());
        
        return String.format("mongodb://%s:%s@%s:%d/%s",
                config.getUsername(),
                password,
                config.getHost(),
                config.getPort(),
                config.getDatabase());
    }
    
    /**
     * Builds user-friendly error message from exception.
     */
    private String buildErrorMessage(Exception e) {
        String message = e.getMessage();
        
        if (message.contains("Connection refused") || message.contains("Timed out")) {
            return "Unable to connect to database. Please verify the host and port are correct and the database is running.";
        } else if (message.contains("Authentication failed")) {
            return "Authentication failed. Please check your username and password.";
        } else if (message.contains("not authorized")) {
            return "Authorization failed. Please verify your user has access to the database.";
        } else if (message.contains("timeout")) {
            return "Connection timeout. The database may be unreachable or overloaded.";
        } else {
            return "Connection failed: " + message;
        }
    }
}
