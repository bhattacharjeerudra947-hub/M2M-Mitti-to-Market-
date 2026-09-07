package com.mitti2market.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT utility — generates and validates signed JSON Web Tokens.
 * Tokens contain only userId and role (no sensitive personal data).
 */
@Component
public class JwtUtil {

    private final SecretKey key;
    private final long accessTokenTtl;
    private final long refreshTokenTtl;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-ttl}") long accessTokenTtl,
            @Value("${jwt.refresh-token-ttl}") long refreshTokenTtl) {
        // Ensure key is at least 256 bits (32 bytes) for HS256
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, Math.min(keyBytes.length, 32));
            keyBytes = padded;
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenTtl = accessTokenTtl;
        this.refreshTokenTtl = refreshTokenTtl;
    }

    /** Generate a signed access token containing userId and role */
    public String generateAccessToken(Long userId, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessTokenTtl))
                .signWith(key)
                .compact();
    }

    /** Generate a signed refresh token containing only userId */
    public String generateRefreshToken(Long userId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + refreshTokenTtl))
                .signWith(key)
                .compact();
    }

    /** Validate a token and return the userId, or null if invalid/expired */
    public Long validateAccessToken(String token) {
        try {
            Claims claims = parseToken(token);
            return Long.parseLong(claims.getSubject());
        } catch (JwtException | NumberFormatException e) {
            return null;
        }
    }

    /** Validate a refresh token and return the userId, or null if invalid/expired */
    public Long validateRefreshToken(String token) {
        try {
            Claims claims = parseToken(token);
            return Long.parseLong(claims.getSubject());
        } catch (JwtException | NumberFormatException e) {
            return null;
        }
    }

    /** Extract the role claim from an access token */
    public String extractRole(String token) {
        try {
            Claims claims = parseToken(token);
            return claims.get("role", String.class);
        } catch (JwtException e) {
            return null;
        }
    }

    private Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
