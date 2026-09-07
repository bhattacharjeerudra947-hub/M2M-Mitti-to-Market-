package com.mitti2market.service;

import com.mitti2market.dto.RouteEstimate;

import java.util.List;

/**
 * Route estimation abstraction — keeps business logic decoupled from any
 * single map/routing provider. Future providers (Google Maps, Mapbox,
 * GraphHopper, OSRM) only need a new implementation of this interface.
 *
 * All values are ESTIMATES based on configured assumptions.
 */
public interface RouteService {

    /** Estimate the route between two coordinates (pickup → delivery). */
    RouteEstimate estimateRoute(double fromLat, double fromLng, double toLat, double toLng);

    /**
     * Estimate an ordered multi-stop route (waypoints as [lat, lng] arrays).
     * The waypoints must already be in the intended travel order.
     */
    RouteEstimate estimateRoute(List<double[]> waypoints);

    /** Straight-line (great-circle) distance in km — used by the fallback engine. */
    static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}