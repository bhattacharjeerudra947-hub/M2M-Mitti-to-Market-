package com.mitti2market.dto.user;

import com.mitti2market.model.User.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Long id;
    private String name;
    private String email;
    private String phone;
    private Role role;
    private String location;
    private String organizationName;
    private LocalDateTime createdAt;
}
