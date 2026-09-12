package com.mitti2market.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Simple latitude/longitude coordinate pair.
 * Used in route request/response payloads and the Google Maps service.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LatLng {

    private double latitude;
    private double longitude;

    /** Convenience factory method */
    public static LatLng of(double lat, double lng) {
        return new LatLng(lat, lng);
    }

    @Override
    public String toString() {
        return latitude + "," + longitude;
    }
}
