package com.retailmind.api.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {
    private String conversationId;
    private String message;
    private LocalDateTime timestamp;
    private Boolean isAI;
    private BedrockMetadata bedrockMetadata;
    private Boolean isFallback;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BedrockMetadata {
        private String requestId;
        private String modelId;
        private Long latencyMs;
        private String region;
    }
}
