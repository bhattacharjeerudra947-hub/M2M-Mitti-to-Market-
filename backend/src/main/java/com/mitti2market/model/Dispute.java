package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

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

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "raised_by", nullable = false)
    private User raisedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private DisputeReason reason;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DisputeStatus status = DisputeStatus.OPEN;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime resolvedAt;

    public enum DisputeReason {
        QUALITY_ISSUE,
        QUANTITY_ISSUE,
        LATE_DELIVERY,
        DAMAGED_GOODS,
        MISSING_GOODS,
        PAYMENT_ISSUE,
        OTHER
    }

    public enum DisputeStatus {
        OPEN,
        UNDER_REVIEW,
        RESOLVED,
        REJECTED
    }
}