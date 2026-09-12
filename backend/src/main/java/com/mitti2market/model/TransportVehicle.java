package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Represents Mitti2Market platform-managed transport inventory.
 *
 * IMPORTANT: This is NOT a live driver/fleet tracking system.
 * It represents platform logistics availability for the prototype.
 * A real logistics provider API can be integrated here in production.
 */
@Entity
@Table(name = "transport_vehicles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransportVehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Platform vehicle identifier, e.g. M2M-104 */
    @Column(unique = true, nullable = false)
    private String vehicleNumber;

    /** Human-readable label, e.g. 'Mini Truck - M2M-104' */
    private String vehicleLabel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType vehicleType;

    /** Maximum load in kilograms */
    @Column(nullable = false)
    private Double capacityKg;

    /** Broad area/city where vehicle is currently based */
    private String currentArea;

    /** State where vehicle is based */
    private String currentState;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AvailabilityStatus availabilityStatus = AvailabilityStatus.AVAILABLE;

    /** Earliest available pickup date */
    private LocalDateTime availableFrom;

    /** Cost per kilometre in INR (used for estimate) */
    @Builder.Default
    private Double costPerKm = 25.0;

    /** Base fixed charge in INR */
    @Builder.Default
    private Double baseCostRupees = 500.0;

    /** Loading/unloading charge in INR */
    @Builder.Default
    private Double loadingChargeRupees = 400.0;

    /** Whether this vehicle record is active/visible */
    @Builder.Default
    private Boolean active = true;

    /** Notes for admin */
    private String notes;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ── Enums ──────────────────────────────────────────

    public enum VehicleType {
        MINI_TRUCK,    // up to 1,500 kg
        TRUCK,         // up to 5,000 kg
        LARGE_TRUCK;   // up to 12,000 kg

        public String label() {
            return switch (this) {
                case MINI_TRUCK -> "Mini Truck";
                case TRUCK -> "Truck";
                case LARGE_TRUCK -> "Large Truck";
            };
        }
    }

    public enum AvailabilityStatus {
        AVAILABLE,
        ASSIGNED,
        UNAVAILABLE,
        MAINTENANCE
    }

    /** Estimated total cost for a given distance in km */
    public double estimateCost(double distanceKm) {
        double base = baseCostRupees != null ? baseCostRupees : 500.0;
        double perKm = costPerKm != null ? costPerKm : 25.0;
        double loading = loadingChargeRupees != null ? loadingChargeRupees : 400.0;
        return Math.round((base + distanceKm * perKm + loading) * 100.0) / 100.0;
    }
}