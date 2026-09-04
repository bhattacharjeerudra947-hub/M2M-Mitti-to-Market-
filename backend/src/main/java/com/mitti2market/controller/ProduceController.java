package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.produce.ProduceRequest;
import com.mitti2market.dto.produce.ProduceResponse;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.service.CloudinaryService;
import com.mitti2market.service.ProduceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/produce")
@RequiredArgsConstructor
public class ProduceController {

    private final ProduceService produceService;
    private final CloudinaryService cloudinaryService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProduceResponse>> createProduce(
            @Valid @RequestBody ProduceRequest request) {
        ProduceResponse produced = produceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Produce created successfully", produced));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProduceResponse>>> getAllProduce(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Boolean availableOnly) {
        List<ProduceResponse> produceList = produceService.listAll(category, keyword, location, availableOnly);
        return ResponseEntity.ok(ApiResponse.ok(produceList));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProduceResponse>> getProduceById(@PathVariable Long id) {
        ProduceResponse produce = produceService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok(produce));
    }

    @GetMapping("/farmer/{farmerId}")
    public ResponseEntity<ApiResponse<List<ProduceResponse>>> getProduceByFarmer(@PathVariable Long farmerId) {
        List<ProduceResponse> produceList = produceService.getByFarmer(farmerId);
        return ResponseEntity.ok(ApiResponse.ok(produceList));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProduceResponse>> updateProduce(
            @PathVariable Long id,
            @Valid @RequestBody ProduceRequest request) {
        ProduceResponse updated = produceService.update(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Produce updated successfully", updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ProduceResponse>> updateProduceStatus(
            @PathVariable Long id,
            @RequestParam ProduceStatus status) {
        ProduceResponse updated = produceService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.ok("Status updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduce(@PathVariable Long id) {
        produceService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Produce deleted successfully", null));
    }

    /**
     * POST /api/produce/upload-image
     * Upload a produce image to Cloudinary and return the URL.
     * The URL can then be passed as imageUrl when creating/updating produce.
     */
    @PostMapping("/upload-image")
    public ResponseEntity<?> uploadProduceImage(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Please select an image"));
            }

            String contentType = file.getContentType();
            if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
                return ResponseEntity.badRequest().body(ApiResponse.error("File must be an image (JPG, PNG, WebP)"));
            }

            if (file.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Image must be under 5MB"));
            }

            String folder = "mitti2market/produce";
            Map<String, String> result = cloudinaryService.uploadImage(file, folder);

            return ResponseEntity.ok(ApiResponse.ok("Image uploaded successfully", Map.of(
                    "imageUrl", result.get("url"),
                    "publicId", result.get("publicId")
            )));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to upload image: " + e.getMessage()));
        }
    }
}
