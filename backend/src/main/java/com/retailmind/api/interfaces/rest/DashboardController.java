package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.dto.InventoryInsightResponse;
import com.retailmind.api.application.service.InventoryInsightsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@CrossOrigin(origins = "*") // Allow React frontend to connect easily
public class DashboardController {

    private final InventoryInsightsService insightsService;

    public DashboardController(InventoryInsightsService insightsService) {
        this.insightsService = insightsService;
    }

    @GetMapping("/insights/{storeId}")
    public ResponseEntity<List<InventoryInsightResponse>> getStoreInsights(@PathVariable String storeId) {
        List<InventoryInsightResponse> responses = insightsService.getInsightsForStore(storeId);
        return ResponseEntity.ok(responses);
    }
}
