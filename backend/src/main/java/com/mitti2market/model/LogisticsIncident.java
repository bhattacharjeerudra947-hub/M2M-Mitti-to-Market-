package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "logistics_incidents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogisticsIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String incidentNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reported_by", nullable = false)
    private User reportedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private IncidentType incidentType;

    @Column(length = 2000, nullable = false)
    private String description;

    @Column(columnDefinition = "TEXT")
    private String photoUrls;

    private Double estimatedLossAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    @Builder.Default
    private LiabilityParty liabilityParty = LiabilityParty.UNDETERMINED;

    @Column(length = 2000)
    private String financialAttributionNotes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private IncidentStatus status = IncidentStatus.REPORTED;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    @Column(length = 2000)
    private String resolutionSummary;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime resolvedAt;

    public enum IncidentType {
        TRANSIT_DAMAGE,
        TRANSIT_DELAY,
        TEMPERATURE_FAILURE,
        SPOILAGE,
        ACCIDENT,
        OTHER
    }

    public enum LiabilityParty {
        FARMER,
        BUYER,
        THIRD_PARTY_LOGISTICS,
        MITTI2MARKET_LOGISTICS_PARTNER,
        HUB_WAREHOUSE,
        SHARED,
        UNDETERMINED
    }

    public enum IncidentStatus {
        REPORTED,
        UNDER_INVESTIGATION,
        RESOLVED,
        REJECTED
    }
}
