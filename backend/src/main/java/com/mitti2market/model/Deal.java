package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "deals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Deal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String dealId; // M2M-2026-XXXX

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "produce_id")
    private Produce produce;

    /** Buyer requirement this deal fulfils (when the deal originates from a requirement). */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_requirement_id")
    private BuyerRequirement buyerRequirement;

    private String cropName;
    private Integer quantity;
    private String unit;
    private Double agreedPrice;
    private Double totalAmount;
    private String pickupLocation;
    private String deliveryLocation;
    private Double pickupLatitude;
    private Double pickupLongitude;
    private Double deliveryLatitude;
    private Double deliveryLongitude;
    private String conditions;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DealStatus status = DealStatus.NEGOTIATING;

    private String conversationId;

    /** Logistics mode: MITTI2MARKET or OWN */
    @Builder.Default
    private String logisticsMode = "MITTI2MARKET";

    /** If OWN: FARMER, BUYER, or THIRD_PARTY */
    private String ownLogisticsProvider;

    /** Logistics reference code (e.g. M2M-LP-001245 or LP-OWN-000124) */
    private String logisticsProviderId;

    private String logisticsProviderName;
    private String logisticsProviderPhone;
    private String logisticsVehicleNumber;
    private Double estimatedLogisticsCost;

    /** Payment status: UNPAID, PAID_ESCROW, RELEASED_TO_FARMER, REFUNDED */
    @Builder.Default
    private String paymentStatus = "UNPAID";

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime lockedAt;
    private LocalDateTime completedAt;

    /** When the locked deal's terms were last amended (via re-negotiation) */
    private LocalDateTime amendedAt;

    /** How many times the deal terms have been amended after locking */
    @Builder.Default
    private Integer amendmentCount = 0;

    public enum DealStatus {
        NEGOTIATING,
        LOCK_PENDING,
        LOCKED,
        LOGISTICS_PENDING,
        LOGISTICS_ASSIGNED,
        PICKUP_SCHEDULED,
        PICKED_UP,
        IN_TRANSIT,
        OUT_FOR_DELIVERY,
        DELIVERED,
        COMPLETED,
        CANCELLED,
        DISPUTED
    }
}
