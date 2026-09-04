package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.FarmerProfileRequest;
import com.mitti2market.dto.FarmerProfileResponse;
import com.mitti2market.model.FarmerProfile;
import com.mitti2market.model.User;
import com.mitti2market.repository.FarmerProfileRepository;
import com.mitti2market.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/farmers")
public class FarmerController {

    private final FarmerProfileRepository farmerProfiles;
    private final UserRepository users;
    private final TokenService tokens;

    public FarmerController(FarmerProfileRepository farmerProfiles, UserRepository users, TokenService tokens) {
        this.farmerProfiles = farmerProfiles;
        this.users = users;
        this.tokens = tokens;
    }

    /**
     * POST /api/farmers/profile
     * Create or update the authenticated user's farmer profile.
     */
    @PostMapping("/profile")
    public ResponseEntity<?> upsertProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody FarmerProfileRequest req) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        User user = users.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("User not found"));
        }
        if (user.getRole() != User.Role.FARMER) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User is not a farmer"));
        }

        FarmerProfile profile = farmerProfiles.findByUserId(userId).orElse(
                FarmerProfile.builder().user(user).build()
        );

        // Update fields
        if (req.getFarmerCategory() != null) {
            try {
                profile.setFarmerCategory(User.FarmerType.valueOf(req.getFarmerCategory().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (req.getFarmingSeason() != null) {
            try {
                profile.setFarmingSeason(FarmerProfile.FarmingSeason.valueOf(req.getFarmingSeason().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (req.getCrops() != null) profile.setCrops(req.getCrops());
        if (req.getLandAreaAcres() != null) profile.setLandAreaAcres(req.getLandAreaAcres());
        if (req.getLandOwnership() != null) {
            try {
                profile.setLandOwnership(FarmerProfile.LandOwnership.valueOf(req.getLandOwnership().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (req.getFarmAddress() != null) profile.setFarmAddress(req.getFarmAddress());
        if (req.getAadhaarLast4() != null) profile.setAadhaarLast4(req.getAadhaarLast4());
        if (req.getIdentityDocType() != null) profile.setIdentityDocType(req.getIdentityDocType());

        // Update user-level fields
        if (req.getFarmerCategory() != null) {
            try {
                user.setFarmerType(User.FarmerType.valueOf(req.getFarmerCategory().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }

        // Check if profile is complete
        if (profile.getFarmerCategory() != null && profile.getCrops() != null && !profile.getCrops().isBlank()) {
            profile.setProfileStatus(FarmerProfile.ProfileStatus.COMPLETE);
        }

        farmerProfiles.save(profile);
        users.save(user);

        return ResponseEntity.ok(ApiResponse.ok("Farmer profile saved", toResponse(profile)));
    }

    /**
     * GET /api/farmers/profile
     * Get the authenticated user's farmer profile.
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        FarmerProfile profile = farmerProfiles.findByUserId(userId).orElse(null);
        if (profile == null) {
            return ResponseEntity.ok(ApiResponse.ok("No profile yet", null));
        }

        return ResponseEntity.ok(ApiResponse.ok(toResponse(profile)));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }

    private FarmerProfileResponse toResponse(FarmerProfile p) {
        return FarmerProfileResponse.builder()
                .id(p.getId())
                .farmerCategory(p.getFarmerCategory() != null ? p.getFarmerCategory().name() : null)
                .farmingSeason(p.getFarmingSeason() != null ? p.getFarmingSeason().name() : null)
                .crops(p.getCrops())
                .landAreaAcres(p.getLandAreaAcres())
                .landOwnership(p.getLandOwnership() != null ? p.getLandOwnership().name() : null)
                .farmAddress(p.getFarmAddress())
                .aadhaarLast4(p.getAadhaarLast4())
                .identityDocType(p.getIdentityDocType())
                .identityDocStorageKey(p.getIdentityDocStorageKey())
                .identityDocFilename(p.getIdentityDocFilename())
                .profileStatus(p.getProfileStatus() != null ? p.getProfileStatus().name() : null)
                .createdAt(p.getCreatedAt())
                .build();
    }
}
