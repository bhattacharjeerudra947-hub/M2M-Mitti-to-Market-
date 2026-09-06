package com.mitti2market.service;

import com.mitti2market.dto.RouteEstimate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Default route engine.
 *
 * Strategy:
 *  - If ROUTING_API_URL (an OSRM-compatible server) is configured, ask it for
 *    real road distance/duration and the polyline waypoints.
 *  - Otherwise fall back to haversine straight-line distance × road factor,
 *    clearly labelled as a coarse estimate.
 *
 * Never fabricates traffic or live data — durations assume a configurable
 * average speed and are always presented as estimates.
 */
@Service
public class HaversineRouteService implements RouteService {

    /** Road-vs-straight-line multiplier for the haversine fallback */
    private static final double ROAD_FACTOR = 1.3;

    private final double avgSpeedKmh;
    private final String routingApiUrl;
    private final RestTemplate restTemplate = new RestTemplate();

    public HaversineRouteService(
            @Value("${route.avg-speed-kmh:40}") double avgSpeedKmh,
            @Value("${routing.api-url:}") String routingApiUrl) {
        this.avgSpeedKmh = avgSpeedKmh;
        this.routingApiUrl = routingApiUrl;
    }

    @Override
    public RouteEstimate estimateRoute(double fromLat, double fromLng, double toLat, double toLng) {
        return estimateRoute(List.of(new double[]{fromLat, fromLng}, new double[]{toLat, toLng}));
    }

    @Override
    public RouteEstimate estimateRoute(List<double[]> waypoints) {
        if (waypoints == null || waypoints.size() < 2) {
            throw new IllegalArgumentException("At least two waypoints are required");
        }

        // Try a real routing provider when configured
        if (routingApiUrl != null && !routingApiUrl.isBlank()) {
            try {
                return osrmEstimate(waypoints);
            } catch (Exception e) {
                // fall through to haversine — never let a routing outage break the deal
            }
        }
        return haversineEstimate(waypoints);
    }

    /** OSRM table/route call (public OSRM demo server or self-hosted). */
    private RouteEstimate osrmEstimate(List<double[]> waypoints) {
        String coords = waypoints.stream()
                .map(p -> p[1] + "," + p[0]) // OSRM expects lon,lat
                .reduce((a, b) -> a + ";" + b)
                .orElseThrow();

        @SuppressWarnings("unchecked")
        Map<String, Object> resp = restTemplate.getForObject(
                routingApiUrl + "/route/v1/driving/" + coords + "?overview=full&geometries=geojson",
                Map.class);

        if (resp == null || resp.get("routes") == null) {
            throw new IllegalStateException("Routing provider returned no routes");
        }

        List<Map<String, Object>> routes = (List<Map<String, Object>>) resp.get("routes");
        Map<String, Object> route = routes.get(0);

        double distanceKm = ((Number) route.get("distance")).doubleValue() / 1000.0;
        double durationMin = ((Number) route.get("duration")).doubleValue() / 60.0;

        // Extract the polyline points for map display
        List<double[]> points = new ArrayList<>();
        Map<String, Object> geometry = (Map<String, Object>) route.get("geometry");
        if (geometry != null && geometry.get("coordinates") != null) {
            List<List<Number>> coordsList = (List<List<Number>>) geometry.get("coordinates");
            for (List<Number> c : coordsList) {
                points.add(new double[]{c.get(1).doubleValue(), c.get(0).doubleValue()});
            }
        }

        return RouteEstimate.builder()
                .distanceKm(round2(distanceKm))
                .durationMinutes(round1(durationMin))
                .eta(LocalDateTime.now().plusMinutes(Math.round(durationMin)))
                .provider("osrm")
                .summary(formatSummary(distanceKm, durationMin))
                .points(points.isEmpty() ? null : points)
                .caveat("Estimated using live road routing.")
                .build();
    }

    /** Deterministic offline fallback — straight-line distance × road factor. */
    private RouteEstimate haversineEstimate(List<double[]> waypoints) {
        double straightKm = 0;
        for (int i = 0; i < waypoints.size() - 1; i++) {
            double[] a = waypoints.get(i);
            double[] b = waypoints.get(i + 1);
            straightKm += RouteService.haversineKm(a[0], a[1], b[0], b[1]);
        }

        double roadKm = straightKm * ROAD_FACTOR;
        double durationMin = (roadKm / avgSpeedKmh) * 60.0;

        return RouteEstimate.builder()
                .distanceKm(round2(roadKm))
                .durationMinutes(round1(durationMin))
                .eta(LocalDateTime.now().plusMinutes(Math.round(durationMin)))
                .provider("haversine")
                .summary(formatSummary(roadKm, durationMin))
                .points(List.of(waypoints.get(0), waypoints.get(waypoints.size() - 1)))
                .caveat("Estimated using configured assumptions (straight-line × road factor, " + avgSpeedKmh + " km/h avg). Not a live road route.")
                .build();
    }

    private String formatSummary(double km, double minutes) {
        long h = (long) (minutes / 60);
        long m = Math.round(minutes % 60);
        String time = h > 0 ? h + "h " + String.format("%02d", m) + "m" : m + " min";
        return String.format("%.1f km · %s", km, time);
    }

    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }
    private double round1(double v) { return Math.round(v * 10.0) / 10.0; }
}