package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.dto.ChatRequest;
import com.retailmind.api.application.dto.ChatResponse;
import com.retailmind.api.application.service.AIChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AI Chat", description = "Conversational AI assistant for inventory queries")
@CrossOrigin(origins = "*")
public class ChatController {
    
    private final AIChatService chatService;
    
    @PostMapping
    @Operation(summary = "Send a message to AI chat assistant")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        log.info("Processing chat message for store: {}", request.getStoreId());
        ChatResponse response = chatService.chat(request);
        return ResponseEntity.ok(response);
    }
}
