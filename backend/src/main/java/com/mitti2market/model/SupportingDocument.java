package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Supporting document entity — stores metadata for uploaded files.
 * The actual file is stored in Cloudinary.
 * MySQL stores only the Cloudinary reference (public ID, URL, metadata).
 */
@Entity
@Table(name = "supporting_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportingDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Owner of this document */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Document type: PROFILE_PHOTO, IDENTITY_DOC, BUSINESS_REGISTRATION, GST_CERTIFICATE, etc. */
    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false)
    private DocumentType documentType;

    /** Original filename as uploaded by the user */
    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    /** Cloudinary public ID — used for deletion and management */
    @Column(name = "cloudinary_public_id")
    private String cloudinaryPublicId;

    /** Cloudinary secure URL — the public URL to access the file */
    @Column(name = "cloudinary_url", length = 1024)
    private String cloudinaryUrl;

    /** File size in bytes */
    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    /** MIME type (e.g., application/pdf, image/jpeg) */
    @Column(name = "mime_type", nullable = false)
    private String mimeType;

    /** Cloudinary folder path */
    @Column(name = "cloudinary_folder")
    private String cloudinaryFolder;

    /** Verification status */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    /** Reason if document was rejected */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    /** Who reviewed the document (admin user ID) */
    @Column(name = "reviewed_by")
    private Long reviewedBy;

    /** When the document was reviewed */
    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

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

    public enum DocumentType {
        PROFILE_PHOTO,
        IDENTITY_DOC,
        AADHAAR_CARD,
        BUSINESS_REGISTRATION,
        GST_CERTIFICATE,
        PAN_CARD,
        GOVERNMENT_AUTHORIZATION,
        GOVERNMENT_ID,
        FPO_REGISTRATION,
        AUTHORIZATION_LETTER,
        ADDRESS_PROOF,
        OTHER
    }

    public enum VerificationStatus {
        PENDING,
        VERIFIED,
        REJECTED
    }
}
