package com.mitti2market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be 2-100 characters")
    private String name;

    /** Email is optional */
    private String email;

    @NotBlank(message = "Mobile number is required")
    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 128, message = "Password must be at least 6 characters")
    private String password;

    @NotBlank(message = "Role is required")
    private String role;

    private String location;
    private String state;
    private String district;
    private String tehsil;
    private String village;
    private String pincode;

    /** For business registrations */
    private String organizationName;
    private String contactPersonName;

    /** GPS Coordinates */
    private Double latitude;
    private Double longitude;
}

