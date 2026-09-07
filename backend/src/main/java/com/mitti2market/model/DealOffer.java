package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Structured negotiation offer.
 * Unlike free-form chat, an offer carries a concrete price + quantity
 * with Accept / Counter / Reject actions. Accepted offers feed the Deal Lock flow.
 */
@Entity
@Table(name = "deal_offers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DealOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Conversation this offer belongs to */
    @Column(name = "conversation_id", nullable = false)
    private String conversationId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    /** Produce being negotiated (optional — falls back to conversation produce) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produce_id")
    private Produce produce;

    private String cropName;

    /** Offered price per unit */
    @Column(nullable = false)
    private Double price;

    /** Quantity on offer */
    @Column(nullable = false)
    private Integer quantity;

    private String unit;

    /** Valid until (optional deadline) */
    private LocalDateTime validUntil;

    /** Message accompanying the offer */
    @Column(columnDefinition = "TEXT")
    private String note;

    /** Parent offer when this is a counter-offer */
    @Column(name = "parent_offer_id")
    private Long parentOfferId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private OfferStatus status = OfferStatus.PENDING;

    /** Deal created if the offer is accepted */
    @Column(name = "deal_id")
    private Long dealId;

    /** If set, accepting this offer AMENDS the terms of this locked deal instead of creating a new deal */
    @Column(name = "amendment_of_deal_id")
    private Long amendmentOfDealId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime respondedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public enum OfferStatus {
        PENDING,
        ACCEPTED,
        COUNTERED,
        REJECTED,
        EXPIRED,
        WITHDRAWN
    }
}