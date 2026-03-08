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

    // Using Claude 3 Haiku for fast, cost-effective text generation
    private static final String MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

    public BedrockGenAIService(BedrockRuntimeClient bedrockClient, ObjectMapper objectMapper) {
        this.bedrockClient = bedrockClient;
        this.objectMapper = objectMapper;
    }

    public String generateInventoryRecommendation(String skuName, int currentStock, int averageDailyDemand) {
        String promptText = String.format(
                "You are an expert Indian retail inventory manager. " +
                        "I have an item '%s'. " +
                        "Current stock is %d units. Average daily demand is %d units. " +
                        "Provide a short, 2-sentence actionable recommendation on whether to reorder now, " +
                        "wait, or discount the item, and explain the business reasoning.",
                skuName, currentStock, averageDailyDemand);

        try {
            // Claude 3 Messages API payload format
            Map<String, Object> payload = new HashMap<>();
            payload.put("anthropic_version", "bedrock-2023-05-31");
            payload.put("max_tokens", 300);

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");

            Map<String, Object> content = new HashMap<>();
            content.put("type", "text");
            content.put("text", promptText);

            message.put("content", List.of(content));
            payload.put("messages", List.of(message));

            String payloadString = objectMapper.writeValueAsString(payload);

            InvokeModelRequest request = InvokeModelRequest.builder()
                    .modelId(MODEL_ID)
                    .contentType("application/json")
                    .accept("application/json")
                    .body(SdkBytes.fromString(payloadString, StandardCharsets.UTF_8))
                    .build();

            InvokeModelResponse response = bedrockClient.invokeModel(request);
            String responseBody = response.body().asUtf8String();

            // Extract text from Claude's response
            JsonNode rootNode = objectMapper.readTree(responseBody);
            return rootNode.path("content").get(0).path("text").asText();

        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error formatting Bedrock request/response", e);
        } catch (Exception e) {
            System.err.println("Bedrock Exception: " + e.getMessage());
            return "Unable to generate AI recommendation at this time. Please check stock levels manually.";
        }
    }
}
