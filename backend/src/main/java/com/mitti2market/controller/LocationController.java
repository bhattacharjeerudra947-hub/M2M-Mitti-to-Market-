package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.GeocodeRequest;
import com.mitti2market.dto.LatLng;
import com.mitti2market.dto.OptimalRouteResult;
import com.mitti2market.dto.RouteRequest;
import com.mitti2market.service.GoogleMapsService;
import com.mitti2market.service.LogisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LocationController {

    private final GoogleMapsService googleMapsService;
    private final LogisticsService logisticsService;

    /**
     * Geocode an address (free-text or structured village/district/state) into coordinates.
     */
    @PostMapping("/location/geocode")
    public ResponseEntity<?> geocode(@RequestBody GeocodeRequest request) {
        try {
            String addressString = request.toAddressString();
            if (addressString.isBlank()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Address must not be empty"));
            }

            if (!googleMapsService.isConfigured()) {
                return ResponseEntity.ok(ApiResponse.ok("Geocoding API not configured", null));
            }

            LatLng latLng = googleMapsService.geocode(addressString);
            return ResponseEntity.ok(ApiResponse.ok("Address geocoded successfully", latLng));
        } catch (Exception e) {
            log.warn("Geocoding failed: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.ok("Geocoding failed: " + e.getMessage(), null));
        }
    }

    /**
     * Calculate route alternatives between origin and destination with transparent optimization.
     */
    @PostMapping("/logistics/route")
    public ResponseEntity<?> calculateRoute(@RequestBody RouteRequest request) {
        try {
            OptimalRouteResult result = logisticsService.calculateRoute(request);
            return ResponseEntity.ok(ApiResponse.ok("Route calculated successfully", result));
        } catch (Exception e) {
            log.error("Route calculation error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to calculate route: " + e.getMessage()));
        }
    }
}
