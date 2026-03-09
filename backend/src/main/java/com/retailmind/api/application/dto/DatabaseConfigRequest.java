package com.retailmind.api.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DatabaseConfigRequest {
    private String type; // mysql, postgresql, mongodb, dynamodb
    private String host;
    private Integer port;
    private String database;
    private String username;
    private String password;
    private Integer poolSize;
    
    // DynamoDB specific
    private String region;
    private String accessKeyId;
    private String secretAccessKey;
    private String tablePrefix;
}
