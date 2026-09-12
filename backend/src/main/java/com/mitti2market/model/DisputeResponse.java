package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "dispute_responses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisputeResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispute_id", nullable = false)
    private Dispute dispute;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 30)
    private String userRole; // FARMER, BUYER, OBSERVER, ADMIN

    @Column(nullable = false, length = 2000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private ResponseType responseType;

    @Column(length = 1024)
    private String evidenceUrl;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum ResponseType {
        CLAIM,
        RESPONSE,
        EVIDENCE_SUBMISSION,
        AGREEMENT,
        DISAGREEMENT,
        OBSERVER_REPORT,
        ADMIN_NOTE
    }
}
