package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Firebase UID — links Firebase auth to this MySQL user */
    @Column(name = "firebase_uid", unique = true)
    private String firebaseUid;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String email;

    @Column(name = "password")
    @JsonIgnore // never serialize password hashes in API responses
    @Builder.Default
    private String passwordHash = "";

    @Column(unique = true)
    private String phone;

    /** Profile photo URL */
    @Column(name = "profile_photo_url")
    private String profilePhotoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_status", nullable = false)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider")
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.EMAIL;

    private String location;

    /** Latitude for GPS coordinates */
    private Double latitude;

    /** Longitude for GPS coordinates */
    private Double longitude;

    private String organizationName;

    /** Farmer subtype: SINGLE_CROP, MULTI_CROP, FPO */
    @Enumerated(EnumType.STRING)
    @Column(name = "farmer_type")
    private FarmerType farmerType;

    /** Buyer subtype */
    @Enumerated(EnumType.STRING)
    @Column(name = "buyer_type")
    private BuyerType buyerType;

    @Builder.Default
    private Boolean verified = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private VerificationStatus verificationStatus = VerificationStatus.NOT_VERIFIED;

    private LocalDateTime verifiedAt;

    private String verifiedBy;

    @Column(columnDefinition = "TEXT")
    private String verificationNotes;

    @Column(columnDefinition = "TEXT")
    private String statusReason;

    private LocalDateTime statusUpdatedAt;

    private String statusUpdatedBy;

    @Builder.Default
    private Double rating = 0.0;

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

    public enum Role {
        FARMER,
        BUSINESS,
        ADMIN
    }

    public enum UserStatus {
        ACTIVE,
        SUSPENDED,
        DEACTIVATED
    }

    public enum AuthProvider {
        EMAIL,
        GOOGLE,
        PHONE
    }

    public enum FarmerType {
        SINGLE_CROP,
        MULTI_CROP,
        FPO
    }

    public enum BuyerType {
        INDIVIDUAL,
        PRIVATE_BUSINESS,
        CORPORATE,
        GOVERNMENT,
        FPO_COOPERATIVE,
        OTHER
    }

    public enum VerificationStatus {
        NOT_VERIFIED,
        PENDING,
        VERIFIED,
        REJECTED,
        RE_SUBMISSION_REQUESTED
    }
}
