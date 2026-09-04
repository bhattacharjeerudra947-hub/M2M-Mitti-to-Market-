package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.BusinessProfileRequest;
import com.mitti2market.dto.BusinessProfileResponse;
import com.mitti2market.model.BusinessProfile;
import com.mitti2market.model.User;
import com.mitti2market.repository.BusinessProfileRepository;
import com.mitti2market.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/business")
public class BusinessController {

    private final BusinessProfileRepository businessProfiles;
    private final UserRepository users;
    private final TokenService tokens;

    public BusinessController(BusinessProfileRepository businessProfiles, UserRepository users, TokenService tokens) {
        this.businessProfiles = businessProfiles;
        this.users = users;
        this.tokens = tokens;
    }

    /**
     * POST /api/business/profile
     * Create or update the authenticated user's business profile.
     */
    @PostMapping("/profile")
    public ResponseEntity<?> upsertProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody BusinessProfileRequest req) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        User user = users.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("User not found"));
        }
        if (user.getRole() != User.Role.BUSINESS) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User is not a business buyer"));
        }

        BusinessProfile profile = businessProfiles.findByUserId(userId).orElse(
                BusinessProfile.builder().user(user).build()
        );

        // Update fields
        if (req.getBusinessType() != null) {
            try {
                profile.setBusinessType(User.BuyerType.valueOf(req.getBusinessType().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (req.getOfficialName() != null) profile.setOfficialName(req.getOfficialName());
        if (req.getGstin() != null) profile.setGstin(req.getGstin());
        if (req.getRegistrationNumber() != null) profile.setRegistrationNumber(req.getRegistrationNumber());
        if (req.getBusinessAddress() != null) profile.setBusinessAddress(req.getBusinessAddress());
        if (req.getDepartmentName() != null) profile.setDepartmentName(req.getDepartmentName());
        if (req.getAuthorizedPerson() != null) profile.setAuthorizedPerson(req.getAuthorizedPerson());
        if (req.getRequiredCrops() != null) profile.setRequiredCrops(req.getRequiredCrops());
        if (req.getMonthlyRequirementKg() != null) profile.setMonthlyRequirementKg(req.getMonthlyRequirementKg());

        // Update user-level fields
        if (req.getBusinessType() != null) {
            try {
                user.setBuyerType(User.BuyerType.valueOf(req.getBusinessType().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (req.getOfficialName() != null) user.setOrganizationName(req.getOfficialName());

        // Check if profile is complete
        if (profile.getBusinessType() != null && profile.getOfficialName() != null && !profile.getOfficialName().isBlank()) {
            profile.setProfileStatus(BusinessProfile.ProfileStatus.COMPLETE);
        }

        businessProfiles.save(profile);
        users.save(user);

        return ResponseEntity.ok(ApiResponse.ok("Business profile saved", toResponse(profile)));
    }

    /**
     * GET /api/business/profile
     * Get the authenticated user's business profile.
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        BusinessProfile profile = businessProfiles.findByUserId(userId).orElse(null);
        if (profile == null) {
            return ResponseEntity.ok(ApiResponse.ok("No profile yet", null));
        }

        return ResponseEntity.ok(ApiResponse.ok(toResponse(profile)));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }

    private BusinessProfileResponse toResponse(BusinessProfile p) {
        return BusinessProfileResponse.builder()
                .id(p.getId())
                .businessType(p.getBusinessType() != null ? p.getBusinessType().name() : null)
                .officialName(p.getOfficialName())
                .gstin(p.getGstin())
                .registrationNumber(p.getRegistrationNumber())
                .businessAddress(p.getBusinessAddress())
                .departmentName(p.getDepartmentName())
                .authorizedPerson(p.getAuthorizedPerson())
                .registrationDocStorageKey(p.getRegistrationDocStorageKey())
                .registrationDocFilename(p.getRegistrationDocFilename())
                .requiredCrops(p.getRequiredCrops())
                .monthlyRequirementKg(p.getMonthlyRequirementKg())
                .profileStatus(p.getProfileStatus() != null ? p.getProfileStatus().name() : null)
                .createdAt(p.getCreatedAt())
                .build();
    }
}
