package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_lots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lot_id", unique = true, nullable = false, length = 64)
    private String lotId; // e.g. LOT-M2M-20260913-001

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "hub_id", nullable = false)
    private WarehouseHub hub;

    private Long dealId;

    private Long orderId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "farmer_id")
    private User farmer;

    @Column(nullable = false, length = 128)
    private String cropName;

    private String grade; // Grade A, Standard, Premium

    @Column(nullable = false)
    private Double initialQuantityKg;

    @Column(nullable = false)
    private Double availableQuantityKg;

    @Column(nullable = false)
    @Builder.Default
    private Double reservedQuantityKg = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double dispatchedQuantityKg = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double quarantinedQuantityKg = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private LotCondition inboundCondition = LotCondition.GOOD;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private PackagingType packagingType = PackagingType.GUNNY_BAGS;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private LotStatus status = LotStatus.RECEIVING;

    private String storageLocationBay; // e.g. "Bay 3 - Cold Room B"

    private LocalDateTime inboundDate;

    private LocalDateTime expectedOutboundDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "inbound_verified_by_id")
    private User inboundVerifiedBy;

    @Column(length = 1000)
    private String inboundNotes;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum LotCondition {
        EXCELLENT,
        GOOD,
        ACCEPTABLE,
        DAMAGED
    }

    public enum PackagingType {
        GUNNY_BAGS,
        PLASTIC_CRATES,
        CORRUGATED_BOXES,
        BULK
    }

    public enum LotStatus {
        RECEIVING,
        IN_STORAGE,
        RESERVED,
        PARTIALLY_DISPATCHED,
        DISPATCHED,
        RETURNED,
        QUARANTINED,
        REJECTED,
        SOLD,
        COMPLETED
    }
}
