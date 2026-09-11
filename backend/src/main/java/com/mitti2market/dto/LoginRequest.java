package com.mitti2market.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Email or mobile number is required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    private String role;
}

