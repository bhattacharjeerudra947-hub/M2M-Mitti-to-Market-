package com.mitti2market.dto;

import lombok.Data;

/**
 * Request body for the route calculation endpoint.
 * Carries origin and destination coordinates and the source labels.
 */
@Data
public class RouteRequest {

    /** Origin / pickup coordinates */
    private LatLng origin;

    /** Destination / delivery coordinates */
    private LatLng destination;

    /** Where origin coords came from: "REGISTERED" | "LIVE" */
    private String originSource = "REGISTERED";

    /** Where destination coords came from: "REGISTERED" | "LIVE" */
    private String destinationSource = "REGISTERED";

    /** Deal ID — used to fetch cargo quantity for cost estimation */
    private Long dealId;

    /** Cargo quantity in kg (if known at request time; fallback to deal quantity) */
    private Double quantityKg;
}
