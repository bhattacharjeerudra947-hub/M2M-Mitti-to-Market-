package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "logistics")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Logistics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String trackingId; // M2M-TRK-XXXXXX

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LogisticsType type = LogisticsType.OWN;

    // Transporter details
    private String transporterName;
    private String vehicleNumber;
    private String vehicleType;

    // Locations (string + optional exact coordinates)
    private String pickupLocation;
    private String deliveryLocation;
    private Double pickupLatitude;
    private Double pickupLongitude;
    private Double deliveryLatitude;
    private Double deliveryLongitude;

    // Timing
    private LocalDateTime scheduledPickup;
    private LocalDateTime actualPickup;
    private LocalDateTime expectedDelivery;
    private LocalDateTime actualDelivery;

    // Route estimate summary (computed by the route engine)

    // Route estimate summary (computed by the route engine)
    private Double routeDistanceKm;
    private Double routeDurationMinutes;
    private Double routeEstimatedCost;
    private String routeProvider;
    private String routeSummary;
    private String routeCaveat;
    private LocalDateTime routeComputedAt;

    // Google Maps enriched routing & source details
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LocationSource pickupLocationSource = LocationSource.REGISTERED;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LocationSource deliveryLocationSource = LocationSource.REGISTERED;

    @Column(columnDefinition = "TEXT")
    private String routePolylineEncoded;

    @Column(columnDefinition = "TEXT")
    private String routeSelectionReason;

    private String routeSelectionType;

    @Column(columnDefinition = "LONGTEXT")
    private String alternativeRoutesJson;

    // Special requirements
    private String specialHandling;
    private String packagingRequirements;
    private String contactPerson;
    private String contactPhone;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LogisticsStatus status = LogisticsStatus.REQUESTED;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum LogisticsType {
        OWN,
        MITTI2MARKET
    }

    public enum LogisticsStatus {
        REQUESTED,
        ASSIGNED,
        PICKUP_SCHEDULED,
        PICKED_UP,
        IN_TRANSIT,
        OUT_FOR_DELIVERY,
        DELIVERED
    }

    public enum LocationSource {
        REGISTERED,
        LIVE
    }
}
