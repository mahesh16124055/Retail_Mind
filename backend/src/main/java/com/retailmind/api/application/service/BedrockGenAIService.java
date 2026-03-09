package com.retailmind.api.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BedrockGenAIService {

    private final BedrockRuntimeClient bedrockClient;
    private final ObjectMapper objectMapper;

    // Using Amazon Nova for fast, cost-effective text generation
    private static final String MODEL_ID = "amazon.nova-micro-v1:0";

    public BedrockGenAIService(BedrockRuntimeClient bedrockClient, ObjectMapper objectMapper) {
        this.bedrockClient = bedrockClient;
        this.objectMapper = objectMapper;
    }

    public String generateInventoryRecommendation(String skuName, int currentStock, int averageDailyDemand,
            String scenario) {
        String scenarioText = (scenario == null || scenario.isBlank())
                ? "The store is operating on a normal weekday demand pattern."
                : scenario;

        String promptText = String.format(
                "You are an expert Indian retail inventory manager for Indian Kirana and Quick Commerce stores. "
                        +
                        "Item: '%s'. Current stock: %d units. Approximate average daily demand: %d units. "
                        +
                        "Store scenario context: %s. "
                        +
                        "In at most 2 short sentences, clearly tell the shop owner whether to reorder now, wait, or discount the item, "
                        +
                        "and briefly explain the business reasoning in simple language.",
                skuName, currentStock, averageDailyDemand, scenarioText);

        try {
            Map<String, Object> payload = new HashMap<>();
            
            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            
            Map<String, Object> contentItem = new HashMap<>();
            contentItem.put("text", promptText);
            
            userMessage.put("content", List.of(contentItem));
            payload.put("messages", List.of(userMessage));
            
            Map<String, Object> inferenceConfig = new HashMap<>();
            inferenceConfig.put("max_new_tokens", 180);
            inferenceConfig.put("temperature", 0.7);
            
            payload.put("inferenceConfig", inferenceConfig);

            String payloadString = objectMapper.writeValueAsString(payload);

            InvokeModelRequest request = InvokeModelRequest.builder()
                    .modelId(MODEL_ID)
                    .contentType("application/json")
                    .accept("application/json")
                    .body(SdkBytes.fromString(payloadString, StandardCharsets.UTF_8))
                    .build();

            InvokeModelResponse response = bedrockClient.invokeModel(request);
            String responseBody = response.body().asUtf8String();

            // Extract text from Nova's response
            JsonNode rootNode = objectMapper.readTree(responseBody);
            return rootNode.path("output").path("message").path("content").get(0).path("text").asText().trim();

        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error formatting Bedrock request/response", e);
        } catch (Exception e) {
            System.err.println("Bedrock Exception: " + e.getMessage());
            return String.format(
                    "Based on stock of %d units and daily demand of %d units, keep a close eye on this SKU and use your judgment for reorders. (AI explanation is temporarily unavailable.)",
                    currentStock, averageDailyDemand);
        }
    }
}
