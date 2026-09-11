package com.mitti2market.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT authentication filter.
 * Runs once per request. Extracts and validates the Bearer token from the
 * Authorization header. If valid, sets the SecurityContext so that
 * @PreAuthorize and SecurityContextHolder work downstream.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final com.mitti2market.repository.UserRepository userRepository;

    public JwtAuthFilter(JwtUtil jwtUtil, com.mitti2market.repository.UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            Long userId = jwtUtil.validateAccessToken(token);

            if (userId != null) {
                var userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    var user = userOpt.get();
                    if (user.getStatus() == com.mitti2market.model.User.UserStatus.SUSPENDED
                            || user.getStatus() == com.mitti2market.model.User.UserStatus.DEACTIVATED) {
                        String uri = request.getRequestURI();
                        // Allow /api/auth/me and /api/profile so the client session gets the updated deactivation/suspension details
                        if (!uri.endsWith("/auth/me") && !uri.endsWith("/profile") && !uri.endsWith("/auth/logout")) {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json");
                            String reason = user.getStatusReason() != null && !user.getStatusReason().isBlank()
                                    ? ": " + user.getStatusReason()
                                    : "";
                            String statusLabel = user.getStatus() == com.mitti2market.model.User.UserStatus.DEACTIVATED ? "deactivated" : "suspended";
                            response.getWriter().write("{\"error\":\"Your account has been " + statusLabel + " by administration" + reason + "\"}");
                            return;
                        }
                    }

                    String role = user.getRole() != null ? user.getRole().name() : jwtUtil.extractRole(token);

                    // Create authentication token with ROLE_ prefix for Spring Security
                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + (role != null ? role : "USER")));
                    var auth = new UsernamePasswordAuthenticationToken(userId, null, authorities);

                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
