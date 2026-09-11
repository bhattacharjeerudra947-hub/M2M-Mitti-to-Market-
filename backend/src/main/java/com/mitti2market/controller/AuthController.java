package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.*;
import com.mitti2market.model.BusinessProfile;
import com.mitti2market.model.FarmerProfile;
import com.mitti2market.model.User;
import com.mitti2market.repository.BusinessProfileRepository;
import com.mitti2market.repository.FarmerProfileRepository;
import com.mitti2market.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final TokenService tokens;
    private final PasswordEncoder passwordEncoder;
    private final FarmerProfileRepository farmerProfiles;
    private final BusinessProfileRepository businessProfiles;

    public AuthController(UserRepository users, TokenService tokens, PasswordEncoder passwordEncoder,
                          FarmerProfileRepository farmerProfiles, BusinessProfileRepository businessProfiles) {
        this.users = users;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.farmerProfiles = farmerProfiles;
        this.businessProfiles = businessProfiles;
    }

    /** POST /api/auth/register */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        // Validate phone
        String phone = req.getPhone() != null ? req.getPhone().replaceAll("\\s+", "").trim() : "";
        if (phone.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mobile number is required"));
        }
        if (users.findByPhone(phone).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "An account with this mobile number already exists"));
        }

        // Validate optional email
        String email = (req.getEmail() != null && !req.getEmail().trim().isEmpty())
                ? req.getEmail().toLowerCase().trim()
                : null;
        if (email != null && users.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "An account with this email already exists"));
        }

        User.Role role;
        try {
            role = User.Role.valueOf(req.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid role. Must be FARMER or BUSINESS.",
                    "error", "Invalid role. Must be FARMER or BUSINESS."
            ));
        }

        if (role == User.Role.ADMIN) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Admin accounts cannot be registered publicly.",
                    "error", "Admin accounts cannot be registered publicly."
            ));
        }

        // Compute formatted location string if not explicitly set
        String location = req.getLocation();
        if (location == null || location.isBlank()) {
            StringBuilder sb = new StringBuilder();
            if (req.getVillage() != null && !req.getVillage().isBlank()) sb.append(req.getVillage().trim()).append(", ");
            if (req.getDistrict() != null && !req.getDistrict().isBlank()) sb.append(req.getDistrict().trim()).append(", ");
            if (req.getState() != null && !req.getState().isBlank()) sb.append(req.getState().trim());
            if (req.getPincode() != null && !req.getPincode().isBlank()) sb.append(" - ").append(req.getPincode().trim());
            location = sb.toString();
        }

        User user = User.builder()
                .name(req.getName().trim())
                .email(email)
                .phone(phone)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(role)
                .location(location)
                .state(req.getState())
                .district(req.getDistrict())
                .tehsil(req.getTehsil())
                .village(req.getVillage())
                .pincode(req.getPincode())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .organizationName(req.getOrganizationName())
                .verified(false)
                .verificationStatus(User.VerificationStatus.NOT_VERIFIED)
                .rating(0.0)
                .build();

        user = users.save(user);

        // Pre-create initial profile if farmer or business
        if (role == User.Role.FARMER) {
            farmerProfiles.save(FarmerProfile.builder()
                    .user(user)
                    .farmAddress(location)
                    .state(req.getState())
                    .district(req.getDistrict())
                    .tehsil(req.getTehsil())
                    .village(req.getVillage())
                    .pincode(req.getPincode())
                    .build());
        } else if (role == User.Role.BUSINESS) {
            businessProfiles.save(BusinessProfile.builder()
                    .user(user)
                    .officialName(req.getOrganizationName() != null ? req.getOrganizationName() : req.getName())
                    .authorizedPerson(req.getContactPersonName() != null ? req.getContactPersonName() : req.getName())
                    .businessAddress(location)
                    .state(req.getState())
                    .district(req.getDistrict())
                    .tehsil(req.getTehsil())
                    .village(req.getVillage())
                    .pincode(req.getPincode())
                    .build());
        }

        String accessToken = tokens.generateAccessToken(user.getId());
        String refreshToken = tokens.generateRefreshToken(user.getId());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .message("Account created successfully")
                .user(toDto(user))
                .build());
    }

    /** POST /api/auth/login — email or mobile number + BCrypt password */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        String identifier = req.getEmail() != null ? req.getEmail().trim() : "";
        Optional<User> userOpt;
        if (identifier.contains("@")) {
            userOpt = users.findByEmail(identifier.toLowerCase());
        } else {
            String digits = identifier.replaceAll("[^0-9+]", "");
            userOpt = users.findByPhone(digits);
            if (userOpt.isEmpty() && digits.length() >= 10) {
                String last10 = digits.substring(digits.length() - 10);
                userOpt = users.findAll().stream()
                        .filter(u -> u.getPhone() != null && u.getPhone().replaceAll("\\D", "").endsWith(last10))
                        .findFirst();
            }
        }

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email/mobile number or password"));
        }

        User user = userOpt.get();

        String stored = user.getPasswordHash();
        if (stored == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        boolean matches;
        if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
            matches = passwordEncoder.matches(req.getPassword(), stored);
        } else {
            matches = stored.equals(req.getPassword());
            if (matches) {
                user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
                users.save(user);
            }
        }

        if (!matches) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        if (user.getStatus() == User.UserStatus.SUSPENDED) {
            String msg = "Your account has been suspended by administration";
            if (user.getStatusReason() != null && !user.getStatusReason().isBlank()) {
                msg += ": " + user.getStatusReason();
            }
            return ResponseEntity.status(403).body(Map.of("error", msg));
        }

        if (user.getStatus() == User.UserStatus.DEACTIVATED) {
            String msg = "Your account has been deactivated by administration";
            if (user.getStatusReason() != null && !user.getStatusReason().isBlank()) {
                msg += ": " + user.getStatusReason();
            } else {
                msg += ". Please contact support.";
            }
            return ResponseEntity.status(403).body(Map.of("error", msg));
        }

        if (req.getRole() != null && !req.getRole().trim().isEmpty()) {
            try {
                User.Role expectedRole = User.Role.valueOf(req.getRole().trim().toUpperCase());
                if (user.getRole() != expectedRole) {
                    String roleName = roleLabel(user.getRole());
                    String msg = "failed to login";
                    return ResponseEntity.status(403).body(Map.of(
                            "success", false,
                            "message", msg,
                            "error", msg
                    ));
                }
            } catch (IllegalArgumentException ignored) {}
        }

        String accessToken = tokens.generateAccessToken(user.getId());
        String refreshToken = tokens.generateRefreshToken(user.getId());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .message("Login successful")
                .user(toDto(user))
                .build());
    }

    /**
     * POST /api/auth/farmer/login — only FARMER accounts may authenticate here.
     * Rejects BUSINESS and ADMIN accounts with 401 + a clear message.
     */
    @PostMapping("/farmer/login")
    public ResponseEntity<?> farmerLogin(@Valid @RequestBody LoginRequest req) {
        return roleLockedLogin(req, User.Role.FARMER, "Farmer");
    }

    /**
     * POST /api/auth/business/login — only BUSINESS accounts may authenticate here.
     * Rejects FARMER and ADMIN accounts with 401 + a clear message.
     */
    @PostMapping("/business/login")
    public ResponseEntity<?> businessLogin(@Valid @RequestBody LoginRequest req) {
        return roleLockedLogin(req, User.Role.BUSINESS, "Business/Buyer");
    }

    /**
     * POST /api/auth/admin/login — only ADMIN accounts may authenticate here.
     * Rejects FARMER and BUSINESS accounts with 401 + a clear message.
     * This is a privileged endpoint; it is permitted by the public /api/auth/** matcher
     * but the method itself enforces admin-only access at the auth layer.
     */
    @PostMapping("/admin/login")
    public ResponseEntity<?> adminLogin(@Valid @RequestBody LoginRequest req) {
        return roleLockedLogin(req, User.Role.ADMIN, "Admin");
    }

    /**
     * Shared role-locked login implementation.
     * Authenticates credentials first, then rejects if the account's role does not
     * match the expected role for this endpoint.
     */
    private ResponseEntity<?> roleLockedLogin(LoginRequest req, User.Role expectedRole, String portalName) {
        String identifier = req.getEmail() != null ? req.getEmail().trim() : "";
        Optional<User> userOpt;
        if (identifier.contains("@")) {
            userOpt = users.findByEmail(identifier.toLowerCase());
        } else {
            String digits = identifier.replaceAll("[^0-9+]", "");
            userOpt = users.findByPhone(digits);
            if (userOpt.isEmpty() && digits.length() >= 10) {
                String last10 = digits.substring(digits.length() - 10);
                userOpt = users.findAll().stream()
                        .filter(u -> u.getPhone() != null && u.getPhone().replaceAll("\\D", "").endsWith(last10))
                        .findFirst();
            }
        }

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email/mobile number or password"));
        }

        User user = userOpt.get();

        String stored = user.getPasswordHash();
        if (stored == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        boolean matches;
        if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
            matches = passwordEncoder.matches(req.getPassword(), stored);
        } else {
            matches = stored.equals(req.getPassword());
            if (matches) {
                user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
                users.save(user);
            }
        }

        if (!matches) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        if (user.getStatus() == User.UserStatus.SUSPENDED) {
            String msg = "Your account has been suspended by administration";
            if (user.getStatusReason() != null && !user.getStatusReason().isBlank()) {
                msg += ": " + user.getStatusReason();
            }
            return ResponseEntity.status(403).body(Map.of("error", msg));
        }

        if (user.getStatus() == User.UserStatus.DEACTIVATED) {
            String msg = "Your account has been deactivated by administration";
            if (user.getStatusReason() != null && !user.getStatusReason().isBlank()) {
                msg += ": " + user.getStatusReason();
            } else {
                msg += ". Please contact support.";
            }
            return ResponseEntity.status(403).body(Map.of("error", msg));
        }

        // Enforce role isolation at the backend — the account's role must match the
        // portal the caller used. This prevents a farmer from logging in through the
        // Business or Admin portal, a business user from logging in through the Farmer
        // or Admin portal, and a normal user from logging in through the Admin portal.
        // When the role does not match, tell the user which role the account is registered
        // as and which portal to use (per spec section 7), so they are directed to the
        // correct login portal rather than being left guessing.
        if (user.getRole() != expectedRole) {
            String roleName = roleLabel(user.getRole());
            String msg = "failed to login";
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", msg,
                    "error", msg
            ));
        }

        String accessToken = tokens.generateAccessToken(user.getId());
        String refreshToken = tokens.generateRefreshToken(user.getId());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .message("Login successful")
                .user(toDto(user))
                .build());
    }

    private String roleLabel(User.Role role) {
        return switch (role) {
            case FARMER -> "Farmer";
            case BUSINESS -> "Business/Buyer";
            case ADMIN -> "Admin";
        };
    }

    /** POST /api/auth/refresh */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        Long userId = tokens.validateRefreshToken(refreshToken);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired refresh token"));
        }

        var userOpt = users.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        User user = userOpt.get();
        String newAccessToken = tokens.generateAccessToken(user.getId());
        String newRefreshToken = tokens.generateRefreshToken(user.getId());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(newAccessToken)
                .refreshToken(newRefreshToken)
                .message("Token refreshed")
                .user(toDto(user))
                .build());
    }

    /** GET /api/auth/me */
    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        var userOpt = users.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        return ResponseEntity.ok(toDto(userOpt.get()));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        return tokens.validateAccessToken(token);
    }

    private AuthResponse.UserDto toDto(User user) {
        return AuthResponse.UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .location(user.getLocation())
                .state(user.getState())
                .district(user.getDistrict())
                .verified(user.getVerified())
                .verificationStatus(user.getStandardVerificationStatus())
                .verificationNotes(user.getVerificationNotes())
                .status(user.getStatus() != null ? user.getStatus().name() : "ACTIVE")
                .statusReason(user.getStatusReason())
                .statusUpdatedAt(user.getStatusUpdatedAt())
                .verifiedAt(user.getVerifiedAt())
                .verifiedBy(user.getVerifiedBy())
                .rating(user.getRating())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .build();
    }
}

