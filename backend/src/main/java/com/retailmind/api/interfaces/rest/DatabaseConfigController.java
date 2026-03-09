package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.dto.DatabaseConfigRequest;
import com.retailmind.api.application.dto.DatabaseConfigResponse;
import com.retailmind.api.application.service.DatabaseConfigService;
import com.retailmind.api.domain.model.ConnectionStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/database")
@RequiredArgsConstructor
@Tag(name = "Database Configuration", description = "Database connection management")
public class DatabaseConfigController {

    private final DatabaseConfigService databaseConfigService;

    @PostMapping("/validate")
    @Operation(summary = "Validate database connection")
    public ResponseEntity<ConnectionStatus> validateConnection(@RequestBody DatabaseConfigRequest request) {
        ConnectionStatus status = databaseConfigService.validateConnection(request);
        return ResponseEntity.ok(status);
    }

    @PostMapping("/config")
    @Operation(summary = "Save database configuration")
    public ResponseEntity<DatabaseConfigResponse> saveConfiguration(@RequestBody DatabaseConfigRequest request) {
        DatabaseConfigResponse response = databaseConfigService.saveConfiguration(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/config")
    @Operation(summary = "Get current database configuration")
    public ResponseEntity<DatabaseConfigResponse> getConfiguration() {
        DatabaseConfigResponse response = databaseConfigService.getCurrentConfiguration();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/mode")
    @Operation(summary = "Switch data mode (Mock/Production)")
    public ResponseEntity<String> switchMode(@RequestParam String mode) {
        databaseConfigService.switchMode(mode);
        return ResponseEntity.ok("Data mode switched to: " + mode);
    }

    @GetMapping("/mode")
    @Operation(summary = "Get current data mode")
    public ResponseEntity<String> getCurrentMode() {
        String mode = databaseConfigService.getCurrentMode();
        return ResponseEntity.ok(mode);
    }
}
