package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.dto.FinancialImpactResponse;
import com.retailmind.api.application.service.FinancialAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/financial")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Financial Analytics", description = "Financial impact and ROI calculations")
@CrossOrigin(origins = "*")
public class FinancialController {
    
    private final FinancialAnalyticsService financialService;
    
    @GetMapping("/impact/{storeId}")
    @Operation(summary = "Calculate financial impact for all SKUs in a store")
    public ResponseEntity<List<FinancialImpactResponse>> getFinancialImpact(
            @PathVariable String storeId) {
        log.info("Calculating financial impact for store: {}", storeId);
        List<FinancialImpactResponse> impact = financialService.calculateFinancialImpact(storeId);
        return ResponseEntity.ok(impact);
    }
}
