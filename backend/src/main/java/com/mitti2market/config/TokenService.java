package com.mitti2market.config;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple token service for authentication.
 * Uses UUID tokens stored in memory.
 */
@Service
public class TokenService {

    private final Map<String, TokenData> accessTokens = new ConcurrentHashMap<>();
    private final Map<String, TokenData> refreshTokens = new ConcurrentHashMap<>();

    private static final long ACCESS_TOKEN_TTL = 24 * 60 * 60 * 1000;
    private static final long REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

    private record TokenData(Long userId, long createdAt) {}

    public String generateAccessToken(Long userId) {
        String token = UUID.randomUUID().toString();
        accessTokens.put(token, new TokenData(userId, System.currentTimeMillis()));
        return token;
    }

    public String generateRefreshToken(Long userId) {
        String token = UUID.randomUUID().toString();
        refreshTokens.put(token, new TokenData(userId, System.currentTimeMillis()));
        return token;
    }

    public Long validateAccessToken(String token) {
        return validateToken(token, accessTokens, ACCESS_TOKEN_TTL);
    }

    public Long validateRefreshToken(String token) {
        return validateToken(token, refreshTokens, REFRESH_TOKEN_TTL);
    }

    public void revokeRefreshToken(String token) {
        refreshTokens.remove(token);
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
