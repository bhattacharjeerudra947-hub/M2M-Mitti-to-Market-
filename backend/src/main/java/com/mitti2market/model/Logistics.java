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
    private String driverName;
    private String driverPhone;
    private String vehicleNumber;
    private String vehicleType;

    // Locations
    private String pickupLocation;
    private String deliveryLocation;

    // Timing
    private LocalDateTime scheduledPickup;
    private LocalDateTime actualPickup;
    private LocalDateTime expectedDelivery;
    private LocalDateTime actualDelivery;

    // Tracking
    private Double currentLatitude;
    private Double currentLongitude;
    private LocalDateTime lastLocationUpdate;
    private String trackingUrl;

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
}
