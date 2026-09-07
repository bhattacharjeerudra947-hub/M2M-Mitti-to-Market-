package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Audit trail for a deal lifecycle.
 * Every important action (offer, confirmation, lock, logistics, delivery)
 * is recorded here and drives the frontend timeline.
 */
@Entity
@Table(name = "deal_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DealEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long dealId;

    /** Human-readable event type, e.g. OFFER_ACCEPTED, DEAL_LOCKED */
    @Column(nullable = false, length = 60)
    private String eventType;

    private Long actorId;

    private String actorRole;

    /** Short human-readable summary, e.g. "Farmer confirmed the agreement" */
    @Column(length = 500)
    private String description;

    @Column(length = 1000)
    private String metadata;

    @CreationTimestamp
    private LocalDateTime createdAt;
}