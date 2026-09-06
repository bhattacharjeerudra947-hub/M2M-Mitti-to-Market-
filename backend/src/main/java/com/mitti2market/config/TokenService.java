package com.mitti2market.config;

import com.mitti2market.model.User;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Token service for authentication.
 * Delegates to JwtUtil for cryptographically signed JWT tokens.
 * Existing controllers call this service — API is preserved.
 */
@Service
@RequiredArgsConstructor
public class TokenService {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public String generateAccessToken(Long userId) {
        // Look up the user's role to include in the token
        String role = userRepository.findById(userId)
                .map(u -> u.getRole().name())
                .orElse("USER");
        return jwtUtil.generateAccessToken(userId, role);
    }

    public String generateRefreshToken(Long userId) {
        return jwtUtil.generateRefreshToken(userId);
    }

    public Long validateAccessToken(String token) {
        return jwtUtil.validateAccessToken(token);
    }

    public Long validateRefreshToken(String token) {
        return jwtUtil.validateRefreshToken(token);
    }

    public void revokeRefreshToken(String token) {
        // JWT tokens are stateless — revocation happens by expiry.
        // For immediate revocation, maintain a deny-list (future improvement).
    }
}
