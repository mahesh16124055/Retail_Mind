package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.dto.StorePerformanceResponse;
import com.retailmind.api.application.service.MultiStoreAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Analytics", description = "Multi-store analytics and performance comparison")
@CrossOrigin(origins = "*")
public class AnalyticsController {
    
    private final MultiStoreAnalyticsService analyticsService;
    
    @GetMapping("/stores/performance")
    @Operation(summary = "Get performance metrics for all stores")
    public ResponseEntity<List<StorePerformanceResponse>> getAllStorePerformance() {
        log.info("Fetching performance metrics for all stores");
        List<StorePerformanceResponse> performance = analyticsService.getAllStorePerformance();
        return ResponseEntity.ok(performance);
    }
}
