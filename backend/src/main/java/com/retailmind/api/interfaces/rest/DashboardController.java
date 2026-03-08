package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.dto.InventoryInsightResponse;
import com.retailmind.api.application.service.InventoryInsightsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
    public ResponseEntity<List<InventoryInsightResponse>> getStoreInsights(
            @PathVariable String storeId,
            @RequestParam(name = "scenario", required = false) String scenario) {
        List<InventoryInsightResponse> responses = insightsService.getInsightsForStore(storeId, scenario);
        return ResponseEntity.ok(responses);
    }
}
