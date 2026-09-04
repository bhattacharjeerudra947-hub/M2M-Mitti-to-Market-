package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Extended farmer profile — separate from the base User entity.
 * Stores farming-specific information: category, season, crops, land details.
 */
@Entity
@Table(name = "farmer_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Links to the User entity (one-to-one) */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    /** SINGLE_CROP, MULTI_CROP */
    @Enumerated(EnumType.STRING)
    @Column(name = "farmer_category")
    private User.FarmerType farmerCategory;

    /** Farming seasons: KHARIF, RABI, ZAID, MULTIPLE */
    @Enumerated(EnumType.STRING)
    @Column(name = "farming_season")
    private FarmingSeason farmingSeason;

    /** Comma-separated list of crops grown, e.g. "Rice,Wheat,Onion" */
    @Column(columnDefinition = "TEXT")
    private String crops;

    /** Farm/land area in acres */
    private Double landAreaAcres;

    /** Land ownership type */
    @Enumerated(EnumType.STRING)
    private LandOwnership landOwnership;

    /** Farm address or description */
    @Column(columnDefinition = "TEXT")
    private String farmAddress;

    /** Aadhaar last 4 digits only (for verification, never full number) */
    @Column(name = "aadhaar_last4", length = 4)
    private String aadhaarLast4;

    /** Alternative identity doc type */
    @Column(name = "identity_doc_type")
    private String identityDocType;

    /** Storage key for identity document in cloud storage */
    @Column(name = "identity_doc_storage_key")
    private String identityDocStorageKey;

    /** Original filename of identity document */
    @Column(name = "identity_doc_filename")
    private String identityDocFilename;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "profile_status")
    private ProfileStatus profileStatus = ProfileStatus.INCOMPLETE;

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

    public enum FarmingSeason {
        KHARIF, RABI, ZAID, MULTIPLE
    }

    public enum LandOwnership {
        OWNED, LEASED, COMMON_LAND, FPO_MANAGED
    }

    public enum ProfileStatus {
        INCOMPLETE, COMPLETE, UNDER_REVIEW, APPROVED
    }
}
