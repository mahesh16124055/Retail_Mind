package com.retailmind.api.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.retailmind.api.application.dto.ChatRequest;
import com.retailmind.api.application.dto.ChatResponse;
import com.retailmind.api.domain.model.InventoryItem;
import com.retailmind.api.domain.model.Risk;
import com.retailmind.api.domain.model.Sku;
import com.retailmind.api.domain.repository.RetailMindRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;
import software.amazon.awssdk.core.SdkBytes;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIChatService {
    
    private final BedrockRuntimeClient bedrockClient;
    private final RetailMindRepository repository;
    private final RiskDetectionService riskDetectionService;
    private final ObjectMapper objectMapper;
    
    private static final String MODEL_ID = "amazon.nova-micro-v1:0";
    private final Map<String, List<ChatResponse>> conversationHistory = new HashMap<>();
    
    public ChatResponse chat(ChatRequest request) {
        log.info("Processing chat request for store: {}", request.getStoreId());
        
        String conversationId = request.getConversationId() != null 
                ? request.getConversationId() 
                : UUID.randomUUID().toString();
        
        // Build context from inventory data
        String context = buildInventoryContext(request.getStoreId());
        
        // Generate AI response with metadata
        ChatResponse response = generateAIResponseWithMetadata(request.getMessage(), context, conversationId);
        
        // Store in conversation history
        conversationHistory.computeIfAbsent(conversationId, k -> new ArrayList<>()).add(response);
        
        return response;
    }
    
    private String buildInventoryContext(String storeId) {
        List<Sku> skus = repository.getSkusForStore(storeId);
        
        int criticalCount = 0;
        int highCount = 0;
        List<String> criticalSkus = new ArrayList<>();
        
        for (Sku sku : skus) {
            List<InventoryItem> items = repository.getInventoryForSku(storeId, sku.getSkuId());
            int totalStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();
            
            Risk stockoutRisk = riskDetectionService.detectStockoutRisk(sku.getSkuId(), storeId);
            if (stockoutRisk != null && "CRITICAL".equals(stockoutRisk.getSeverity())) {
                criticalCount++;
                criticalSkus.add(sku.getName());
            } else if (stockoutRisk != null && "HIGH".equals(stockoutRisk.getSeverity())) {
                highCount++;
            }
        }
        
        return String.format(
                "Store %s has %d total SKUs. %d are at CRITICAL risk: %s. %d are at HIGH risk.",
                storeId, skus.size(), criticalCount, 
                String.join(", ", criticalSkus.stream().limit(3).collect(Collectors.toList())),
                highCount
        );
    }
    
    private ChatResponse generateAIResponseWithMetadata(String userMessage, String context, String conversationId) {
        log.info("Attempting to generate AI response using Bedrock for message: {}", userMessage);
        long startTime = System.currentTimeMillis();
        
        try {
            String promptText = String.format(
                    "You are RetailMind AI, an expert Indian retail inventory assistant for Kirana stores. " +
                    "Current inventory context: %s\n\n" +
                    "User question: %s\n\n" +
                    "Provide a helpful, concise response (2-3 sentences max) with specific actionable advice.",
                    context, userMessage
            );
            
            log.info("Building Bedrock request payload...");
            // Build Amazon Nova request payload
            Map<String, Object> payload = new HashMap<>();
            
            Map<String, Object> messageObj = new HashMap<>();
            messageObj.put("role", "user");
            
            Map<String, Object> contentItem = new HashMap<>();
            contentItem.put("text", promptText);
            
            messageObj.put("content", List.of(contentItem));
            payload.put("messages", List.of(messageObj));
            
            Map<String, Object> inferenceConfig = new HashMap<>();
            inferenceConfig.put("max_new_tokens", 250);
            inferenceConfig.put("temperature", 0.7);
            
            payload.put("inferenceConfig", inferenceConfig);
            
            String payloadString = objectMapper.writeValueAsString(payload);
            log.info("Payload created, invoking Bedrock model: {}", MODEL_ID);
            
            InvokeModelRequest invokeRequest = InvokeModelRequest.builder()
                    .modelId(MODEL_ID)
                    .contentType("application/json")
                    .accept("application/json")
                    .body(SdkBytes.fromString(payloadString, StandardCharsets.UTF_8))
                    .build();
            
            log.info("Calling Bedrock API...");
            InvokeModelResponse response = bedrockClient.invokeModel(invokeRequest);
            String responseBody = response.body().asUtf8String();
            String requestId = response.responseMetadata().requestId();
            long latencyMs = System.currentTimeMillis() - startTime;
            
            log.info("Received Bedrock response with request ID: {}, latency: {}ms", requestId, latencyMs);
            
            // Extract text from Nova's response using Jackson
            JsonNode rootNode = objectMapper.readTree(responseBody);
            String aiText = rootNode.path("output").path("message").path("content").get(0).path("text").asText();
            
            log.info("Successfully generated AI response using Bedrock: {}", aiText.substring(0, Math.min(50, aiText.length())));
            
            // Build response with Bedrock metadata
            return ChatResponse.builder()
                    .conversationId(conversationId)
                    .message(aiText.trim())
                    .timestamp(LocalDateTime.now())
                    .isAI(true)
                    .isFallback(false)
                    .bedrockMetadata(ChatResponse.BedrockMetadata.builder()
                            .requestId(requestId)
                            .modelId(MODEL_ID)
                            .latencyMs(latencyMs)
                            .region("us-east-1")
                            .build())
                    .build();
            
        } catch (Exception e) {
            long latencyMs = System.currentTimeMillis() - startTime;
            log.error("Error generating AI chat response from Bedrock - Exception type: {}, Message: {}, Latency: {}ms", 
                    e.getClass().getName(), e.getMessage(), latencyMs, e);
            log.error("Falling back to static response");
            
            String fallbackMessage = generateFallbackResponse(userMessage, context);
            
            // Return fallback response with isFallback flag set
            return ChatResponse.builder()
                    .conversationId(conversationId)
                    .message(fallbackMessage)
                    .timestamp(LocalDateTime.now())
                    .isAI(true)
                    .isFallback(true)
                    .bedrockMetadata(null)
                    .build();
        }
    }
    
    private String generateFallbackResponse(String userMessage, String context) {
        String lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.contains("critical") || lowerMessage.contains("risk")) {
            return "Based on current analysis, " + context + " I recommend prioritizing critical items for immediate action.";
        }
        
        if (lowerMessage.contains("stock") || lowerMessage.contains("inventory")) {
            return "Your inventory status: " + context + " Would you like specific recommendations for any SKU?";
        }
        
        if (lowerMessage.contains("recommend") || lowerMessage.contains("suggest")) {
            return "I recommend focusing on the critical risk items first. " + context + " Shall I provide detailed action plans?";
        }
        
        return "I'm here to help with inventory optimization. " + context + " What would you like to know?";
    }
    
    public String testBedrockConnection() {
        log.info("=== BEDROCK CONNECTION TEST START ===");
        try {
            String testPrompt = "Say 'Hello from Bedrock' in exactly 3 words.";
            
            Map<String, Object> payload = new HashMap<>();
            
            Map<String, Object> messageObj = new HashMap<>();
            messageObj.put("role", "user");
            
            Map<String, Object> contentItem = new HashMap<>();
            contentItem.put("text", testPrompt);
            
            messageObj.put("content", List.of(contentItem));
            payload.put("messages", List.of(messageObj));
            
            Map<String, Object> inferenceConfig = new HashMap<>();
            inferenceConfig.put("max_new_tokens", 50);
            inferenceConfig.put("temperature", 0.7);
            
            payload.put("inferenceConfig", inferenceConfig);
            
            String payloadString = objectMapper.writeValueAsString(payload);
            log.info("Test payload: {}", payloadString);
            
            InvokeModelRequest invokeRequest = InvokeModelRequest.builder()
                    .modelId(MODEL_ID)
                    .contentType("application/json")
                    .accept("application/json")
                    .body(SdkBytes.fromString(payloadString, StandardCharsets.UTF_8))
                    .build();
            
            log.info("Invoking Bedrock with model: {}", MODEL_ID);
            InvokeModelResponse response = bedrockClient.invokeModel(invokeRequest);
            String responseBody = response.body().asUtf8String();
            log.info("Raw Bedrock response: {}", responseBody);
            
            JsonNode rootNode = objectMapper.readTree(responseBody);
            String aiText = rootNode.path("output").path("message").path("content").get(0).path("text").asText();
            
            log.info("=== BEDROCK CONNECTION TEST SUCCESS ===");
            return "SUCCESS: Bedrock is working! Response: " + aiText;
            
        } catch (Exception e) {
            log.error("=== BEDROCK CONNECTION TEST FAILED ===");
            log.error("Exception class: {}", e.getClass().getName());
            log.error("Exception message: {}", e.getMessage());
            log.error("Stack trace:", e);
            return "FAILED: " + e.getClass().getSimpleName() + " - " + e.getMessage();
        }
    }
}
