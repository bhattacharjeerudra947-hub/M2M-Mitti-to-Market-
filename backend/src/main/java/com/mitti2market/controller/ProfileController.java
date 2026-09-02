package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.AuthResponse;
import com.mitti2market.dto.ProfileUpdateRequest;
import com.mitti2market.model.User;
import com.mitti2market.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository users;
    private final TokenService tokens;

    public ProfileController(UserRepository users, TokenService tokens) {
        this.users = users;
        this.tokens = tokens;
    }

    /** GET /api/profile — get current user's profile */
    @GetMapping
    public ResponseEntity<?> getProfile(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));

        var userOpt = users.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "User not found"));

        return ResponseEntity.ok(toDto(userOpt.get()));
    }

    /** PUT /api/profile — update current user's profile */
    @PutMapping
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody ProfileUpdateRequest req) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));

        var userOpt = users.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "User not found"));

        User user = userOpt.get();
        if (req.getName() != null && !req.getName().trim().isEmpty()) user.setName(req.getName().trim());
        if (req.getPhone() != null) user.setPhone(req.getPhone().trim());
        if (req.getLocation() != null) user.setLocation(req.getLocation().trim());

        user = users.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Profile updated successfully",
                "user", toDto(user)
        ));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }

    private AuthResponse.UserDto toDto(User user) {
        return AuthResponse.UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .location(user.getLocation())
                .verified(user.getVerified())
                .rating(user.getRating())
                .build();
    }
}
