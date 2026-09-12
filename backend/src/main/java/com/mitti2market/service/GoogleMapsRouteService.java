package com.mitti2market.service;

import com.mitti2market.dto.LatLng;
import com.mitti2market.dto.RouteCandidate;
import com.mitti2market.dto.RouteEstimate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Primary RouteService implementation that uses Google Maps Directions API
 * with automatic fallback to HaversineRouteService if Google Maps is unconfigured or fails.
 */
@Slf4j
@Service
@Primary
public class GoogleMapsRouteService implements RouteService {

    private final GoogleMapsService googleMapsService;
    private final RouteService fallbackRouteService;

    public GoogleMapsRouteService(
            GoogleMapsService googleMapsService,
            @Qualifier("haversineRouteService") RouteService fallbackRouteService) {
        this.googleMapsService = googleMapsService;
        this.fallbackRouteService = fallbackRouteService;
    }

    @Override
    public RouteEstimate estimateRoute(double fromLat, double fromLng, double toLat, double toLng) {
        if (googleMapsService.isConfigured()) {
            try {
                List<RouteCandidate> candidates = googleMapsService.getRoutes(
                        LatLng.of(fromLat, fromLng),
                        LatLng.of(toLat, toLng)
                );
                if (candidates != null && !candidates.isEmpty()) {
                    // Pick primary candidate
                    RouteCandidate primary = candidates.get(0);
                    return RouteEstimate.builder()
                            .distanceKm(primary.getDistanceKm())
                            .durationMinutes(primary.getDurationMinutes())
                            .eta(LocalDateTime.now().plusMinutes(Math.round(primary.getDurationMinutes())))
                            .provider("google_maps")
                            .summary(primary.getSummary() != null && !primary.getSummary().isBlank() ?
                                    String.format("%.1f km via %s", primary.getDistanceKm(), primary.getSummary()) :
                                    String.format("%.1f km", primary.getDistanceKm()))
                            .points(decodePolyline(primary.getPolylineEncoded()))
                            .caveat("Google Maps Live Road Route")
                            .build();
                }
            } catch (Exception e) {
                log.warn("Google Maps Directions failed, falling back to offline route estimation: {}", e.getMessage());
            }
        }
        return fallbackRouteService.estimateRoute(fromLat, fromLng, toLat, toLng);
    }

    @Override
    public RouteEstimate estimateRoute(List<double[]> waypoints) {
        if (waypoints == null || waypoints.size() < 2) {
            throw new IllegalArgumentException("At least two waypoints are required");
        }
        if (waypoints.size() == 2) {
            return estimateRoute(waypoints.get(0)[0], waypoints.get(0)[1], waypoints.get(1)[0], waypoints.get(1)[1]);
        }
        // Multi-waypoint fallback to configured fallback engine
        return fallbackRouteService.estimateRoute(waypoints);
    }

    /**
     * Decode Google Maps encoded polyline into list of [lat, lng] coordinates.
     */
    public static List<double[]> decodePolyline(String encoded) {
        List<double[]> poly = new ArrayList<>();
        if (encoded == null || encoded.isEmpty()) {
            return poly;
        }
        int index = 0, len = encoded.length();
        int lat = 0, lng = 0;

        while (index < len) {
            int b, shift = 0, result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.add(new double[]{lat / 1E5, lng / 1E5});
        }
        return poly;
    }
}
