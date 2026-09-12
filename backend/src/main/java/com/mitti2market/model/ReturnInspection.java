package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "return_inspections")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reverse_logistics_id", nullable = false)
    private ReverseLogistics reverseLogistics;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "inspected_by_id", nullable = false)
    private User inspectedBy;

    @Column(nullable = false)
    private LocalDateTime inspectionDate;

    @Column(nullable = false)
    private Double verifiedQuantityKg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ProduceCondition produceCondition = ProduceCondition.GOOD_CONDITION;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private InspectionDecision decision;

    @Column(columnDefinition = "TEXT")
    private String decisionNotes;

    @Builder.Default
    private Boolean disposalAuthorized = false;

    private Double discountedPricePerKg;

    private String redirectionTarget; // Buyer Name / Organization / Market

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum ProduceCondition {
        GOOD_CONDITION,
        MINOR_QUALITY_ISSUE,
        FARMER_SPECIFIC_RETURN_REQUIRED,
        UNSAFE_SPOILED
    }

    public enum InspectionDecision {
        REDIRECT_TO_ALTERNATIVE_BUYER,
        DISCOUNTED_LOCAL_SALE,
        RETURN_TO_FARMER,
        AUTHORIZED_DISPOSAL,
        RESTORE_TO_HUB_INVENTORY
    }
}
