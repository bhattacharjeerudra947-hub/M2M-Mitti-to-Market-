package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "deal_evidence")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long dealId;

    private Long orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EvidenceStage stage;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "uploader_id", nullable = false)
    private User uploader;

    @Column(nullable = false, length = 30)
    private String uploaderRole; // FARMER, BUYER, OBSERVER, ADMIN

    @Column(nullable = false, length = 1024)
    private String imageUrl;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 30)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "verified_by_id")
    private User verifiedBy;

    private LocalDateTime verifiedAt;

    @Column(length = 1000)
    private String observerNotes;

    private String location;

    private Double latitude;

    private Double longitude;

    private Double lotQuantity;

    private String grade;

    private String lotId;

    private Long hubId;

    private Long reverseLogisticsId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum EvidenceStage {
        ORIGIN,
        HUB_INBOUND,
        HUB_OUTBOUND,
        DELIVERY,
        RETURN_PICKUP,
        RETURN_INSPECTION,
        DISPUTE,
        ADDITIONAL
    }

    public enum VerificationStatus {
        PENDING,
        VERIFIED,
        REJECTED
    }
}
