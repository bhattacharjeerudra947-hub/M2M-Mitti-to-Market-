package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Buyer Requirement — a buyer posts what they need (crop, quantity, price range,
 * quality, deadline). The system matches farmer supply against these demands.
 */
@Entity
@Table(name = "buyer_requirements")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyerRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @Column(nullable = false)
    private String crop;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "required_quantity")
    private Integer requiredQuantity;

    @Column(name = "fulfilled_quantity")
    @Builder.Default
    private Integer fulfilledQuantity = 0;

    @Column(name = "reserved_quantity")
    @Builder.Default
    private Integer reservedQuantity = 0;

    @Column(name = "remaining_quantity")
    private Integer remainingQuantity;

    private String unit;

    /** Target price range (₹ per unit) */
    private Double minPrice;

    private Double maxPrice;

    /** Quality / grade wanted, e.g. "Grade A" */
    private String quality;

    /** Required by date */
    private LocalDate requiredBy;

    /** Delivery / pickup location */
    private String deliveryLocation;

    /** Transport preference: BUYER / SELLER / PLATFORM */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TransportPreference transportPreference = TransportPreference.PLATFORM;

    /** Extra notes */
    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequirementStatus status = RequirementStatus.OPEN;

    @Column(name = "admin_removal_reason", columnDefinition = "TEXT")
    private String adminRemovalReason;

    private LocalDateTime removedAt;

    private String removedBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.requiredQuantity == null && this.quantity != null) {
            this.requiredQuantity = this.quantity;
        }
        if (this.remainingQuantity == null && this.requiredQuantity != null) {
            this.remainingQuantity = this.requiredQuantity - (this.fulfilledQuantity != null ? this.fulfilledQuantity : 0);
        }
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum TransportPreference {
        BUYER,
        SELLER,
        PLATFORM
    }

    public enum RequirementStatus {
        OPEN,
        MATCHED,
        NEGOTIATING,
        PARTIALLY_FULFILLED,
        FULFILLED,
        CANCELLED,
        EXPIRED,
        ADMIN_REMOVED
    }
}