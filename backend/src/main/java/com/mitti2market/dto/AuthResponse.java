package com.mitti2market.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String refreshToken;
    private String message;
    private UserDto user;
    @Builder.Default
    private Boolean isNewUser = false;

    @Data
    @Builder
    @AllArgsConstructor
    public static class UserDto {
        private Long id;
        private String name;
        private String email;
        private String phone;
        private String role;
        private String location;
        private Boolean verified;
        private Double rating;
    }
}
