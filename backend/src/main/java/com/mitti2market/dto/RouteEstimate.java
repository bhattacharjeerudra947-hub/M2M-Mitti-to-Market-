package com.mitti2market.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Route estimate between two (or more) points.
 *
 * ALL values are ESTIMATES computed from configured assumptions
 * (haversine × road factor, or a live routing API when configured).
 * They are never presented as exact measurements.
 */
@Data
@Builder
public class RouteEstimate {

    /** Total estimated distance in km */
    private Double distanceKm;

    /** Total estimated travel time in minutes */
    private Double durationMinutes;

    /** Estimated arrival time if starting at startTime */
    private LocalDateTime eta;

    /** Estimated transport cost in ₹ (fuel + driver + tolls + handling) */
    private Double estimatedCost;

    /** Estimated cost per kg of cargo (₹) */
    private Double costPerKg;

    /** Which engine produced this estimate: "osrm" | "haversine" */
    private String provider;

    /** Human-readable summary e.g. "82.4 km · 2h 05m" */
    private String summary;

    /** Ordered waypoints [lat, lng] for map display (empty for haversine fallback) */
    private List<double[]> points;

    /** Warning to display when the estimate is coarse */
    private String caveat;
}