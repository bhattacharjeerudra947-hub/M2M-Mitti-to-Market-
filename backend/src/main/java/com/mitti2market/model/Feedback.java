package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FeedbackCategory category;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    private Integer rating;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FeedbackStatus status = FeedbackStatus.NEW;

    @Column(name = "admin_response", columnDefinition = "TEXT")
    private String adminResponse;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

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

    public enum FeedbackCategory {
        BUG_REPORT,
        FEATURE_SUGGESTION,
        GENERAL_FEEDBACK,
        EXPERIENCE_FEEDBACK,
        LOGISTICS_FEEDBACK,
        MARKETPLACE_FEEDBACK,
        AI_RECOMMENDATION_FEEDBACK
    }

    public enum FeedbackStatus {
        NEW,
        REVIEWING,
        PLANNED,
        RESOLVED,
        CLOSED
    }
}
