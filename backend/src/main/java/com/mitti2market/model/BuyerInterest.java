package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "buyer_interests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyerInterest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produce_id", nullable = false)
    private Produce produce;

    /** Buyer's offered price per unit */
    private Double offeredPrice;

    /** Quantity the buyer wants */
    private Integer offeredQuantity;

    /** Buyer's message/note */
    @Column(columnDefinition = "TEXT")
    private String message;

    /** Interest status */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InterestStatus status = InterestStatus.PENDING;

    /** Link to conversation once accepted */
    @Column(name = "conversation_id")
    private String conversationId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum InterestStatus {
        PENDING,
        ACCEPTED,
        REJECTED,
        DEAL_AGREED,
        CANCELLED
    }
}
