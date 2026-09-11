package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
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
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    /** Reference to related entity */
    private Long referenceId;

    /** Related entity type (PRODUCE, ORDER, INTEREST, MESSAGE) */
    private String referenceType;

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
        BUYER_INTEREST,
        INTEREST_ACCEPTED,
        INTEREST_REJECTED,
        NEW_MESSAGE,
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
