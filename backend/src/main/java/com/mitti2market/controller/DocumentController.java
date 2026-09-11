package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.DocumentResponse;
import com.mitti2market.model.SupportingDocument;
import com.mitti2market.model.User;
import com.mitti2market.repository.SupportingDocumentRepository;
import com.mitti2market.repository.UserRepository;
import com.mitti2market.service.CloudinaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final SupportingDocumentRepository documents;
    private final UserRepository users;
    private final CloudinaryService cloudinary;
    private final TokenService tokens;

    public DocumentController(SupportingDocumentRepository documents, UserRepository users,
                              CloudinaryService cloudinary, TokenService tokens) {
        this.documents = documents;
        this.users = users;
        this.cloudinary = cloudinary;
        this.tokens = tokens;
    }

    // ═══════════════════════════════════════════════════════════════
    // User Endpoints
    // ═══════════════════════════════════════════════════════════════

    /**
     * POST /api/documents/upload
     * Upload a supporting document (PDF) or profile photo (image) to Cloudinary.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") String documentTypeStr) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        User user = users.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("User not found"));
        }

        // Parse document type
        SupportingDocument.DocumentType docType;
        try {
            String normalized = documentTypeStr.trim().toUpperCase().replace(" ", "_").replace("-", "_");
            docType = SupportingDocument.DocumentType.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid document type: " + documentTypeStr));
        }

        // Determine if this is an image or PDF
        boolean isImage = docType == SupportingDocument.DocumentType.PROFILE_PHOTO;
        String contentType = file.getContentType();
        if (contentType != null && contentType.toLowerCase().startsWith("image/")) {
            isImage = true;
        }

        // Determine Cloudinary folder
        String firebaseUid = user.getFirebaseUid() != null ? user.getFirebaseUid() : "user_" + userId;
        String subfolder = isImage ? "profile" : "identity";
        String folder = "mitti2market/users/" + firebaseUid + "/" + subfolder;

        try {
            // Upload to Cloudinary
            Map<String, String> uploadResult = cloudinary.uploadFile(file, folder, isImage);

            // If user already has a document of this type, replace it
            List<SupportingDocument> existing = documents.findByUserIdAndDocumentType(userId, docType);
            SupportingDocument doc;
            if (!existing.isEmpty()) {
                doc = existing.get(0);
                try {
                    if (doc.getCloudinaryPublicId() != null) {
                        cloudinary.deleteFile(doc.getCloudinaryPublicId(), isImage);
                    }
                } catch (Exception ignored) {}

                doc.setOriginalFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown");
                doc.setCloudinaryPublicId(uploadResult.get("publicId"));
                doc.setCloudinaryUrl(uploadResult.get("url"));
                doc.setCloudinaryFolder(uploadResult.get("folder"));
                doc.setFileSize(file.getSize());
                doc.setMimeType(contentType != null ? contentType : "application/octet-stream");
                doc.setVerificationStatus(SupportingDocument.VerificationStatus.PENDING);
                doc.setRejectionReason(null);
            } else {
                doc = SupportingDocument.builder()
                        .user(user)
                        .documentType(docType)
                        .originalFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown")
                        .cloudinaryPublicId(uploadResult.get("publicId"))
                        .cloudinaryUrl(uploadResult.get("url"))
                        .cloudinaryFolder(uploadResult.get("folder"))
                        .fileSize(file.getSize())
                        .mimeType(contentType != null ? contentType : "application/octet-stream")
                        .verificationStatus(SupportingDocument.VerificationStatus.PENDING)
                        .build();
            }

            doc = documents.save(doc);

            // If this is a profile photo, update the User entity directly
            if (docType == SupportingDocument.DocumentType.PROFILE_PHOTO) {
                String secureUrl = uploadResult.get("url");
                if (secureUrl != null) {
                    String separator = secureUrl.contains("?") ? "&" : "?";
                    secureUrl = secureUrl + separator + "v=" + System.currentTimeMillis();
                }
                user.setProfilePhotoUrl(secureUrl);
                user.setProfilePhotoPublicId(uploadResult.get("publicId"));
                users.save(user);
            } else {
                // For supporting documents: update verification status to DOCUMENTS_SUBMITTED
                user.setVerificationStatus(User.VerificationStatus.DOCUMENTS_SUBMITTED);
                user.setStatusUpdatedAt(LocalDateTime.now());
                users.save(user);
            }

            String successMessage = docType == SupportingDocument.DocumentType.PROFILE_PHOTO
                    ? "Profile photo uploaded successfully."
                    : "Document uploaded successfully. Awaiting admin verification.";
            return ResponseEntity.ok(ApiResponse.ok(successMessage, toResponse(doc)));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to upload document: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/documents/resubmit
     * User explicitly marks application as re-submitted for admin verification
     */
    @PutMapping("/resubmit")
    public ResponseEntity<?> resubmitVerification(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        User user = users.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("User not found"));
        }

        user.setVerificationStatus(User.VerificationStatus.DOCUMENTS_SUBMITTED);
        user.setStatusUpdatedAt(LocalDateTime.now());
        user.setStatusReason("Documents resubmitted by user for verification");
        users.save(user);

        return ResponseEntity.ok(ApiResponse.ok("Application re-submitted for admin verification", null));
    }

    /**
     * GET /api/documents/my-documents
     * List all documents for the authenticated user.
     */
    @GetMapping("/my-documents")
    public ResponseEntity<?> getMyDocuments(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        List<SupportingDocument> docs = documents.findByUserId(userId);
        List<DocumentResponse> responses = docs.stream().map(this::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }

    /**
     * DELETE /api/documents/{id}
     * Delete a document (only the owner can delete, and only if PENDING).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        SupportingDocument doc = documents.findById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Document not found"));
        }

        if (!doc.getUser().getId().equals(userId)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
        }

        // Only allow deletion if PENDING
        if (doc.getVerificationStatus() == SupportingDocument.VerificationStatus.VERIFIED) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Cannot delete a verified document"));
        }

        // Delete from Cloudinary
        try {
            boolean isImage = doc.getMimeType() != null && doc.getMimeType().startsWith("image/");
            if (doc.getCloudinaryPublicId() != null) {
                cloudinary.deleteFile(doc.getCloudinaryPublicId(), isImage);
            }
        } catch (Exception ignored) {}

        documents.delete(doc);
        return ResponseEntity.ok(ApiResponse.ok("Document deleted", null));
    }

    /**
     * GET /api/documents/{id}
     * Get document metadata. Only accessible by the owner or ADMIN.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getDocument(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        SupportingDocument doc = documents.findById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Document not found"));
        }

        User caller = users.findById(userId).orElse(null);
        if (caller == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("User not found"));
        }

        if (!doc.getUser().getId().equals(userId) && caller.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied: You cannot view another user's private documents"));
        }

        return ResponseEntity.ok(ApiResponse.ok(toResponse(doc)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Admin Endpoints
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/documents/admin/pending
     * List all pending documents for admin review.
     */
    @GetMapping("/admin/pending")
    public ResponseEntity<?> getPendingDocuments(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        User admin = requireAdmin(authHeader);
        if (admin == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied: Admin privileges required"));
        }

        List<SupportingDocument> docs = documents.findByVerificationStatus(
                SupportingDocument.VerificationStatus.PENDING);

        List<Map<String, Object>> responses = docs.stream().map(doc -> {
            Map<String, Object> resp = new java.util.HashMap<>();
            resp.put("id", doc.getId());
            resp.put("userId", doc.getUser().getId());
            resp.put("userName", doc.getUser().getName());
            resp.put("userPhone", doc.getUser().getPhone());
            resp.put("userEmail", doc.getUser().getEmail());
            resp.put("userRole", doc.getUser().getRole().name());
            resp.put("documentType", doc.getDocumentType().name());
            resp.put("originalFilename", doc.getOriginalFilename());
            resp.put("cloudinaryUrl", doc.getCloudinaryUrl());
            resp.put("fileSize", doc.getFileSize());
            resp.put("mimeType", doc.getMimeType());
            resp.put("verificationStatus", doc.getVerificationStatus().name());
            resp.put("rejectionReason", doc.getRejectionReason());
            resp.put("uploadedAt", doc.getCreatedAt());
            return resp;
        }).toList();

        return ResponseEntity.ok(ApiResponse.ok(responses));
    }

    /**
     * PUT /api/documents/admin/{id}/verify
     * Approve a document.
     */
    @PutMapping("/admin/{id}/verify")
    public ResponseEntity<?> verifyDocument(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        User admin = requireAdmin(authHeader);
        if (admin == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied: Admin privileges required"));
        }

        SupportingDocument doc = documents.findById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Document not found"));
        }

        doc.setVerificationStatus(SupportingDocument.VerificationStatus.VERIFIED);
        doc.setRejectionReason(null);
        doc.setReviewedBy(admin.getId());
        doc.setReviewedAt(LocalDateTime.now());
        documents.save(doc);

        // Check if all supporting documents for user are verified
        User docUser = doc.getUser();
        List<SupportingDocument> userDocs = documents.findByUserId(docUser.getId());
        boolean hasPending = userDocs.stream().anyMatch(d ->
                d.getVerificationStatus() == SupportingDocument.VerificationStatus.PENDING
                || d.getVerificationStatus() == SupportingDocument.VerificationStatus.RE_UPLOAD_REQUESTED);
        boolean hasRejected = userDocs.stream().anyMatch(d ->
                d.getVerificationStatus() == SupportingDocument.VerificationStatus.REJECTED);

        if (!hasPending && !hasRejected) {
            docUser.setVerified(true);
            docUser.setVerificationStatus(User.VerificationStatus.VERIFIED);
            docUser.setVerifiedAt(LocalDateTime.now());
            docUser.setVerifiedBy(admin.getName() != null ? admin.getName() : "ADMIN");
            users.save(docUser);
        }

        return ResponseEntity.ok(ApiResponse.ok("Document verified", toResponse(doc)));
    }

    /**
     * PUT /api/documents/admin/{id}/reject
     * Reject a document with a reason.
     */
    @PutMapping("/admin/{id}/reject")
    public ResponseEntity<?> rejectDocument(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        User admin = requireAdmin(authHeader);
        if (admin == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied: Admin privileges required"));
        }

        SupportingDocument doc = documents.findById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Document not found"));
        }

        String reason = body.getOrDefault("reason", "Verification document does not meet platform requirements.");
        doc.setVerificationStatus(SupportingDocument.VerificationStatus.REJECTED);
        doc.setRejectionReason(reason);
        doc.setReviewedBy(admin.getId());
        doc.setReviewedAt(LocalDateTime.now());
        documents.save(doc);

        // Immediately reflect verification lost on user profile
        User docUser = doc.getUser();
        docUser.setVerified(false);
        docUser.setVerificationStatus(User.VerificationStatus.REJECTED);
        docUser.setVerificationNotes(doc.getDocumentType().name() + " rejected: " + reason);
        users.save(docUser);

        return ResponseEntity.ok(ApiResponse.ok("Document rejected", toResponse(doc)));
    }

    /**
     * PUT /api/admin/documents/{id}/request-reupload
     * Admin requests user to re-upload this specific document with reason.
     */
    @PutMapping("/admin/{id}/request-reupload")
    public ResponseEntity<?> requestDocReupload(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        User admin = requireAdmin(authHeader);
        if (admin == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied: Admin privileges required"));
        }

        SupportingDocument doc = documents.findById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Document not found"));
        }

        String reason = body.getOrDefault("reason", "Document is unclear or invalid. Please re-upload.");
        doc.setVerificationStatus(SupportingDocument.VerificationStatus.RE_UPLOAD_REQUESTED);
        doc.setRejectionReason(reason);
        doc.setReviewedBy(admin.getId());
        doc.setReviewedAt(LocalDateTime.now());
        documents.save(doc);

        User user = doc.getUser();
        user.setVerified(false);
        user.setVerificationStatus(User.VerificationStatus.RE_SUBMISSION_REQUESTED);
        user.setVerificationNotes(reason);
        users.save(user);

        return ResponseEntity.ok(ApiResponse.ok("Re-upload requested for document", toResponse(doc)));
    }

    private User requireAdmin(String authHeader) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return null;
        User user = users.findById(userId).orElse(null);
        if (user == null || user.getRole() != User.Role.ADMIN) return null;
        return user;
    }

    // ═══════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════

    private Long extractUserId(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            Long uid = tokens.validateAccessToken(authHeader.substring(7));
            if (uid != null) return uid;
        }
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long uid) {
            return uid;
        }
        return null;
    }

    private DocumentResponse toResponse(SupportingDocument doc) {
        return DocumentResponse.builder()
                .id(doc.getId())
                .documentType(doc.getDocumentType().name())
                .originalFilename(doc.getOriginalFilename())
                .cloudinaryUrl(doc.getCloudinaryUrl())
                .cloudinaryPublicId(doc.getCloudinaryPublicId())
                .fileSize(doc.getFileSize())
                .mimeType(doc.getMimeType())
                .verificationStatus(doc.getVerificationStatus().name())
                .rejectionReason(doc.getRejectionReason())
                .uploadedAt(doc.getCreatedAt())
                .reviewedAt(doc.getReviewedAt())
                .build();
    }
}
