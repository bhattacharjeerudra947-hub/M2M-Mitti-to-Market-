package com.mitti2market.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mitti2market.dto.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Spring Security configuration.
 * - Stateless (no sessions)
 * - Public endpoints: auth, health, produce browse, produce details
 * - Protected endpoints: everything else requires a valid JWT
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final ObjectMapper objectMapper;
    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, ObjectMapper objectMapper,
                          CorsConfigurationSource corsConfigurationSource) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.objectMapper = objectMapper;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // CORS preflight requests must never be blocked by auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // ─── Public endpoints (no auth required) ───
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/ai/**").permitAll()
                .requestMatchers("/api/market-prices/**").permitAll()
                // SSE stream self-validates the token via query param (EventSource can't send headers)
                .requestMatchers("/api/messages/events").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/produce").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/produce/paged").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/produce/{id}").permitAll()
                // Farmer-owned produce lists (active/history) are private — matched
                // BEFORE the /api/produce/** catch-all below
                .requestMatchers(HttpMethod.GET, "/api/produce/farmer/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/produce/**").permitAll()
                .requestMatchers("/api/users/farmers").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/price-advisor/all").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/price-advisor/estimate").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/stats").permitAll()
                // Open buyer requirements — public demand board (guest-browsable)
                .requestMatchers(HttpMethod.GET, "/api/requirements").permitAll()

                // ─── Admin endpoints (require ADMIN role) ───
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // ─── All other requests require a valid JWT ───
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    objectMapper.writeValue(response.getOutputStream(),
                            ApiResponse.error("Not authenticated"));
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    // Authenticated user with insufficient role -> 403 Forbidden
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    objectMapper.writeValue(response.getOutputStream(),
                            ApiResponse.error("Access denied: insufficient permissions"));
                })
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
