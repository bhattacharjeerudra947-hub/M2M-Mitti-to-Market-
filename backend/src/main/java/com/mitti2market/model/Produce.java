package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "produce")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Produce {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @Column(nullable = false)
    private String name;

    private String category;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "listed_quantity")
    private Integer listedQuantity;

    @Column(name = "reserved_quantity")
    @Builder.Default
    private Integer reservedQuantity = 0;

    @Column(name = "sold_quantity")
    @Builder.Default
    private Integer soldQuantity = 0;

    @Column(nullable = false)
    private String unit;

    @Column(nullable = false)
    private Double pricePerUnit;

    private String description;

    private String location;

    private String imageUrl;

    /**
     * Client-generated idempotency key for offline-first sync.
     * The same key always resolves to the same produce record,
     * so retries never create duplicate listings.
     */
    @Column(unique = true, length = 64)
    private String idempotencyKey;

    private Double aiSuggestedMinPrice;

    private Double aiSuggestedMaxPrice;

    /** Expected harvest or availability date */
    private LocalDate readyDate;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProduceStatus status = ProduceStatus.AVAILABLE;

    @Column(name = "admin_removal_reason", columnDefinition = "TEXT")
    private String adminRemovalReason;

    private LocalDateTime removedAt;

    private String removedBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.listedQuantity == null && this.quantity != null) {
            this.listedQuantity = this.quantity;
        }
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum ProduceStatus {
        DRAFT,
        AVAILABLE,
        LOW_STOCK,
        PARTIALLY_SOLD,
        SOLD_OUT,
        INACTIVE,
        EXPIRED,
        PAUSED,
        REMOVED,
        ADMIN_REMOVED
    }
}
