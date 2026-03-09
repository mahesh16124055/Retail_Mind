package com.retailmind.api.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Connection status model representing the result of a database connection validation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectionStatus {
    
    /**
     * Whether the connection was successful
     */
    private boolean connected;
    
    /**
     * Error message if connection failed
     */
    private String errorMessage;
    
    /**
     * Connection latency in milliseconds
     */
    private Long latencyMs;
    
    /**
     * Timestamp when the connection was tested
     */
    private LocalDateTime testedAt;
}
