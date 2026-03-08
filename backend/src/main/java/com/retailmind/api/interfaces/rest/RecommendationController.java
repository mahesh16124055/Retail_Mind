package com.retailmind.api.interfaces.rest;

import com.retailmind.api.application.service.RecommendationEngineService;
import com.retailmind.api.domain.model.Recommendation;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recommendations")
@CrossOrigin(origins = "*")
public class RecommendationController {

    private final RecommendationEngineService recommendationEngineService;

    public RecommendationController(RecommendationEngineService recommendationEngineService) {
        this.recommendationEngineService = recommendationEngineService;
    }

    @GetMapping("/store/{storeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'VIEWER')")
    public ResponseEntity<List<Recommendation>> getStoreRecommendations(@PathVariable String storeId) {
        List<Recommendation> recommendations = recommendationEngineService.generateRecommendations(storeId);
        return ResponseEntity.ok(recommendations);
    }
}
