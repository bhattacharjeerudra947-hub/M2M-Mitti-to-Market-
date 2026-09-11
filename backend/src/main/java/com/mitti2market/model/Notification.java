package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "notifications")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    /** Reference to related entity */
    private Long referenceId;

    /** Related entity type (PRODUCE, ORDER, INTEREST, MESSAGE, MATCH, DEAL) */
    private String referenceType;

    /** Extra metadata in JSON format (e.g. matchId, produceId, buyerRequirementId, conversationId, dealId) */
    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public enum NotificationType {
        NEW_MATCH,
        MATCH_UPDATED,
        BUYER_REQUIREMENT_MATCHED,
        NEW_BUYER_INTEREST,
        DEAL_STARTED,
        NEW_MESSAGE,
        NEW_OFFER,
        COUNTER_OFFER,
        OFFER_ACCEPTED,
        BUYER_INTEREST,
        INTEREST_ACCEPTED,
        INTEREST_REJECTED,
        ORDER_PLACED,
        ORDER_STATUS_CHANGED,
        DEAL_AGREED,
        DEAL_LOCK_REQUESTED,
        DEAL_LOCKED,
        DEAL_COMPLETED,
        DEAL_CANCELLED,
        LOGISTICS_SELECTED,
        LOGISTICS_UPDATE,
        DELIVERY_CONFIRMED,
        VERIFICATION_APPROVED,
        VERIFICATION_REJECTED,
        RESUBMISSION_REQUESTED,
        ACCOUNT_VERIFIED,
        ACCOUNT_SUSPENDED,
        ACCOUNT_RESTORED,
        ACCOUNT_DEACTIVATED,
        REPORT_UPDATE,
        DISPUTE_UPDATE,
        FEEDBACK_RESPONSE,
        RATING_RECEIVED,
        SYSTEM_ALERT
    }
}
