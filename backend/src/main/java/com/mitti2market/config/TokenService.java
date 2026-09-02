package com.mitti2market.config;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple token service for authentication.
 * Uses UUID tokens stored in memory (ConcurrentHashMap).
 * For production, replace with JWT + Redis or a proper session store.
 */
@Service
public class TokenService {

    private final Map<String, TokenData> accessTokens = new ConcurrentHashMap<>();
    private final Map<String, TokenData> refreshTokens = new ConcurrentHashMap<>();
    private final Map<String, TokenData> passwordResetTokens = new ConcurrentHashMap<>();

    private static final long ACCESS_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours
    private static final long REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
    private static final long RESET_TOKEN_TTL = 60 * 60 * 1000; // 1 hour

    private record TokenData(Long userId, long createdAt) {}

    /** Generate an access token for a user */
    public String generateAccessToken(Long userId) {
        String token = UUID.randomUUID().toString();
        accessTokens.put(token, new TokenData(userId, System.currentTimeMillis()));
        return token;
    }

    /** Generate a refresh token for a user */
    public String generateRefreshToken(Long userId) {
        String token = UUID.randomUUID().toString();
        refreshTokens.put(token, new TokenData(userId, System.currentTimeMillis()));
        return token;
    }

    /** Generate a password-reset token */
    public String generatePasswordResetToken(Long userId) {
        // Invalidate any existing reset tokens for this user
        passwordResetTokens.entrySet().removeIf(e -> e.getValue().userId().equals(userId));
        String token = UUID.randomUUID().toString();
        passwordResetTokens.put(token, new TokenData(userId, System.currentTimeMillis()));
        return token;
    }

    /** Validate an access token and return userId, or null if invalid/expired */
    public Long validateAccessToken(String token) {
        return validateToken(token, accessTokens, ACCESS_TOKEN_TTL);
    }

    /** Validate a refresh token and return userId, or null if invalid/expired */
    public Long validateRefreshToken(String token) {
        return validateToken(token, refreshTokens, REFRESH_TOKEN_TTL);
    }

    /** Validate a password-reset token and return userId, then consume it */
    public Long validatePasswordResetToken(String token) {
        TokenData data = passwordResetTokens.remove(token);
        if (data == null) return null;
        if (System.currentTimeMillis() - data.createdAt() > RESET_TOKEN_TTL) return null;
        return data.userId();
    }

    /** Revoke a refresh token (used on logout) */
    public void revokeRefreshToken(String token) {
        refreshTokens.remove(token);
    }

    /** Hash a password using SHA-256 */
    public static String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private Long validateToken(String token, Map<String, TokenData> store, long ttl) {
        if (token == null) return null;
        TokenData data = store.get(token);
        if (data == null) return null;
        if (System.currentTimeMillis() - data.createdAt() > ttl) {
            store.remove(token);
            return null;
        }
        return data.userId();
    }
}
