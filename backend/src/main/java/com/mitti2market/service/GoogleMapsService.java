package com.mitti2market.service;

import com.mitti2market.dto.LatLng;
import com.mitti2market.dto.RouteCandidate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

/**
 * Thin wrapper around Google Maps Platform REST APIs.
 *
 * APIs used:
 *   - Geocoding API  : address → lat/lng
 *   - Directions API : origin + dest → multiple route alternatives
 *
 * All calls use the server-side API key from application.properties
 * (never the browser-restricted key).
 *
 * When the key is blank or any call fails, the calling service must catch
 * the exception and fall back to HaversineRouteService.
 */
@Slf4j
@Service
public class GoogleMapsService {

    private static final String GEOCODE_URL =
            "https://maps.googleapis.com/maps/api/geocode/json";
    private static final String DIRECTIONS_URL =
            "https://maps.googleapis.com/maps/api/directions/json";

    @Value("${google.maps.api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns true when a non-blank API key is configured.
     * Callers should check this before attempting any API call.
     */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Geocode a free-text address to lat/lng coordinates.
     *
     * @param address Human-readable address (e.g. "Burdwan, West Bengal, India")
     * @return LatLng or null if geocoding fails
     * @throws GoogleMapsException if the API call fails
     */
    public LatLng geocode(String address) {
        if (!isConfigured()) {
            throw new GoogleMapsException("Google Maps API key is not configured");
        }
        if (address == null || address.isBlank()) {
            throw new IllegalArgumentException("Address must not be blank");
        }

        String url = UriComponentsBuilder.fromHttpUrl(GEOCODE_URL)
                .queryParam("address", address)
                .queryParam("region", "in")           // bias results to India
                .queryParam("key", apiKey)
                .toUriString();

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            return parseGeocodeResponse(response, address);
        } catch (GoogleMapsException e) {
            throw e;
        } catch (Exception e) {
            log.error("Geocoding failed for address '{}': {}", address, e.getMessage());
            throw new GoogleMapsException("Geocoding request failed: " + e.getMessage(), e);
        }
    }

    /**
     * Fetch up to 3 route alternatives from the Google Maps Directions API.
     *
     * @param origin      Pickup coordinate
     * @param destination Delivery coordinate
     * @return List of RouteCandidate (1..3 routes) sorted by distanceKm ascending
     * @throws GoogleMapsException if the API call fails or returns no routes
     */
    public List<RouteCandidate> getRoutes(LatLng origin, LatLng destination) {
        if (!isConfigured()) {
            throw new GoogleMapsException("Google Maps API key is not configured");
        }

        String url = UriComponentsBuilder.fromHttpUrl(DIRECTIONS_URL)
                .queryParam("origin", origin.getLatitude() + "," + origin.getLongitude())
                .queryParam("destination", destination.getLatitude() + "," + destination.getLongitude())
                .queryParam("alternatives", "true")
                .queryParam("mode", "driving")
                .queryParam("region", "in")
                .queryParam("language", "en")
                .queryParam("key", apiKey)
                .toUriString();

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            return parseDirectionsResponse(response, origin, destination);
        } catch (GoogleMapsException e) {
            throw e;
        } catch (Exception e) {
            log.error("Directions API failed [{} → {}]: {}", origin, destination, e.getMessage());
            throw new GoogleMapsException("Directions request failed: " + e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Parsing helpers
    // ─────────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private LatLng parseGeocodeResponse(Map<String, Object> response, String address) {
        if (response == null) {
            throw new GoogleMapsException("Null response from Geocoding API for: " + address);
        }

        String status = (String) response.get("status");
        if (!"OK".equals(status)) {
            String errorMsg = (String) response.get("error_message");
            throw new GoogleMapsException(
                    "Geocoding API returned status " + status +
                    (errorMsg != null ? ": " + errorMsg : "") +
                    " for address: " + address);
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
        if (results == null || results.isEmpty()) {
            throw new GoogleMapsException("No geocoding results found for: " + address);
        }

        Map<String, Object> geometry = (Map<String, Object>) results.get(0).get("geometry");
        Map<String, Object> location = (Map<String, Object>) geometry.get("location");

        double lat = ((Number) location.get("lat")).doubleValue();
        double lng = ((Number) location.get("lng")).doubleValue();
        return LatLng.of(lat, lng);
    }

    @SuppressWarnings("unchecked")
    private List<RouteCandidate> parseDirectionsResponse(
            Map<String, Object> response, LatLng origin, LatLng destination) {

        if (response == null) {
            throw new GoogleMapsException("Null response from Directions API");
        }

        String status = (String) response.get("status");
        if (!"OK".equals(status)) {
            String errorMsg = (String) response.get("error_message");
            throw new GoogleMapsException(
                    "Directions API returned status " + status +
                    (errorMsg != null ? ": " + errorMsg : ""));
        }

        List<Map<String, Object>> routes = (List<Map<String, Object>>) response.get("routes");
        if (routes == null || routes.isEmpty()) {
            throw new GoogleMapsException("No routes found between " + origin + " and " + destination);
        }

        List<RouteCandidate> candidates = new ArrayList<>();
        for (int i = 0; i < routes.size(); i++) {
            candidates.add(parseRoute(routes.get(i), i));
        }
        return candidates;
    }

    @SuppressWarnings("unchecked")
    private RouteCandidate parseRoute(Map<String, Object> route, int index) {
        String summary = (String) route.getOrDefault("summary", "");

        // Warnings
        List<String> warnings = new ArrayList<>();
        Object warnObj = route.get("warnings");
        if (warnObj instanceof List<?> warnList) {
            for (Object w : warnList) {
                if (w instanceof String ws) warnings.add(ws);
            }
        }

        boolean hasTolls = warnings.stream().anyMatch(w -> w.toLowerCase().contains("toll"));

        // legs[0] contains distance and duration for a single-leg route
        List<Map<String, Object>> legs = (List<Map<String, Object>>) route.get("legs");
        if (legs == null || legs.isEmpty()) {
            throw new GoogleMapsException("Route leg data missing for route index " + index);
        }

        Map<String, Object> leg = legs.get(0);
        Map<String, Object> distObj = (Map<String, Object>) leg.get("distance");
        Map<String, Object> durObj  = (Map<String, Object>) leg.get("duration");

        double distanceMeters  = ((Number) distObj.get("value")).doubleValue();
        double durationSeconds = ((Number) durObj.get("value")).doubleValue();

        double distanceKm  = Math.round(distanceMeters  / 10.0) / 100.0; // round to 2dp
        double durationMin = Math.round(durationSeconds / 6.0 ) / 10.0;  // round to 1dp

        // Overview polyline
        Map<String, Object> overviewPoly = (Map<String, Object>) route.get("overview_polyline");
        String polylineEncoded = overviewPoly != null ? (String) overviewPoly.get("points") : "";

        return RouteCandidate.builder()
                .routeIndex(index)
                .distanceKm(distanceKm)
                .durationMinutes(durationMin)
                .polylineEncoded(polylineEncoded)
                .summary(summary)
                .warnings(warnings)
                .hasTolls(hasTolls)
                .hasHighways(summary.toUpperCase().contains("NH") || summary.toUpperCase().contains("EXPRESSWAY"))
                .recommended(false) // set by RouteOptimizationService
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Exception type
    // ─────────────────────────────────────────────────────────────────────────

    /** Thrown when any Google Maps API call fails. Callers fall back to haversine. */
    public static class GoogleMapsException extends RuntimeException {
        public GoogleMapsException(String msg) { super(msg); }
        public GoogleMapsException(String msg, Throwable cause) { super(msg, cause); }
    }
}
