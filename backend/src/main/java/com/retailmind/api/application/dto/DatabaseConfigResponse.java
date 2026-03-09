package com.retailmind.api.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DatabaseConfigResponse {
    private String type;
    private String host;
    private Integer port;
    private String database;
    private String username;
    private Integer poolSize;
    private boolean connected;
    private String message;
    
    // DynamoDB specific
    private String region;
    private String tablePrefix;
}
