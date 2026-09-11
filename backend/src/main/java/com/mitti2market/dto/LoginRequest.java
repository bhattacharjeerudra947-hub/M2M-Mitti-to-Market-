package com.mitti2market.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String phone;
    private String mobile;

    @NotBlank(message = "Password is required")
    private String password;

    private String role;

    public String getIdentifier() {
        if (email != null && !email.trim().isEmpty()) return email.trim();
        if (phone != null && !phone.trim().isEmpty()) return phone.trim();
        if (mobile != null && !mobile.trim().isEmpty()) return mobile.trim();
        return "";
    }
}
