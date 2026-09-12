package com.mitti2market.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * A single route candidate returned by Google Maps Directions API.
 * Google can return up to 3 alternatives; we score and select the optimal one.
 */
@Data
@Builder
public class RouteCandidate {

    /** Total road distance in km */
    private double distanceKm;

    /** Total estimated travel time in minutes (traffic-aware when available) */
    private double durationMinutes;

    /** Google-encoded polyline string for map display */
    private String polylineEncoded;

    /** Human-readable summary e.g. "NH 2" or "via Durgapur Expressway" */
    private String summary;

    /** Route index from Google (0 = primary, 1+ = alternatives) */
    private int routeIndex;

    /** Composite optimization score (lower is better). Computed by RouteOptimizationService. */
    private double score;

    /** Any warnings from Google e.g. "This route has tolls" */
    private List<String> warnings;

    /** Whether this route has tolls */
    private boolean hasTolls;

    /** Whether this route uses highways */
    private boolean hasHighways;

    /** Whether this is the recommended route selected by the optimizer */
    private boolean recommended;
}
