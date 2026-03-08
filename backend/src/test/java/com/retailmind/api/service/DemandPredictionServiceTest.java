package com.retailmind.api.service;

import com.retailmind.api.application.service.DemandPredictionService;
import com.retailmind.api.domain.model.DemandForecast;
import com.retailmind.api.domain.model.SalesTransaction;
import com.retailmind.api.domain.repository.RetailMindRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DemandPredictionServiceTest {

    @Mock
    private RetailMindRepository repository;

    @InjectMocks
    private DemandPredictionService demandPredictionService;

    private List<SalesTransaction> mockTransactions;

    @BeforeEach
    public void setUp() {
        mockTransactions = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            SalesTransaction transaction = new SalesTransaction();
            transaction.setPk("STORE#store1#SKU#sku1");
            transaction.setSk("SALE#" + Instant.now().minus(i, ChronoUnit.DAYS).toEpochMilli());
            transaction.setTransactionId(UUID.randomUUID().toString());
            transaction.setStoreId("store1");
            transaction.setSkuId("sku1");
            transaction.setQuantity(10);
            transaction.setUnitPrice(50.0);
            transaction.setTotalAmount(500.0);
            transaction.setTimestamp(Instant.now().minus(i, ChronoUnit.DAYS));
            mockTransactions.add(transaction);
        }
    }

    @Test
    public void testPredictDemand_WithHistoricalData() {
        when(repository.getSalesTransactions(anyString(), anyString(), anyInt()))
            .thenReturn(mockTransactions);
        when(repository.saveDemandForecast(any())).thenReturn(null);

        DemandForecast forecast = demandPredictionService.predictDemand("sku1", "store1", 7);

        assertNotNull(forecast);
        assertTrue(forecast.getPredictedDemand() > 0);
        assertNotNull(forecast.getConfidenceLower());
        assertNotNull(forecast.getConfidenceUpper());
        assertEquals("MOVING_AVERAGE_WITH_TREND", forecast.getModelUsed());
        
        verify(repository).saveDemandForecast(any());
    }

    @Test
    public void testPredictDemand_WithoutHistoricalData() {
        when(repository.getSalesTransactions(anyString(), anyString(), anyInt()))
            .thenReturn(new ArrayList<>());

        DemandForecast forecast = demandPredictionService.predictDemand("sku1", "store1", 7);

        assertNotNull(forecast);
        assertEquals(5.0, forecast.getPredictedDemand()); // Default value
        assertEquals("DEFAULT_NO_HISTORY", forecast.getModelUsed());
    }

    @Test
    public void testGet7DayForecast() {
        when(repository.getSalesTransactions(anyString(), anyString(), anyInt()))
            .thenReturn(mockTransactions);
        when(repository.saveDemandForecast(any())).thenReturn(null);

        List<DemandForecast> forecasts = demandPredictionService.get7DayForecast("sku1", "store1");

        assertNotNull(forecasts);
        assertEquals(7, forecasts.size());
        
        for (DemandForecast forecast : forecasts) {
            assertTrue(forecast.getPredictedDemand() >= 0);
        }
    }

    @Test
    public void testBatchPredict() {
        when(repository.getSalesTransactions(anyString(), anyString(), anyInt()))
            .thenReturn(mockTransactions);
        when(repository.saveDemandForecast(any())).thenReturn(null);

        List<String> skuIds = List.of("sku1", "sku2", "sku3");
        List<DemandForecast> forecasts = demandPredictionService.batchPredict("store1", skuIds, 7);

        assertNotNull(forecasts);
        assertEquals(3, forecasts.size());
    }

    @Test
    public void testConfidenceIntervalIsValid() {
        when(repository.getSalesTransactions(anyString(), anyString(), anyInt()))
            .thenReturn(mockTransactions);
        when(repository.saveDemandForecast(any())).thenReturn(null);

        DemandForecast forecast = demandPredictionService.predictDemand("sku1", "store1", 7);

        assertTrue(forecast.getConfidenceLower() <= forecast.getPredictedDemand());
        assertTrue(forecast.getPredictedDemand() <= forecast.getConfidenceUpper());
    }
}
