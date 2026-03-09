package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.dto.DataImportRequest;
import com.retailmind.api.application.dto.DataImportResponse;
import com.retailmind.api.application.service.DataImportService;
import com.retailmind.api.domain.model.ImportResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for data import operations.
 * Provides endpoints for importing inventory data with different strategies.
 */
@RestController
@RequestMapping("/api/v1/data")
@RequiredArgsConstructor
@Tag(name = "Data Import", description = "Data import and export operations")
public class DataImportController {

    private final DataImportService dataImportService;

    @PostMapping("/import")
    @Operation(summary = "Import inventory data", 
               description = "Import data records using the specified strategy (Replace/Append/Update)")
    public ResponseEntity<DataImportResponse> importData(@RequestBody DataImportRequest request) {
        ImportResult result = dataImportService.importData(
            request.getRecords(),
            request.getStrategy(),
            request.getStoreId()
        );
        
        DataImportResponse response = DataImportResponse.builder()
            .recordsAdded(result.getRecordsAdded())
            .recordsUpdated(result.getRecordsUpdated())
            .recordsDeleted(result.getRecordsDeleted())
            .errors(result.getErrors())
            .backupId(result.getBackupId())
            .completedAt(result.getCompletedAt())
            .successful(result.isSuccessful())
            .totalRecordsProcessed(result.getTotalRecordsProcessed())
            .build();
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export")
    @Operation(summary = "Export inventory data",
               description = "Export data records for a specific store")
    public ResponseEntity<String> exportData(
        @RequestParam String storeId,
        @RequestParam(defaultValue = "csv") String format
    ) {
        String exportedData = dataImportService.exportData(storeId, format);
        return ResponseEntity.ok(exportedData);
    }
}
