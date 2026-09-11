package com.mitti2market.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class AuthResponse {
    @Builder.Default
    private Boolean success = true;
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
        private String verificationStatus;
        private String state;
        private String district;
        private Double rating;
        private String profilePhotoUrl;
        private String verificationNotes;
        private String status;
        private String statusReason;
        private java.time.LocalDateTime statusUpdatedAt;
        private java.time.LocalDateTime verifiedAt;
        private String verifiedBy;
    }
}
