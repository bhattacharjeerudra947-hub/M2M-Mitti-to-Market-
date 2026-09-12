package com.mitti2market.dto;

import lombok.Data;

/**
 * Request body for the geocoding endpoint.
 * Accepts either free-text address or structured address components.
 */
@Data
public class GeocodeRequest {

    /** Free-text address e.g. "Burdwan, Purba Bardhaman, West Bengal" */
    private String address;

    /** Village or area name (optional structured field) */
    private String village;

    /** District name (optional structured field) */
    private String district;

    /** State name (optional structured field) */
    private String state;

    /** PIN code (optional - improves geocoding accuracy) */
    private String pincode;

    /**
     * Build a geocodable address string from the structured fields,
     * falling back to the free-text address.
     */
    public String toAddressString() {
        if (village != null && !village.isBlank()) {
            StringBuilder sb = new StringBuilder();
            sb.append(village.strip()).append(", ");
            if (district != null && !district.isBlank()) sb.append(district.strip()).append(", ");
            if (state != null && !state.isBlank()) sb.append(state.strip()).append(", India");
            if (pincode != null && !pincode.isBlank()) sb.append(" ").append(pincode.strip());
            return sb.toString();
        }
        return address != null ? address : "";
    }
}
