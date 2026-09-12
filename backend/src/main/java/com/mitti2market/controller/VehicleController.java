package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.service.LogisticsService;
import com.mitti2market.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoints for Mitti2Market platform transport vehicle inventory.
 *
 * Public (deal party):
 *   GET  /api/deals/{dealId}/logistics/vehicles   — eligible vehicles for deal
 *   POST /api/deals/{dealId}/logistics/assign     — assign vehicle
 *
 * Admin:
 *   GET  /api/vehicles          — all vehicles
 *   POST /api/vehicles          — create vehicle
 *   PUT  /api/vehicles/{id}     — update vehicle
 */
@RestController
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;
    private final LogisticsService logisticsService;
    private final TokenService tokens;

    // ── Deal-party endpoints ────────────────────────────────────────────────

    /** Eligible platform vehicles for a deal (capacity-checked + cost estimate) */
    @GetMapping("/api/deals/{dealId}/logistics/vehicles")
    public ResponseEntity<?> getVehiclesForDeal(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        try {
            return ResponseEntity.ok(ApiResponse.ok("Available vehicles", logisticsService.getAvailableVehicles(dealId, userId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Assign a platform vehicle to a deal */
    @PostMapping("/api/deals/{dealId}/logistics/assign")
    public ResponseEntity<?> assignVehicle(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        try {
            Long vehicleId = Long.valueOf(body.get("vehicleId").toString());
            return ResponseEntity.ok(ApiResponse.ok("Vehicle assigned", logisticsService.assignVehicle(dealId, vehicleId, userId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ── Admin endpoints ─────────────────────────────────────────────────────

    /** Admin: all vehicles */
    @GetMapping("/api/vehicles")
    public ResponseEntity<?> getAllVehicles(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        return ResponseEntity.ok(ApiResponse.ok(vehicleService.getAllVehicles()));
    }

    /** Admin: create new platform vehicle */
    @PostMapping("/api/vehicles")
    public ResponseEntity<?> createVehicle(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        try {
            return ResponseEntity.ok(ApiResponse.ok("Vehicle created", vehicleService.createVehicle(body)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Admin: update vehicle (availability, area, cost, etc.) */
    @PutMapping("/api/vehicles/{id}")
    public ResponseEntity<?> updateVehicle(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        try {
            return ResponseEntity.ok(ApiResponse.ok("Vehicle updated", vehicleService.updateVehicle(id, body)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}
