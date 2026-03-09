package com.retailmind.api.application.dto;

import com.retailmind.api.domain.model.DataRecord;
import com.retailmind.api.domain.model.ImportStrategy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for data import operations.
 * Contains the data records to import and the import strategy to use.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataImportRequest {
    
    /**
     * List of data records to import
     */
    private List<DataRecord> records;
    
    /**
     * Import strategy defining how to handle the data
     */
    private ImportStrategy strategy;
    
    /**
     * Store ID for which to import the data
     */
    private String storeId;
}
