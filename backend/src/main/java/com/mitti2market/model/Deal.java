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

    private String cropName;
    private Integer quantity;
    private String unit;
    private Double agreedPrice;
    private Double totalAmount;
    private String pickupLocation;
    private String deliveryLocation;
    private String conditions;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DealStatus status = DealStatus.NEGOTIATING;

    private String conversationId;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime lockedAt;
    private LocalDateTime completedAt;

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
