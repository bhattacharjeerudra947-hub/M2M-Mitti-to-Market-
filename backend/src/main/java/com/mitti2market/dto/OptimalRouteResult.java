package com.mitti2market.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Result of route optimization — the selected optimal route plus all alternatives,
 * along with a human-readable explanation of why this route was chosen.
 *
 * This is what the frontend displays in the "Why this route?" section.
 */
@Data
@Builder
public class OptimalRouteResult {

    /** The route chosen by the optimizer */
    private RouteCandidate selectedRoute;

    /** All route alternatives (including the selected one, marked recommended=true) */
    private List<RouteCandidate> allRoutes;

    /** Origin coordinates used for this calculation */
    private LatLng origin;

    /** Destination coordinates used for this calculation */
    private LatLng destination;

    /** Human-readable explanation e.g. "Fastest route — saves 20 min with only 6 km more (7%)" */
    private String whySelected;

    /**
     * Short selection label: "SHORTEST" | "FASTEST" | "BALANCED"
     * Used to drive the UI badge colour.
     */
    private String selectionType;

    /** Source of origin coordinates: "REGISTERED" or "LIVE" */
    private String originSource;

    /** Source of destination coordinates: "REGISTERED" or "LIVE" */
    private String destinationSource;

    /** Which provider calculated this route: "google_maps" | "osrm" | "haversine" */
    private String provider;

    /** Estimated logistics cost in rupees for the selected route */
    private Double estimatedCostRupees;

    /** Cost per kg of cargo for the selected route */
    private Double costPerKg;

    /** Quantity of cargo in kg (from the deal) */
    private Double quantityKg;
}
