package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.service.LogisticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoints for DRIVER accounts.
 * Identity is always derived from the JWT — never from client-supplied ids.
 */
@RestController
@RequestMapping("/api/driver")
public class DriverController {

    private final LogisticsService logisticsService;
    private final TokenService tokens;

    public DriverController(LogisticsService logisticsService, TokenService tokens) {
        this.logisticsService = logisticsService;
        this.tokens = tokens;
    }

    /** GET /api/driver/trips — trips assigned to the authenticated driver */
    @GetMapping("/trips")
    public ResponseEntity<?> myTrips(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        return ResponseEntity.ok(ApiResponse.ok(logisticsService.getDriverTrips(userId)));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}