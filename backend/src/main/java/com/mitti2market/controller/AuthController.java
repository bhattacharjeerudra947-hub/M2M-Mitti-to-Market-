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
                .passwordHash(TokenService.hashPassword(req.getPassword()))
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

    /** POST /api/auth/login */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        var userOpt = users.findByEmail(req.getEmail().toLowerCase().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }

        User user = userOpt.get();
        if (!user.getPasswordHash().equals(TokenService.hashPassword(req.getPassword()))) {
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

    /** POST /api/auth/forgot-password */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody PasswordResetRequest req) {
        var userOpt = users.findByEmail(req.getEmail().toLowerCase().trim());
        if (userOpt.isPresent()) {
            String resetToken = tokens.generatePasswordResetToken(userOpt.get().getId());
            // In production: send email with resetToken link
            // For now: log it and return success regardless (security: don't reveal if email exists)
            System.out.println("Password reset token for " + req.getEmail() + ": " + resetToken);
        }
        // Always return success to prevent email enumeration
        return ResponseEntity.ok(Map.of("message", "If an account with that email exists, a password reset link has been sent"));
    }

    /** POST /api/auth/reset-password */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody PasswordResetConfirmRequest req) {
        Long userId = tokens.validatePasswordResetToken(req.getToken());
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired reset token"));
        }

        var userOpt = users.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }

        User user = userOpt.get();
        user.setPasswordHash(TokenService.hashPassword(req.getNewPassword()));
        users.save(user);

        return ResponseEntity.ok(Map.of("message", "Password reset successful. You can now sign in."));
    }

    /** GET /api/auth/me — get current user from access token */
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

    /** Helper: extract userId from "Bearer <token>" header */
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
