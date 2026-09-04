package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.*;
import com.mitti2market.model.User;
import com.mitti2market.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final TokenService tokens;

    public AuthController(UserRepository users, TokenService tokens) {
        this.users = users;
        this.tokens = tokens;
    }

    /** POST /api/auth/register */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        if (users.findByEmail(req.getEmail().toLowerCase().trim()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "An account with this email already exists"));
        }

        User.Role role;
        try {
            role = User.Role.valueOf(req.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role. Must be FARMER or BUSINESS"));
        }

        User user = User.builder()
                .name(req.getName().trim())
                .email(req.getEmail().toLowerCase().trim())
                .phone(req.getPhone())
                .passwordHash(req.getPassword())  // stored as plaintext
                .role(role)
                .location(req.getLocation())
                .verified(false)
                .rating(0.0)
                .build();

        user = users.save(user);

        String accessToken = tokens.generateAccessToken(user.getId());
        String refreshToken = tokens.generateRefreshToken(user.getId());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .message("Account created successfully")
                .user(toDto(user))
                .build());
    }

    /** POST /api/auth/login — email + plaintext password */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        var userOpt = users.findByEmail(req.getEmail().toLowerCase().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }

        User user = userOpt.get();

        // Compare plaintext password directly
        if (user.getPasswordHash() == null || !user.getPasswordHash().equals(req.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
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
                .verified(user.getVerified())
                .rating(user.getRating())
                .build();
    }
}
