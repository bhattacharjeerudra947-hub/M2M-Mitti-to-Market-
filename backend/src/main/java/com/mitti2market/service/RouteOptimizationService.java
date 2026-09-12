package com.mitti2market.service;

import com.mitti2market.dto.RouteEstimate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Practical multi-delivery route optimization (MVP).
 *
 * Uses a capacity-aware nearest-neighbor heuristic over a distance matrix:
 *  - starts from the origin
 *  - repeatedly visits the nearest unvisited stop that fits in remaining capacity
 *  - returns the ordered route + totals
 *
 * This is deliberately simple and transparent. A more advanced engine
 * (TSP solver, time windows, live traffic) can replace this class later
 * without touching the callers.
 */
@Service
@RequiredArgsConstructor
public class RouteOptimizationService {

    private final RouteService routeService;
    private final LogisticsCostService costService;

    public static final double DEFAULT_CAPACITY_KG = 5000.0;

    /**
     * Optimize a set of stops.
     *
     * @param origin    [lat, lng] of the vehicle / warehouse
     * @param stops     each stop: {lat, lng, label, weightKg}
     * @param capacityKg maximum cargo the vehicle can carry (null → default)
     */
    public Map<String, Object> optimize(List<double[]> origin, List<Map<String, Object>> stops, Double capacityKg) {
        if (stops == null || stops.isEmpty()) {
            throw new IllegalArgumentException("At least one stop is required");
        }
        double capacity = capacityKg != null && capacityKg > 0 ? capacityKg : DEFAULT_CAPACITY_KG;

        // ── 1. Build the distance matrix once (haversine — cheap and stable) ──
        int n = stops.size();
        double[][] dist = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == j) { dist[i][j] = 0; continue; }
                dist[i][j] = RouteService.haversineKm(
                        (Double) stops.get(i).get("lat"), (Double) stops.get(i).get("lng"),
                        (Double) stops.get(j).get("lat"), (Double) stops.get(j).get("lng"));
            }
        }

        // ── 2. Nearest-neighbor with capacity awareness ──
        List<Map<String, Object>> ordered = new ArrayList<>();
        List<Integer> visited = new ArrayList<>();
        double[] cursor = origin.get(0);
        double usedKg = 0;
        int current = -1; // -1 = at origin

        while (visited.size() < n) {
            int bestIdx = -1;
            double bestDist = Double.MAX_VALUE;
            for (int j = 0; j < n; j++) {
                if (visited.contains(j)) continue;
                double weight = weightKg(stops.get(j));
                if (usedKg + weight > capacity) continue; // capacity-aware
                double d = current == -1
                        ? RouteService.haversineKm(cursor[0], cursor[1],
                                (Double) stops.get(j).get("lat"), (Double) stops.get(j).get("lng"))
                        : dist[current][j];
                if (d < bestDist) { bestDist = d; bestIdx = j; }
            }
            if (bestIdx == -1) break; // remaining stops don't fit capacity
            visited.add(bestIdx);
            usedKg += weightKg(stops.get(bestIdx));
            ordered.add(stops.get(bestIdx));
            current = bestIdx;
        }

        if (ordered.isEmpty()) {
            throw new IllegalArgumentException("No stops fit within the vehicle capacity of " + capacity + " kg");
        }

        // ── 3. Build the full ordered waypoint list and re-estimate the route ──
        List<double[]> waypoints = new ArrayList<>();
        waypoints.add(origin.get(0));
        for (Map<String, Object> s : ordered) {
            waypoints.add(new double[]{(Double) s.get("lat"), (Double) s.get("lng")});
        }

        RouteEstimate estimate = routeService.estimateRoute(waypoints);

        // Stops that had to be skipped (capacity exceeded)
        List<String> skipped = new ArrayList<>();
        for (int j = 0; j < n; j++) {
            if (!visited.contains(j)) skipped.add(String.valueOf(stops.get(j).get("label")));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("orderedStops", ordered.stream().map(s -> Map.of(
                "label", s.get("label") != null ? s.get("label") : "",
                "lat", s.get("lat"),
                "lng", s.get("lng"),
                "weightKg", s.get("weightKg")
        )).toList());
        result.put("totalWeightKg", Math.round(usedKg * 100.0) / 100.0);
        result.put("capacityKg", capacity);
        result.put("distanceKm", estimate.getDistanceKm());
        result.put("durationMinutes", estimate.getDurationMinutes());
        result.put("eta", estimate.getEta());
        result.put("summary", estimate.getSummary());
        result.put("provider", estimate.getProvider());
        result.put("caveat", estimate.getCaveat());
        result.put("skippedStops", skipped);
        result.put("label", "Estimated using configured assumptions (nearest-neighbor heuristic).");

        // Cost for the full load
        Map<String, Object> cost = costService.estimateCost(estimate, usedKg);
        result.put("estimatedCost", cost.get("total"));
        result.put("costPerKg", cost.get("costPerKg"));
        result.put("costBreakdown", cost);

        return result;
    }

    /**
     * Score and select the most optimal route among Google Maps alternatives.
     * Primary priority: Shortest practical distance.
     * Secondary priority: Lower estimated travel time.
     * Provides an explainable rationale for the decision.
     */
    public com.mitti2market.dto.OptimalRouteResult scoreAndSelect(
            List<com.mitti2market.dto.RouteCandidate> candidates,
            com.mitti2market.dto.LatLng origin,
            com.mitti2market.dto.LatLng destination,
            String originSource,
            String destinationSource,
            Double quantityKg) {

        if (candidates == null || candidates.isEmpty()) {
            throw new IllegalArgumentException("At least one route candidate is required");
        }

        double minDistance = Double.MAX_VALUE;
        double minDuration = Double.MAX_VALUE;

        for (com.mitti2market.dto.RouteCandidate rc : candidates) {
            if (rc.getDistanceKm() < minDistance) minDistance = rc.getDistanceKm();
            if (rc.getDurationMinutes() < minDuration) minDuration = rc.getDurationMinutes();
        }

        // Composite scoring: distance weight = 0.65, duration weight = 0.35
        for (com.mitti2market.dto.RouteCandidate rc : candidates) {
            double distRatio = minDistance > 0 ? (rc.getDistanceKm() / minDistance) : 1.0;
            double durRatio = minDuration > 0 ? (rc.getDurationMinutes() / minDuration) : 1.0;
            double score = (distRatio * 0.65) + (durRatio * 0.35);
            rc.setScore(Math.round(score * 1000.0) / 1000.0);
        }

        // Determine best route
        com.mitti2market.dto.RouteCandidate shortest = candidates.stream()
                .min(Comparator.comparingDouble(com.mitti2market.dto.RouteCandidate::getDistanceKm))
                .orElse(candidates.get(0));

        com.mitti2market.dto.RouteCandidate fastest = candidates.stream()
                .min(Comparator.comparingDouble(com.mitti2market.dto.RouteCandidate::getDurationMinutes))
                .orElse(candidates.get(0));

        com.mitti2market.dto.RouteCandidate selected;
        String why;
        String selectionType;

        double timeSavedMin = shortest.getDurationMinutes() - fastest.getDurationMinutes();
        double extraDistanceKm = fastest.getDistanceKm() - shortest.getDistanceKm();
        double extraDistPct = shortest.getDistanceKm() > 0 ? (extraDistanceKm / shortest.getDistanceKm()) * 100.0 : 0.0;

        // If fastest route saves > 15 minutes and extra distance is reasonable (< 15%), choose fastest
        if (timeSavedMin >= 15 && extraDistPct <= 15.0 && extraDistanceKm > 0) {
            selected = fastest;
            selectionType = "FASTEST";
            why = String.format("Saves %d min of travel time with only %.1f km extra distance (%.0f%% difference). Avoids major delays and congested roads.",
                    Math.round(timeSavedMin), extraDistanceKm, extraDistPct);
        } else if (Math.abs(shortest.getDistanceKm() - fastest.getDistanceKm()) < 1.0) {
            selected = fastest;
            selectionType = "SHORTEST";
            why = String.format("Shortest practical distance (%.1f km) and lowest estimated travel time (%d min).",
                    selected.getDistanceKm(), Math.round(selected.getDurationMinutes()));
        } else if (timeSavedMin > 5 && extraDistPct <= 8.0) {
            selected = fastest;
            selectionType = "BALANCED";
            why = String.format("Best balance of distance and transit time. Saves %d min with only %.1f km additional travel.",
                    Math.round(timeSavedMin), extraDistanceKm);
        } else {
            selected = shortest;
            selectionType = "SHORTEST";
            why = String.format("Shortest direct road route (%.1f km). Estimated travel time is %d min.",
                    shortest.getDistanceKm(), Math.round(shortest.getDurationMinutes()));
        }

        selected.setRecommended(true);

        // Estimate logistics cost for recommended route
        double cargoKg = quantityKg != null && quantityKg > 0 ? quantityKg : 0.0;
        com.mitti2market.dto.RouteEstimate est = com.mitti2market.dto.RouteEstimate.builder()
                .distanceKm(selected.getDistanceKm())
                .durationMinutes(selected.getDurationMinutes())
                .build();
        Map<String, Object> costMap = costService.estimateCost(est, cargoKg);

        Double totalCost = costMap.get("total") instanceof Number n ? n.doubleValue() : null;
        Double costPerKg = costMap.get("costPerKg") instanceof Number n ? n.doubleValue() : null;

        return com.mitti2market.dto.OptimalRouteResult.builder()
                .selectedRoute(selected)
                .allRoutes(candidates)
                .origin(origin)
                .destination(destination)
                .whySelected(why)
                .selectionType(selectionType)
                .originSource(originSource != null ? originSource : "REGISTERED")
                .destinationSource(destinationSource != null ? destinationSource : "REGISTERED")
                .provider("google_maps")
                .estimatedCostRupees(totalCost)
                .costPerKg(costPerKg)
                .quantityKg(cargoKg)
                .build();
    }

    private double weightKg(Map<String, Object> stop) {
        Object w = stop.get("weightKg");
        if (w == null) return 0.0;
        try { return ((Number) w).doubleValue(); } catch (Exception e) { return 0.0; }
    }
}