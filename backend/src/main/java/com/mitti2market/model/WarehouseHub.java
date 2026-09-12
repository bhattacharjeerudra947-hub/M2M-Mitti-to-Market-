package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "warehouse_hubs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseHub {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hub_code", unique = true, nullable = false, length = 64)
    private String hubCode; // e.g. M2M-HUB-PUN-01

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "partner_name", length = 128)
    private String partnerName; // e.g. "Sahyadri Farmers Producer Co.", "Mahindra Agri Logistics"

    private String contactPerson;
    private String contactPhone;
    private String contactEmail;

    @Column(nullable = false)
    private String location; // City / Town / Area

    @Column(columnDefinition = "TEXT")
    private String address;

    private String district;
    private String state;
    private String pincode;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    /** Total storage capacity in kilograms */
    @Column(nullable = false)
    private Double totalCapacityKg;

    /** Currently physically occupied stock in kg */
    @Column(nullable = false)
    @Builder.Default
    private Double occupiedCapacityKg = 0.0;

    /** Capacity committed to incoming / reserved lots in kg */
    @Column(nullable = false)
    @Builder.Default
    private Double reservedCapacityKg = 0.0;

    /** Free remaining capacity in kg (total - occupied - reserved) */
    @Column(nullable = false)
    private Double availableCapacityKg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private StorageType storageType = StorageType.DRY_STORAGE;

    /** Comma-separated list of supported crops (e.g. "Potato, Onion, Tomato, Wheat, Rice") */
    @Column(columnDefinition = "TEXT")
    private String supportedCrops;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private HubStatus operatingStatus = HubStatus.ACTIVE;

    /** Handling charges in ₹/kg (standard partner fee) */
    @Builder.Default
    private Double handlingFeePerKg = 0.50;

    /** Daily storage fee in ₹/kg/day */
    @Builder.Default
    private Double storageRatePerDayPerKg = 0.10;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public void recalculateAvailable() {
        double occ = occupiedCapacityKg != null ? occupiedCapacityKg : 0.0;
        double res = reservedCapacityKg != null ? reservedCapacityKg : 0.0;
        this.availableCapacityKg = Math.max(0.0, (totalCapacityKg != null ? totalCapacityKg : 0.0) - occ - res);
    }

    public boolean supportsCrop(String crop) {
        if (supportedCrops == null || supportedCrops.isBlank() || crop == null || crop.isBlank()) {
            return true;
        }
        String cleanCrop = crop.trim().toLowerCase();
        for (String sc : supportedCrops.split(",")) {
            if (sc.trim().toLowerCase().contains(cleanCrop) || cleanCrop.contains(sc.trim().toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    public enum StorageType {
        DRY_STORAGE,
        COLD_STORAGE,
        CONTROLLED_ATMOSPHERE,
        VENTILATED_GRAIN_SILO
    }

    public enum HubStatus {
        ACTIVE,
        MAINTENANCE,
        FULL,
        INACTIVE
    }
}
