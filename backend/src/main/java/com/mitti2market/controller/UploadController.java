package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.service.CloudinaryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Upload controller — sends images to Cloudinary and returns the secure URL.
 * MySQL stores ONLY the URL, never the file binary.
 */
@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private final CloudinaryService cloudinaryService;

    public UploadController(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

    /**
     * POST /api/upload/image
     * Upload an image to Cloudinary.
     *
     * Request: multipart/form-data with "file" field
     * Response: { url: "https://res.cloudinary.com/.../image.jpg", publicId: "mitti2market/..." }
     *
     * The returned URL should be saved in MySQL (e.g. Produce.imageUrl, User.profilePhotoUrl).
     */
    @PostMapping("/image")
    public ResponseEntity<?> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "mitti2market/general") String folder) {

        try {
            Map<String, String> result = cloudinaryService.uploadImage(file, folder);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.ok("Image uploaded successfully", result));

        } catch (IllegalArgumentException e) {
            // Validation error (bad file type, too large, etc.)
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));

        } catch (Exception e) {
            // Upload failure
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to upload image: " + e.getMessage()));
        }
    }

    /**
     * DELETE /api/upload/image/{publicId}
     * Delete an image from Cloudinary by public ID.
     */
    @DeleteMapping("/image/{publicId}")
    public ResponseEntity<?> deleteImage(@PathVariable String publicId) {
        try {
            cloudinaryService.deleteImage(publicId);
            return ResponseEntity.ok(ApiResponse.ok("Image deleted", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to delete image"));
        }
    }
}
