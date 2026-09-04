package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Extended business/buyer profile — separate from the base User entity.
 * Stores business-specific information: org type, GSTIN, registration docs.
 */
@Entity
@Table(name = "business_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Links to the User entity (one-to-one) */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    /** Business/org type from User.BuyerType enum */
    @Enumerated(EnumType.STRING)
    @Column(name = "business_type")
    private User.BuyerType businessType;

    /** Official business name (may differ from User.organizationName) */
    @Column(name = "official_name")
    private String officialName;

    /** GST Identification Number (for Indian businesses) */
    @Column(name = "gstin", length = 15)
    private String gstin;

    /** Business registration number */
    @Column(name = "registration_number")
    private String registrationNumber;

    /** Business address */
    @Column(columnDefinition = "TEXT")
    private String businessAddress;

    /** Government department/agency name (if GOVERNMENT type) */
    @Column(name = "department_name")
    private String departmentName;

    /** Authorized contact person name */
    @Column(name = "authorized_person")
    private String authorizedPerson;

    /** Storage key for business registration document in cloud storage */
    @Column(name = "registration_doc_storage_key")
    private String registrationDocStorageKey;

    /** Original filename of registration document */
    @Column(name = "registration_doc_filename")
    private String registrationDocFilename;

    /** What crops/products this buyer is looking for */
    @Column(columnDefinition = "TEXT")
    private String requiredCrops;

    /** Approximate monthly requirement in kg */
    private Long monthlyRequirementKg;

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

    public enum ProfileStatus {
        INCOMPLETE, COMPLETE, UNDER_REVIEW, APPROVED
    }
}
