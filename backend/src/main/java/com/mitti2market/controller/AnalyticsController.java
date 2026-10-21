package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/farmer/{farmerId}")
    public ResponseEntity<?> getFarmerAnalytics(@PathVariable Long farmerId) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getFarmerAnalytics(farmerId)));
    }

    @GetMapping("/buyer/{buyerId}")
    public ResponseEntity<?> getBuyerAnalytics(@PathVariable Long buyerId) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getBuyerAnalytics(buyerId)));
    }

    @GetMapping("/fpo/{fpoId}")
    public ResponseEntity<?> getFpoAnalytics(@PathVariable Long fpoId) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getFpoAnalytics(fpoId)));
    }

    @GetMapping("/admin")
    public ResponseEntity<?> getAdminAnalytics() {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getAdminAnalytics()));
    }
}
