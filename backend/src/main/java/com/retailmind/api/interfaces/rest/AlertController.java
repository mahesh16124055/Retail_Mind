package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.dto.AlertResponse;
import com.retailmind.api.application.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Alerts", description = "Real-time inventory alerts and notifications")
@CrossOrigin(origins = "*")
public class AlertController {
    
    private final AlertService alertService;
    
    @GetMapping("/{storeId}")
    @Operation(summary = "Get active alerts for a store")
    public ResponseEntity<List<AlertResponse>> getAlerts(@PathVariable String storeId) {
        log.info("Fetching alerts for store: {}", storeId);
        List<AlertResponse> alerts = alertService.getActiveAlerts(storeId);
        return ResponseEntity.ok(alerts);
    }
    
    @PostMapping("/{alertId}/acknowledge")
    @Operation(summary = "Acknowledge an alert")
    public ResponseEntity<Void> acknowledgeAlert(@PathVariable String alertId) {
        log.info("Acknowledging alert: {}", alertId);
        alertService.acknowledgeAlert(alertId);
        return ResponseEntity.ok().build();
    }
}
