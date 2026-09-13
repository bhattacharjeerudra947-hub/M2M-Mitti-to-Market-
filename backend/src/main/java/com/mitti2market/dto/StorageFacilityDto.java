package com.mitti2market.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorageFacilityDto {
    private String id;
    private String name;
    private String type; // COLD_STORAGE, WAREHOUSE, COLLECTION_CENTER, PARTNER_HUB
    private String address;
    private String district;
    private String state;
    private Double latitude;
    private Double longitude;
    private Double distanceKm;
    private String contactPhone;
    private String contactPerson;
    private Double totalCapacityKg;
    private Double availableCapacityKg;
    private String storageType;
    private Double rating;
    private Boolean isPartnerHub;
    private String source; // "VERIFIED_PARTNER" or "GOOGLE_PLACES"
}
