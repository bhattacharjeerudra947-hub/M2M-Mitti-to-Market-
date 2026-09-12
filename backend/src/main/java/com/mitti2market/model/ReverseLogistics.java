package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reverse_logistics")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReverseLogistics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reverse_tracking_id", unique = true, nullable = false, length = 64)
    private String reverseTrackingId; // e.g. M2M-REV-20260913-101

    @Column(nullable = false)
    private Long dealId;

    private Long orderId;

    private Long disputeId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_hub_id")
    private WarehouseHub assignedHub;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ReturnReason returnReason;

    @Column(nullable = false)
    private Double returnQuantityKg;

    @Column(columnDefinition = "TEXT")
    private String rejectionNotes;

    // Pickup (Buyer's location)
    private String pickupAddress;
    private Double pickupLatitude;
    private Double pickupLongitude;

    // Destination
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private DestinationType destinationType = DestinationType.NEAREST_HUB;

    private String destinationAddress;
    private Double destinationLatitude;
    private Double destinationLongitude;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "alternative_buyer_id")
    private User alternativeBuyer;

    // Optimized routing
    private Double routeDistanceKm;
    private Double routeEstimatedCost;

    @Column(columnDefinition = "TEXT")
    private String optimizationRationale; // e.g. "Hub Pune is 18 km away vs 180 km back to Farmer. Recommended to prevent spoilage."

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ReverseStatus status = ReverseStatus.RETURN_REQUESTED;

    // Milestones
    private LocalDateTime requestedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime pickedUpAt;
    private LocalDateTime receivedAtHubAt;
    private LocalDateTime resolvedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum ReturnReason {
        QUALITY_MISMATCH,
        WEIGHT_DEFICIT,
        DAMAGE_IN_TRANSIT,
        NON_DELIVERY,
        BUYER_REJECTION,
        PACKAGING_RETURN,
        FAILED_DELIVERY,
        OTHER
    }

    public enum DestinationType {
        NEAREST_HUB,
        FARMER,
        ALTERNATIVE_BUYER,
        AUTHORIZED_DISPOSAL
    }

    public enum ReverseStatus {
        RETURN_REQUESTED,
        UNDER_REVIEW,
        RETURN_APPROVED,
        PICKUP_PENDING,
        IN_TRANSIT,
        RECEIVED_AT_HUB,
        INSPECTION_PENDING,
        INSPECTED,
        REDIRECTED,
        RETURNED_TO_FARMER,
        RESOLVED,
        CANCELLED
    }
}
