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
    @JoinColumn(name = "hub_id", nullable = true)
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

    // Storage Management & Configurable Pricing Fields
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "produce_id")
    private Produce produce;

    private String variety;

    private java.time.LocalDate harvestDate;

    private LocalDateTime plannedReleaseDate;

    private LocalDateTime actualReleaseDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    @Builder.Default
    private BillingModel billingModel = BillingModel.PER_KG_PER_DAY;

    @Builder.Default
    private Double dailyRatePerUnit = 0.50; // ₹ / kg / day or ₹ / unit / day

    private Double monthlyRatePerUnit;

    @Builder.Default
    private Double fixedBookingFee = 0.0;

    @Builder.Default
    private Double loadingUnloadingFee = 0.0;

    @Builder.Default
    private Double handlingPackagingFee = 0.0;

    @Builder.Default
    private Double transportationFee = 0.0;

    @Builder.Default
    private Double taxAndOtherFee = 0.0;

    @Builder.Default
    private Double estimatedStorageCost = 0.0;

    @Builder.Default
    private Double actualStorageCost = 0.0;

    private String storageInvoiceNumber;

    private LocalDateTime storageInvoiceDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    @Builder.Default
    private StorageInvoiceStatus storageInvoiceStatus = StorageInvoiceStatus.ESTIMATED;

    @Builder.Default
    private Double estimatedQualityLossPct = 2.0;

    @Builder.Default
    private Double actualDamagedQuantityKg = 0.0;

    private String facilityName;

    private String facilityLocation;

    @Column(length = 64)
    private String facilityType; // COLD_STORAGE, DRY_STORAGE, WAREHOUSE, SILO, OTHER

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum BillingModel {
        PER_KG_PER_DAY,
        PER_TONNE_PER_DAY,
        PER_CRATE_PER_DAY,
        PER_KG_PER_MONTH,
        PER_PALLET_PER_DAY,
        FIXED_BOOKING_FEE,
        COMBINED
    }

    public enum StorageInvoiceStatus {
        ESTIMATED,
        FINALIZED,
        PAID
    }

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
