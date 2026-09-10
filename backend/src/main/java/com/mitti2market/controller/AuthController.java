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
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role. Must be FARMER, BUSINESS or ADMIN"));
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
            return ResponseEntity.status(403).body(Map.of("error", "Your account has been deactivated. Please contact support."));
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
                .role(user.getRole().name())
                .location(user.getLocation())
                .state(user.getState())
                .district(user.getDistrict())
                .verified(user.getVerified())
                .verificationStatus(user.getVerificationStatus() != null ? user.getVerificationStatus().name() : "NOT_VERIFIED")
                .rating(user.getRating())
                .build();
    }
}

