package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.Logistics;
import com.mitti2market.model.Logistics.TrackingStatus;
import com.mitti2market.model.User;
import com.mitti2market.model.User.Role;
import com.mitti2market.repository.LogisticsRepository;
import com.mitti2market.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;
    private final LogisticsRepository logisticsRepo;

    public UserController(UserRepository users, LogisticsRepository logisticsRepo) {
        this.users = users;
        this.logisticsRepo = logisticsRepo;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        return users.findById(id)
                .map(user -> ResponseEntity.ok(ApiResponse.ok(toDto(user))))
                .orElse(ResponseEntity.status(404).body(ApiResponse.error("User not found")));
    }

    @GetMapping
    public ResponseEntity<?> listUsers(@RequestParam(required = false) Role role) {
        List<User> list = (role != null) ? users.findByRole(role) : users.findAll();
        return ResponseEntity.ok(ApiResponse.ok(list.stream().map(this::toDto).toList()));
    }

    @GetMapping("/farmers")
    public ResponseEntity<?> findFarmers(@RequestParam(required = false) String location) {
        List<User> farmers = (location != null && !location.isBlank())
                ? users.findByRoleAndLocationContainingIgnoreCase(Role.FARMER, location)
                : users.findByRole(Role.FARMER);
        return ResponseEntity.ok(ApiResponse.ok(farmers.stream().map(this::toDto).toList()));
    }

    /**
     * GET /api/users/locations — map view of every farmer and business.
     *
     * Privacy-first design:
     *  - Exact coordinates are only returned when the user has actually shared
     *    them (latitude/longitude set). Otherwise an APPROXIMATE city-level
     *    coordinate from the built-in lookup is used (clearly labelled).
     *  - "Live" means the user is a party in a logistics record with an ACTIVE
     *    tracking session — their last shared vehicle position is included so
     *    authorized viewers can see it on the map.
     */
    @GetMapping("/locations")
    public ResponseEntity<?> listLocations() {
        // Active tracking sessions → last known position per deal party
        Map<Long, Map<String, Object>> liveByUserId = new HashMap<>();
        for (Logistics l : logisticsRepo.findByTrackingStatus(TrackingStatus.ACTIVE)) {
            if (l.getDeal() == null) continue;
            Map<String, Object> info = Map.of(
                    "trackingId", l.getTrackingId() != null ? l.getTrackingId() : "",
                    "latitude", l.getCurrentLatitude(),
                    "longitude", l.getCurrentLongitude(),
                    "lastLocationUpdate", l.getLastLocationUpdate()
            );
            if (l.getDeal().getFarmer() != null) liveByUserId.put(l.getDeal().getFarmer().getId(), info);
            if (l.getDeal().getBuyer() != null) liveByUserId.put(l.getDeal().getBuyer().getId(), info);
        }

        List<Map<String, Object>> result = Stream.concat(
                        users.findByRole(Role.FARMER).stream(),
                        users.findByRole(Role.BUSINESS).stream())
                .distinct()
                .map(u -> locationDto(u, liveByUserId.get(u.getId())))
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    private Map<String, Object> locationDto(User user, Map<String, Object> live) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", user.getId());
        m.put("name", user.getName() != null ? user.getName() : "");
        m.put("role", user.getRole().name());
        m.put("location", user.getLocation() != null ? user.getLocation() : "");
        m.put("organizationName", user.getOrganizationName() != null ? user.getOrganizationName() : "");
        m.put("verified", user.getVerified() != null && user.getVerified());
        m.put("rating", user.getRating() != null ? user.getRating() : 0.0);
        m.put("profilePhotoUrl", user.getProfilePhotoUrl() != null ? user.getProfilePhotoUrl() : "");

        if (user.getLatitude() != null && user.getLongitude() != null) {
            m.put("latitude", user.getLatitude());
            m.put("longitude", user.getLongitude());
            m.put("locationAccuracy", "EXACT");
        } else {
            double[] approx = cityCoordinates(user.getLocation());
            m.put("latitude", approx[0]);
            m.put("longitude", approx[1]);
            m.put("locationAccuracy", "APPROXIMATE");
        }

        if (live != null) {
            m.put("live", true);
            m.put("liveTrackingId", live.get("trackingId"));
            m.put("liveLatitude", live.get("latitude"));
            m.put("liveLongitude", live.get("longitude"));
            m.put("liveLastUpdate", live.get("lastLocationUpdate"));
        } else {
            m.put("live", false);
        }
        return m;
    }

    private Map<String, Object> toDto(User user) {
        return Map.of(
                "id", user.getId(),
                "name", user.getName() != null ? user.getName() : "",
                "email", user.getEmail() != null ? user.getEmail() : "",
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "role", user.getRole().name(),
                "location", user.getLocation() != null ? user.getLocation() : "",
                "organizationName", user.getOrganizationName() != null ? user.getOrganizationName() : ""
        );
    }

    /** Approximate city-level coordinates for the map (demo lookup — labelled approximate). */
    private double[] cityCoordinates(String location) {
        if (location == null || location.isBlank()) return new double[]{20.5937, 78.9629}; // India centre
        String city = location.split(",")[0].trim().toUpperCase();
        city = switch (city) {
            case "BENGALURU", "BENGALURU CITY" -> "BANGALORE";
            case "NEW DELHI", "NCR" -> "DELHI";
            case "KOLKATA" -> "CALCUTTA";
            case "CHENNAI" -> "MADRAS";
            case "THIRUVANANTHAPURAM" -> "TRIVANDRUM";
            default -> city;
        };
        double[] coord = CITY_COORDS.get(city);
        return coord != null ? coord : new double[]{20.5937, 78.9629};
    }

    /** Demo city → approximate coordinates (do not treat as exact addresses). */
    private static final Map<String, double[]> CITY_COORDS = Map.ofEntries(
            Map.entry("PUNE", new double[]{18.5204, 73.8567}),
            Map.entry("MUMBAI", new double[]{19.0760, 72.8777}),
            Map.entry("NASHIK", new double[]{19.9975, 73.7898}),
            Map.entry("BANGALORE", new double[]{12.9716, 77.5946}),
            Map.entry("DELHI", new double[]{28.7041, 77.1025}),
            Map.entry("CALCUTTA", new double[]{22.5726, 88.3639}),
            Map.entry("CHENNAI", new double[]{13.0827, 80.2707}),
            Map.entry("HYDERABAD", new double[]{17.3850, 78.4867}),
            Map.entry("LUCKNOW", new double[]{26.8467, 80.9462}),
            Map.entry("JAIPUR", new double[]{26.9124, 75.7873}),
            Map.entry("CHANDIGARH", new double[]{30.7333, 76.7794}),
            Map.entry("AGRA", new double[]{27.1767, 78.0081}),
            Map.entry("KANPUR", new double[]{26.4499, 80.3319}),
            Map.entry("INDORE", new double[]{22.7196, 75.8577}),
            Map.entry("SURAT", new double[]{21.1702, 72.8311}),
            Map.entry("AHMEDABAD", new double[]{23.0225, 72.5714}),
            Map.entry("PATNA", new double[]{25.5941, 85.1376}),
            Map.entry("BHUBANESWAR", new double[]{20.2961, 85.8245}),
            Map.entry("KOCHI", new double[]{9.9312, 76.2673}),
            Map.entry("TRIVANDRUM", new double[]{8.5241, 76.9366})
    );
}