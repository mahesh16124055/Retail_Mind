package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.service.RiskDetectionService;
import com.retailmind.api.domain.model.Risk;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/risks")
@CrossOrigin(origins = "*")
public class RiskController {

    private final RiskDetectionService riskDetectionService;

    public RiskController(RiskDetectionService riskDetectionService) {
        this.riskDetectionService = riskDetectionService;
    }

    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<Risk>> getStoreRisks(@PathVariable String storeId) {
        List<Risk> risks = riskDetectionService.detectAllRisks(storeId);
        return ResponseEntity.ok(risks);
    }

    @GetMapping("/store/{storeId}/sku/{skuId}")
    public ResponseEntity<Double> getSkuRiskScore(
            @PathVariable String storeId,
            @PathVariable String skuId) {
        double riskScore = riskDetectionService.calculateRiskScore(skuId, storeId);
        return ResponseEntity.ok(riskScore);
    }
}
