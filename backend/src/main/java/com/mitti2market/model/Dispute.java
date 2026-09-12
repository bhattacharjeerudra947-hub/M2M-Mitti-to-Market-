package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "disputes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dispute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long dealId;

    private Long orderId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "raised_by", nullable = false)
    private User raisedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private DisputeReason reason;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 40)
    private DisputeStatus status = DisputeStatus.OPEN;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_observer_id")
    private User assignedObserver;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "resolved_by_id")
    private User resolvedBy;

    @Column(length = 2000)
    private String resolutionNotes;

    @Column(length = 50)
    private String resolutionType; // FULL_BUYER, FULL_FARMER, PARTIAL_SETTLEMENT, REJECTED, ESCALATED

    private Integer originalQuantity;

    private Integer acceptedQuantity;

    private Integer disputedQuantity;

    private Double adjustmentAmount;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime resolvedAt;

    public enum DisputeReason {
        QUANTITY_MISMATCH,
        PRODUCE_DAMAGED,
        QUALITY_MISMATCH,
        WRONG_PRODUCE,
        PACKAGING_DAMAGED,
        MISSING_ITEMS,
        DELIVERY_ISSUE,
        OTHER,
        // Legacy aliases
        QUALITY_ISSUE,
        QUANTITY_ISSUE,
        LATE_DELIVERY,
        DAMAGED_GOODS,
        MISSING_GOODS,
        PAYMENT_ISSUE
    }

    public enum DisputeStatus {
        OPEN,
        UNDER_REVIEW,
        WAITING_FOR_FARMER,
        WAITING_FOR_BUYER,
        WAITING_FOR_OBSERVER,
        ADDITIONAL_EVIDENCE_REQUIRED,
        RESOLVED,
        REJECTED,
        PARTIALLY_RESOLVED,
        ESCALATED
    }
}