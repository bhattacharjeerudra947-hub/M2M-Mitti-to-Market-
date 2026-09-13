package com.mitti2market.service;

import com.mitti2market.dto.StorageFacilityDto;
import com.mitti2market.model.WarehouseHub;
import com.mitti2market.repository.WarehouseHubRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageFacilityService {

    private final WarehouseHubRepository hubRepository;
    private final GoogleMapsService googleMapsService;

    public List<StorageFacilityDto> findNearbyFacilities(Double latitude, Double longitude, String query, String district, Integer radiusMeters) {
        List<StorageFacilityDto> list = new ArrayList<>();

        List<WarehouseHub> partnerHubs = hubRepository.findByOperatingStatus(WarehouseHub.HubStatus.ACTIVE);
        for (WarehouseHub hub : partnerHubs) {
            boolean match = true;
            if (district != null && !district.isBlank()) {
                match = (hub.getDistrict() != null && hub.getDistrict().equalsIgnoreCase(district.trim()))
                        || (hub.getState() != null && hub.getState().equalsIgnoreCase(district.trim()))
                        || (hub.getAddress() != null && hub.getAddress().toLowerCase().contains(district.toLowerCase().trim()));
            } else if (query != null && !query.isBlank()) {
                String q = query.toLowerCase().trim();
                match = (hub.getName() != null && hub.getName().toLowerCase().contains(q))
                        || (hub.getDistrict() != null && hub.getDistrict().toLowerCase().contains(q))
                        || (hub.getState() != null && hub.getState().toLowerCase().contains(q))
                        || (hub.getAddress() != null && hub.getAddress().toLowerCase().contains(q));
            }

            if (match || (latitude != null && longitude != null)) {
                Double dist = null;
                if (latitude != null && longitude != null && hub.getLatitude() != null && hub.getLongitude() != null) {
                    dist = calculateDistanceKm(latitude, longitude, hub.getLatitude(), hub.getLongitude());
                    if (dist > 150.0 && (district != null && !district.isBlank())) {
                        continue;
                    }
                }

                list.add(StorageFacilityDto.builder()
                        .id(hub.getHubCode() != null ? hub.getHubCode() : "HUB-" + hub.getId())
                        .name(hub.getName())
                        .type(hub.getStorageType() != null ? hub.getStorageType().name() : "COLD_STORAGE")
                        .address(hub.getAddress() != null ? hub.getAddress() : hub.getLocation())
                        .district(hub.getDistrict())
                        .state(hub.getState())
                        .latitude(hub.getLatitude())
                        .longitude(hub.getLongitude())
                        .distanceKm(dist != null ? Math.round(dist * 10.0) / 10.0 : null)
                        .contactPhone(hub.getContactPhone())
                        .contactPerson(hub.getContactPerson())
                        .totalCapacityKg(hub.getTotalCapacityKg())
                        .availableCapacityKg(hub.getAvailableCapacityKg())
                        .storageType(hub.getStorageType() != null ? hub.getStorageType().name() : "COLD_STORAGE")
                        .isPartnerHub(true)
                        .source("VERIFIED_PARTNER")
                        .rating(4.8)
                        .build());
            }
        }

        if (googleMapsService.isConfigured()) {
            try {
                String searchTerm = "cold storage";
                if (query != null && !query.isBlank()) {
                    searchTerm += " in " + query;
                } else if (district != null && !district.isBlank()) {
                    searchTerm += " in " + district;
                }

                List<Map<String, Object>> places = googleMapsService.searchPlaces(searchTerm, latitude, longitude, radiusMeters);
                for (Map<String, Object> p : places) {
                    String name = (String) p.get("name");
                    String formattedAddress = (String) p.get("formatted_address");
                    String placeId = (String) p.get("place_id");
                    Double rating = p.get("rating") instanceof Number ? ((Number) p.get("rating")).doubleValue() : null;

                    Double pLat = null;
                    Double pLng = null;
                    Double dist = null;

                    @SuppressWarnings("unchecked")
                    Map<String, Object> geom = (Map<String, Object>) p.get("geometry");
                    if (geom != null && geom.get("location") instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> loc = (Map<String, Object>) geom.get("location");
                        pLat = ((Number) loc.get("lat")).doubleValue();
                        pLng = ((Number) loc.get("lng")).doubleValue();
                        if (latitude != null && longitude != null) {
                            dist = calculateDistanceKm(latitude, longitude, pLat, pLng);
                        }
                    }

                    list.add(StorageFacilityDto.builder()
                            .id("PLC-" + placeId)
                            .name(name)
                            .type("COLD_STORAGE")
                            .address(formattedAddress)
                            .latitude(pLat)
                            .longitude(pLng)
                            .distanceKm(dist != null ? Math.round(dist * 10.0) / 10.0 : null)
                            .isPartnerHub(false)
                            .source("GOOGLE_PLACES")
                            .rating(rating != null ? rating : 4.2)
                            .build());
                }
            } catch (Exception e) {
                log.warn("Google Places lookup error, returning partner hubs only: {}", e.getMessage());
            }
        }

        if (latitude != null && longitude != null) {
            list.sort(Comparator.comparing(f -> f.getDistanceKm() != null ? f.getDistanceKm() : 99999.0));
        }

        return list;
    }

    private double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
