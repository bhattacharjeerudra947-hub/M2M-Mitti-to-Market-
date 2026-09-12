package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "observer_assignments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ObserverAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dispute_id")
    private Dispute dispute;

    private Long dealId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "observer_id", nullable = false)
    private User observer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_by_id", nullable = false)
    private User assignedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime assignedAt;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 30)
    private AssignmentStatus status = AssignmentStatus.ASSIGNED;

    @Column(length = 1000)
    private String notes;

    public enum AssignmentStatus {
        ASSIGNED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }
}
