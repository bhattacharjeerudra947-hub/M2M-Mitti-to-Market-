package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * BuyerMatch represents a system-generated match between an active farmer produce
 * listing and an active buyer bulk requirement.
 *
 * ABSOLUTE RULE: Matches are opportunities. Only the farmer can initiate a deal
 * from a match.
 */
@Entity
@Table(name = "buyer_matches",
       uniqueConstraints = {
           @UniqueConstraint(name = "uk_produce_requirement", columnNames = {"produce_id", "buyer_requirement_id"})
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyerMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "produce_id", nullable = false)
    private Produce produce;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_requirement_id", nullable = false)
    private BuyerRequirement buyerRequirement;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    /** AI compatibility score (0-100%) */
    @Column(nullable = false)
    private Integer matchScore;

    /** Explanation checklist reasons in JSON format or formatted text */
    @Column(columnDefinition = "TEXT")
    private String matchReasons;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MatchType matchType = MatchType.COMPATIBLE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MatchStatus status = MatchStatus.NEW;

    /** Linked Message Centre conversation ID when farmer initiates deal */
    @Column(name = "conversation_id")
    private String conversationId;

    /** Linked Deal ID when deal is locked */
    @Column(name = "deal_id")
    private String dealId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private LocalDateTime viewedAt;

    private LocalDateTime notifiedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum MatchType {
        EXACT,
        PARTIAL,
        COMPATIBLE
    }

    public enum MatchStatus {
        NEW,
        VIEWED,
        FARMER_INTERESTED,
        DEAL_STARTED,
        NEGOTIATING,
        DEAL_LOCKED,
        REJECTED,
        EXPIRED,
        COMPLETED
    }
}
