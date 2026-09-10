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
            docType = SupportingDocument.DocumentType.valueOf(documentTypeStr.toUpperCase());
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

            // If user was waiting for re-submission, reset to PENDING when re-uploaded
            if (user.getVerificationStatus() == User.VerificationStatus.RE_SUBMISSION_REQUESTED) {
                long remainingFlagged = documents.findByUserId(userId).stream()
                        .filter(d -> d.getVerificationStatus() == SupportingDocument.VerificationStatus.RE_UPLOAD_REQUESTED)
                        .count();
                if (remainingFlagged == 0) {
                    user.setVerificationStatus(User.VerificationStatus.PENDING);
                    users.save(user);
                }
            }

            return ResponseEntity.ok(ApiResponse.ok("Document uploaded successfully", toResponse(doc)));

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

        user.setVerificationStatus(User.VerificationStatus.PENDING);
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

    // ═══════════════════════════════════════════════════════════════
    // Admin Endpoints
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/admin/documents/pending
     * List all pending documents for admin review.
     */
    @GetMapping("/admin/pending")
    public ResponseEntity<?> getPendingDocuments(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        List<SupportingDocument> docs = documents.findByVerificationStatus(
                SupportingDocument.VerificationStatus.PENDING);

        List<Map<String, Object>> responses = docs.stream().map(doc -> {
            Map<String, Object> resp = new java.util.HashMap<>();
            resp.put("id", doc.getId());
            resp.put("userId", doc.getUser().getId());
            resp.put("userName", doc.getUser().getName());
            resp.put("userPhone", doc.getUser().getPhone());
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
     * PUT /api/admin/documents/{id}/verify
     * Approve a document.
     */
    @PutMapping("/admin/{id}/verify")
    public ResponseEntity<?> verifyDocument(
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

        doc.setVerificationStatus(SupportingDocument.VerificationStatus.VERIFIED);
        doc.setReviewedBy(userId);
        doc.setReviewedAt(LocalDateTime.now());
        documents.save(doc);

        return ResponseEntity.ok(ApiResponse.ok("Document verified", toResponse(doc)));
    }

    /**
     * PUT /api/admin/documents/{id}/reject
     * Reject a document with a reason.
     */
    @PutMapping("/admin/{id}/reject")
    public ResponseEntity<?> rejectDocument(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        SupportingDocument doc = documents.findById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Document not found"));
        }

        String reason = body.getOrDefault("reason", "No reason provided");
        doc.setVerificationStatus(SupportingDocument.VerificationStatus.REJECTED);
        doc.setRejectionReason(reason);
        doc.setReviewedBy(userId);
        doc.setReviewedAt(LocalDateTime.now());
        documents.save(doc);

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

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        SupportingDocument doc = documents.findById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Document not found"));
        }

        String reason = body.getOrDefault("reason", "Document is unclear or invalid. Please re-upload.");
        doc.setVerificationStatus(SupportingDocument.VerificationStatus.RE_UPLOAD_REQUESTED);
        doc.setRejectionReason(reason);
        doc.setReviewedBy(userId);
        doc.setReviewedAt(LocalDateTime.now());
        documents.save(doc);

        User user = doc.getUser();
        user.setVerificationStatus(User.VerificationStatus.RE_SUBMISSION_REQUESTED);
        user.setVerificationNotes(reason);
        users.save(user);

        return ResponseEntity.ok(ApiResponse.ok("Re-upload requested for document", toResponse(doc)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
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
