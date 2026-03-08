package com.retailmind.api.application.service;

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
    
    private final Map<String, List<ChatResponse>> conversationHistory = new HashMap<>();
    
    public ChatResponse chat(ChatRequest request) {
        log.info("Processing chat request for store: {}", request.getStoreId());
        
        String conversationId = request.getConversationId() != null 
                ? request.getConversationId() 
                : UUID.randomUUID().toString();
        
        // Build context from inventory data
        String context = buildInventoryContext(request.getStoreId());
        
        // Generate AI response
        String aiResponse = generateAIResponse(request.getMessage(), context);
        
        ChatResponse response = ChatResponse.builder()
                .conversationId(conversationId)
                .message(aiResponse)
                .timestamp(LocalDateTime.now())
                .isAI(true)
                .build();
        
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
    
    private String generateAIResponse(String userMessage, String context) {
        try {
            String prompt = String.format(
                    "You are RetailMind AI, an expert retail inventory assistant. " +
                    "Context: %s\n\n" +
                    "User question: %s\n\n" +
                    "Provide a concise, actionable response (2-3 sentences max).",
                    context, userMessage
            );
            
            String requestBody = String.format(
                    "{\"anthropic_version\":\"bedrock-2023-05-31\"," +
                    "\"max_tokens\":200," +
                    "\"messages\":[{\"role\":\"user\",\"content\":\"%s\"}]}",
                    prompt.replace("\"", "\\\"").replace("\n", "\\n")
            );
            
            InvokeModelRequest invokeRequest = InvokeModelRequest.builder()
                    .modelId("anthropic.claude-3-haiku-20240307-v1:0")
                    .body(SdkBytes.fromUtf8String(requestBody))
                    .build();
            
            InvokeModelResponse response = bedrockClient.invokeModel(invokeRequest);
            String responseBody = response.body().asUtf8String();
            
            return extractTextFromBedrockResponse(responseBody);
            
        } catch (Exception e) {
            log.error("Error generating AI chat response", e);
            return generateFallbackResponse(userMessage, context);
        }
    }
    
    private String extractTextFromBedrockResponse(String responseBody) {
        try {
            int contentStart = responseBody.indexOf("\"text\":\"") + 8;
            int contentEnd = responseBody.indexOf("\"", contentStart);
            return responseBody.substring(contentStart, contentEnd)
                    .replace("\\n", "\n")
                    .replace("\\\"", "\"");
        } catch (Exception e) {
            return "I'm analyzing your inventory data. How can I help you optimize your stock?";
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
}
