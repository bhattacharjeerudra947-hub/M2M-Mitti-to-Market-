package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.Deal;
import com.mitti2market.model.FarmerProfile;
import com.mitti2market.model.Produce;
import com.mitti2market.model.SupportingDocument;
import com.mitti2market.model.User;
import com.mitti2market.model.User.Role;
import com.mitti2market.repository.DealRepository;
import com.mitti2market.repository.FarmerProfileRepository;
import com.mitti2market.repository.ProduceRepository;
import com.mitti2market.repository.SupportingDocumentRepository;
import com.mitti2market.repository.UserRepository;
import com.mitti2market.service.CloudinaryService;
import com.mitti2market.service.RatingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final UserRepository users;
    private final TokenService tokens;
    private final CloudinaryService cloudinary;
    private final SupportingDocumentRepository documents;
    private final FarmerProfileRepository farmerProfiles;
    private final ProduceRepository produceRepo;
    private final DealRepository dealRepo;
    private final RatingService ratingService;

    public UserController(UserRepository users, TokenService tokens,
                          CloudinaryService cloudinary, SupportingDocumentRepository documents,
                          FarmerProfileRepository farmerProfiles, ProduceRepository produceRepo,
                          DealRepository dealRepo, RatingService ratingService) {
        this.users = users;
        this.tokens = tokens;
        this.cloudinary = cloudinary;
        this.documents = documents;
        this.farmerProfiles = farmerProfiles;
        this.produceRepo = produceRepo;
        this.dealRepo = dealRepo;
        this.ratingService = ratingService;
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        return users.findById(id)
                .map(user -> ResponseEntity.ok(ApiResponse.ok(toDto(user))))
                .orElse(ResponseEntity.status(404).body(ApiResponse.error("User not found")));
    }

    /**
     * GET /api/users/{id}/public-profile
     * Public profile view for buyers viewing farmers.
     * Contains public business details, crop history, active produce, rating summary, and reviews.
     * NEVER exposes Aadhaar, bank details, exact private GPS coords, or admin notes.
     */
    @GetMapping("/{id}/public-profile")
    public ResponseEntity<?> getFarmerPublicProfile(@PathVariable Long id) {
        User farmer = users.findById(id).orElse(null);
        if (farmer == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Farmer not found"));
        }

        FarmerProfile profile = farmerProfiles.findByUserId(id).orElse(null);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", farmer.getId());
        out.put("name", farmer.getName());
        out.put("verified", farmer.getVerified() != null && farmer.getVerified());
        out.put("verificationStatus", farmer.getStandardVerificationStatus());
        out.put("verifiedAt", farmer.getVerifiedAt());
        out.put("profilePhotoUrl", farmer.getProfilePhotoUrl());
        out.put("state", farmer.getState() != null ? farmer.getState() : (profile != null ? profile.getState() : ""));
        out.put("district", farmer.getDistrict() != null ? farmer.getDistrict() : (profile != null ? profile.getDistrict() : ""));
        out.put("village", profile != null ? profile.getVillage() : (farmer.getVillage() != null ? farmer.getVillage() : ""));
        out.put("crops", profile != null ? profile.getCrops() : "");
        out.put("farmerCategory", profile != null && profile.getFarmerCategory() != null ? profile.getFarmerCategory().name() : (farmer.getFarmerType() != null ? farmer.getFarmerType().name() : ""));
        out.put("farmingSeason", profile != null && profile.getFarmingSeason() != null ? profile.getFarmingSeason().name() : "");
        out.put("landAreaAcres", profile != null ? profile.getLandAreaAcres() : null);

        // Active produce listings
        List<Produce> activeProduceList = produceRepo.findByFarmerIdAndStatusIn(id,
                List.of(Produce.ProduceStatus.AVAILABLE, Produce.ProduceStatus.PARTIALLY_SOLD));
        List<Map<String, Object>> produceSummary = activeProduceList.stream().map(p -> {
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("id", p.getId());
            pm.put("name", p.getName());
            pm.put("category", p.getCategory());
            pm.put("quantity", p.getQuantity());
            pm.put("unit", p.getUnit());
            pm.put("pricePerUnit", p.getPricePerUnit());
            pm.put("imageUrl", p.getImageUrl());
            pm.put("status", p.getStatus() != null ? p.getStatus().name() : "AVAILABLE");
            return pm;
        }).toList();
        out.put("activeProduce", produceSummary);

        // Completed deals count
        long completedDealsCount = dealRepo.findByUserIdAndStatus(id, Deal.DealStatus.COMPLETED).size();
        out.put("completedDealsCount", completedDealsCount);

        // Transaction rating summary & reviews
        out.put("ratingSummary", ratingService.getUserRatingSummary(id));
        out.put("reviews", ratingService.getReviewsForUser(id));

        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    @GetMapping
    public ResponseEntity<?> listUsers(@RequestParam(required = false) Role role) {
        List<User> list = (role != null) ? users.findByRole(role) : users.findAll();
        return ResponseEntity.ok(ApiResponse.ok(list.stream().map(this::toDto).toList()));
    }

    @GetMapping("/farmers")
    public ResponseEntity<?> findFarmers(@RequestParam(required = false) String location) {
        List<User> farmers = (location != null && !location.isBlank())
                ? users.findByRoleAndLocationContainingIgnoreCase(Role.FARMER, location)
                : users.findByRole(Role.FARMER);
        return ResponseEntity.ok(ApiResponse.ok(farmers.stream().map(this::toDto).toList()));
    }

    /**
     * GET /api/users/locations — map view of every farmer and business.
     *
     * Privacy-first design:
     *  - Exact coordinates are only returned when the user has actually shared
     *    them (latitude/longitude set). Otherwise an APPROXIMATE city-level
     *    coordinate from the built-in lookup is used (clearly labelled).
     */
    @GetMapping("/locations")
    public ResponseEntity<?> listLocations() {
        List<Map<String, Object>> result = Stream.concat(
                        users.findByRole(Role.FARMER).stream(),
                        users.findByRole(Role.BUSINESS).stream())
                .distinct()
                .map(u -> locationDto(u))
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    private Map<String, Object> locationDto(User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", user.getId());
        m.put("name", user.getName() != null ? user.getName() : "");
        m.put("role", user.getRole().name());
        m.put("location", user.getLocation() != null ? user.getLocation() : "");
        m.put("organizationName", user.getOrganizationName() != null ? user.getOrganizationName() : "");
        m.put("verified", user.getVerified() != null && user.getVerified());
        m.put("rating", user.getRating() != null ? user.getRating() : 0.0);
        m.put("profilePhotoUrl", user.getProfilePhotoUrl() != null ? user.getProfilePhotoUrl() : "");

        if (user.getLatitude() != null && user.getLongitude() != null) {
            m.put("latitude", user.getLatitude());
            m.put("longitude", user.getLongitude());
            m.put("locationAccuracy", "EXACT");
        } else {
            double[] approx = cityCoordinates(user.getLocation());
            m.put("latitude", approx[0]);
            m.put("longitude", approx[1]);
            m.put("locationAccuracy", "APPROXIMATE");
        }
        return m;
    }

    /**
     * POST /api/users/profile-picture
     * Upload and set profile picture using Cloudinary.
     * Validates JPG, JPEG, PNG, WEBP, max 5MB.
     */
    @PostMapping("/profile-picture")
    public ResponseEntity<?> uploadProfilePicture(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam("file") MultipartFile file) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        User user = users.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("User not found"));
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Please select an image file to upload"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().matches("^image/(jpeg|jpg|png|webp)$")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Profile picture must be JPG, JPEG, PNG, or WebP"));
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Profile picture exceeds 5MB limit"));
        }

        String firebaseUid = user.getFirebaseUid() != null ? user.getFirebaseUid() : "user_" + userId;
        String folder = "mitti2market/users/" + firebaseUid + "/profile";
        String oldPublicId = user.getProfilePhotoPublicId();
        String uploadedPublicId = null;

        log.info("PROFILE_UPLOAD_START userId={}", userId);

        try {
            // 1. Upload new image to Cloudinary first
            Map<String, String> uploadResult = cloudinary.uploadFile(file, folder, true);
            String secureUrl = uploadResult.get("url");
            uploadedPublicId = uploadResult.get("publicId");
            log.info("CLOUDINARY_UPLOAD_SUCCESS userId={} publicId={}", userId, uploadedPublicId);

            if (secureUrl != null) {
                String separator = secureUrl.contains("?") ? "&" : "?";
                secureUrl = secureUrl + separator + "v=" + System.currentTimeMillis();
            }

            // 2. Persist new photo in Database
            user.setProfilePhotoUrl(secureUrl);
            user.setProfilePhotoPublicId(uploadedPublicId);
            user = users.save(user);
            log.info("DATABASE_PROFILE_UPDATE_SUCCESS userId={}", userId);

            // 3. Record in supporting_documents
            try {
                List<SupportingDocument> existing = documents.findByUserIdAndDocumentType(userId, SupportingDocument.DocumentType.PROFILE_PHOTO);
                SupportingDocument doc;
                if (!existing.isEmpty()) {
                    doc = existing.get(0);
                    doc.setOriginalFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "profile.jpg");
                    doc.setCloudinaryUrl(secureUrl);
                    doc.setCloudinaryPublicId(uploadedPublicId);
                    doc.setCloudinaryFolder(folder);
                    doc.setFileSize(file.getSize());
                    doc.setMimeType(contentType);
                    doc.setVerificationStatus(SupportingDocument.VerificationStatus.VERIFIED);
                } else {
                    doc = SupportingDocument.builder()
                            .user(user)
                            .documentType(SupportingDocument.DocumentType.PROFILE_PHOTO)
                            .originalFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "profile.jpg")
                            .cloudinaryUrl(secureUrl)
                            .cloudinaryPublicId(uploadedPublicId)
                            .cloudinaryFolder(folder)
                            .fileSize(file.getSize())
                            .mimeType(contentType)
                            .verificationStatus(SupportingDocument.VerificationStatus.VERIFIED)
                            .build();
                }
                documents.save(doc);
            } catch (Exception docEx) {
                log.warn("Failed to record profile photo in supporting_documents for userId={}: {}", userId, docEx.getMessage());
            }

            // 4. Safely clean up old photo AFTER new photo is stored
            if (oldPublicId != null && !oldPublicId.equals(uploadedPublicId)) {
                try {
                    cloudinary.deleteFile(oldPublicId, true);
                } catch (Exception ignored) {}
            }

            log.info("PROFILE_UPLOAD_COMPLETE userId={}", userId);
            return ResponseEntity.ok(ApiResponse.ok("Profile photo uploaded successfully.", toDto(user)));

        } catch (Exception e) {
            log.error("PROFILE_UPLOAD_FAILED userId={} reason={}", userId, e.getMessage());
            // If Cloudinary succeeded but DB failed, clean up the newly uploaded Cloudinary asset
            if (uploadedPublicId != null) {
                try {
                    cloudinary.deleteFile(uploadedPublicId, true);
                } catch (Exception cleanupEx) {
                    log.warn("Failed to clean up orphaned Cloudinary asset {}: {}", uploadedPublicId, cleanupEx.getMessage());
                }
            }
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to upload profile photo: " + e.getMessage()));
        }
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }

    private Map<String, Object> toDto(User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("name", user.getName() != null ? user.getName() : "");
        map.put("email", user.getEmail() != null ? user.getEmail() : "");
        map.put("phone", user.getPhone() != null ? user.getPhone() : "");
        map.put("role", user.getRole() != null ? user.getRole().name() : "");
        map.put("location", user.getLocation() != null ? user.getLocation() : "");
        map.put("state", user.getState() != null ? user.getState() : "");
        map.put("district", user.getDistrict() != null ? user.getDistrict() : "");
        map.put("organizationName", user.getOrganizationName() != null ? user.getOrganizationName() : "");
        map.put("verified", user.getVerified() != null && user.getVerified());
        map.put("verificationStatus", user.getStandardVerificationStatus());
        map.put("verificationNotes", user.getVerificationNotes());
        map.put("status", user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
        map.put("statusReason", user.getStatusReason());
        map.put("statusUpdatedAt", user.getStatusUpdatedAt());
        map.put("verifiedAt", user.getVerifiedAt());
        map.put("verifiedBy", user.getVerifiedBy());
        map.put("rating", user.getRating() != null ? user.getRating() : 0.0);
        map.put("profilePhotoUrl", user.getProfilePhotoUrl() != null ? user.getProfilePhotoUrl() : "");
        return map;
    }

    /** Approximate city-level coordinates for the map (demo lookup — labelled approximate). */
    private double[] cityCoordinates(String location) {
        if (location == null || location.isBlank()) return new double[]{20.5937, 78.9629}; // India centre
        String city = location.split(",")[0].trim().toUpperCase();
        city = switch (city) {
            case "BENGALURU", "BENGALURU CITY" -> "BANGALORE";
            case "NEW DELHI", "NCR" -> "DELHI";
            case "KOLKATA" -> "CALCUTTA";
            case "CHENNAI" -> "MADRAS";
            case "THIRUVANANTHAPURAM" -> "TRIVANDRUM";
            default -> city;
        };
        double[] coord = CITY_COORDS.get(city);
        return coord != null ? coord : new double[]{20.5937, 78.9629};
    }

    /** Demo city → approximate coordinates (do not treat as exact addresses). */
    private static final Map<String, double[]> CITY_COORDS = Map.ofEntries(
            Map.entry("PUNE", new double[]{18.5204, 73.8567}),
            Map.entry("MUMBAI", new double[]{19.0760, 72.8777}),
            Map.entry("NASHIK", new double[]{19.9975, 73.7898}),
            Map.entry("BANGALORE", new double[]{12.9716, 77.5946}),
            Map.entry("DELHI", new double[]{28.7041, 77.1025}),
            Map.entry("CALCUTTA", new double[]{22.5726, 88.3639}),
            Map.entry("CHENNAI", new double[]{13.0827, 80.2707}),
            Map.entry("HYDERABAD", new double[]{17.3850, 78.4867}),
            Map.entry("LUCKNOW", new double[]{26.8467, 80.9462}),
            Map.entry("JAIPUR", new double[]{26.9124, 75.7873}),
            Map.entry("CHANDIGARH", new double[]{30.7333, 76.7794}),
            Map.entry("AGRA", new double[]{27.1767, 78.0081}),
            Map.entry("KANPUR", new double[]{26.4499, 80.3319}),
            Map.entry("INDORE", new double[]{22.7196, 75.8577}),
            Map.entry("SURAT", new double[]{21.1702, 72.8311}),
            Map.entry("AHMEDABAD", new double[]{23.0225, 72.5714}),
            Map.entry("PATNA", new double[]{25.5941, 85.1376}),
            Map.entry("BHUBANESWAR", new double[]{20.2961, 85.8245}),
            Map.entry("KOCHI", new double[]{9.9312, 76.2673}),
            Map.entry("TRIVANDRUM", new double[]{8.5241, 76.9366})
    );
}