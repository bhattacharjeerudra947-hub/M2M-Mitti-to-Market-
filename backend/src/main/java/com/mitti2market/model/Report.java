package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reported_user_id")
    private User reportedUser;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reported_produce_id")
    private Produce reportedProduce;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reported_business_id")
    private User reportedBusiness;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reported_deal_id")
    private Deal reportedDeal;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reported_requirement_id")
    private BuyerRequirement reportedRequirement;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false)
    private ReportType reportType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReportStatus status = ReportStatus.OPEN;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    private LocalDateTime resolvedAt;

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

    public enum ReportType {
        FRAUD,
        SCAM,
        FALSE_INFORMATION,
        FAKE_PROFILE,
        WRONG_PRICE,
        WRONG_PRODUCT,
        INAPPROPRIATE_CONTENT,
        HARASSMENT,
        SUSPICIOUS_ACTIVITY,
        QUALITY_ISSUE,
        OTHER
    }

    public enum ReportStatus {
        OPEN,
        UNDER_REVIEW,
        RESOLVED,
        DISMISSED,
        ESCALATED
    }
}
