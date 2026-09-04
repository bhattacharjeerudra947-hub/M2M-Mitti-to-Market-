package com.mitti2market.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

/**
 * Service for uploading files to Cloudinary.
 * Handles validation, upload, and returns the secure URL.
 *
 * Supports both images (JPG, PNG, WebP) and documents (PDF).
 * MySQL stores ONLY the Cloudinary URL and public ID — never the file binary.
 */
@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private static final Set<String> ALLOWED_DOC_TYPES = Set.of(
            "application/pdf"
    );

    private static final Set<String> ALLOWED_ALL_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"
    );

    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB
    private static final long MAX_DOC_SIZE = 3 * 1024 * 1024;    // 3MB

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * Upload a file (image or PDF) to Cloudinary.
     *
     * @param file       the multipart file from the request
     * @param folder     Cloudinary folder (e.g. "mitti2market/users/{uid}/profile")
     * @param isImage    true for images, false for PDFs
     * @return Map with "url" (secure URL) and "publicId" (Cloudinary ID for deletion)
     * @throws IllegalArgumentException if validation fails
     * @throws RuntimeException          if upload fails
     */
    public Map<String, String> uploadFile(MultipartFile file, String folder, boolean isImage) {
        // 1. Validate file is not empty
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file to upload");
        }

        // 2. Validate MIME type
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new IllegalArgumentException("Could not determine file type");
        }
        contentType = contentType.toLowerCase();

        if (isImage && !ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Photo must be JPG, JPEG, PNG, or WebP");
        }
        if (!isImage && !ALLOWED_DOC_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Document must be a PDF file");
        }

        // 3. Validate file size
        long maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
        if (file.getSize() > maxSize) {
            String sizeLabel = isImage ? "5MB" : "3MB";
            throw new IllegalArgumentException("File too large. Maximum size is " + sizeLabel);
        }

        // 4. Validate file extension matches MIME type
        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String lowerName = originalFilename.toLowerCase();
            if (isImage && !lowerName.matches(".*\\.(jpg|jpeg|png|webp)$")) {
                throw new IllegalArgumentException("File extension does not match image format");
            }
            if (!isImage && !lowerName.endsWith(".pdf")) {
                throw new IllegalArgumentException("File must have .pdf extension");
            }
        }

        try {
            // 5. Upload to Cloudinary
            String resourceType = isImage ? "image" : "raw";
            Map<String, Object> options = ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", resourceType,
                    "unique_filename", true,
                    "overwrite", false
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), options);

            String secureUrl = (String) result.get("secure_url");
            String publicId = (String) result.get("public_id");

            return Map.of(
                    "url", secureUrl,
                    "publicId", publicId,
                    "folder", folder
            );

        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to Cloudinary: " + e.getMessage(), e);
        }
    }

    /**
     * Convenience method for uploading images.
     */
    public Map<String, String> uploadImage(MultipartFile file, String folder) {
        return uploadFile(file, folder, true);
    }

    /**
     * Convenience method for uploading documents (PDFs).
     */
    public Map<String, String> uploadDocument(MultipartFile file, String folder) {
        return uploadFile(file, folder, false);
    }

    /**
     * Delete a file from Cloudinary by public ID.
     *
     * @param publicId     the Cloudinary public ID returned during upload
     * @param isImage      true for images, false for raw files (PDFs)
     */
    public void deleteFile(String publicId, boolean isImage) {
        try {
            String resourceType = isImage ? "image" : "raw";
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", resourceType));
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file from Cloudinary: " + e.getMessage(), e);
        }
    }

    /**
     * Convenience method for deleting images.
     */
    public void deleteImage(String publicId) {
        deleteFile(publicId, true);
    }

    /**
     * Convenience method for deleting documents (PDFs).
     */
    public void deleteDocument(String publicId) {
        deleteFile(publicId, false);
    }
}
