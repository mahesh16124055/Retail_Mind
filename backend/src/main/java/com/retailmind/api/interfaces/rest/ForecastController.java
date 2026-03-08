package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.dto.DemandForecastResponse;
import com.retailmind.api.application.service.DemandPredictionService;
import com.retailmind.api.application.service.ForecastVisualizationService;
import com.retailmind.api.domain.model.DemandForecast;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/forecast")
@CrossOrigin(origins = "*")
@Slf4j
@Tag(name = "Demand Forecasting", description = "Demand prediction and forecast visualization")
public class ForecastController {

    private final DemandPredictionService demandPredictionService;
    private final ForecastVisualizationService forecastVisualizationService;

    public ForecastController(DemandPredictionService demandPredictionService,
                            ForecastVisualizationService forecastVisualizationService) {
        this.demandPredictionService = demandPredictionService;
        this.forecastVisualizationService = forecastVisualizationService;
    }

    @GetMapping("/{storeId}/{skuId}")
    public ResponseEntity<List<DemandForecast>> get7DayForecast(
            @PathVariable String storeId,
            @PathVariable String skuId) {
        List<DemandForecast> forecasts = demandPredictionService.get7DayForecast(skuId, storeId);
        return ResponseEntity.ok(forecasts);
    }

    @GetMapping("/{storeId}/{skuId}/day/{days}")
    public ResponseEntity<DemandForecast> getForecast(
            @PathVariable String storeId,
            @PathVariable String skuId,
            @PathVariable int days) {
        DemandForecast forecast = demandPredictionService.predictDemand(skuId, storeId, days);
        return ResponseEntity.ok(forecast);
    }


    @GetMapping("/visualization/{skuId}")
    @Operation(summary = "Get forecast visualization data with confidence intervals")
    public ResponseEntity<DemandForecastResponse> getForecastVisualization(
            @PathVariable String skuId,
            @RequestParam(defaultValue = "7") int days) {
        log.info("Fetching forecast visualization for SKU: {} ({} days)", skuId, days);
        DemandForecastResponse forecast = forecastVisualizationService.getForecastVisualization(skuId, days);
        return ResponseEntity.ok(forecast);
    }

}
