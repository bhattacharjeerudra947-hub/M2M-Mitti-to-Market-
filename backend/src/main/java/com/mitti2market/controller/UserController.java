package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.User;
import com.mitti2market.model.User.Role;
import com.mitti2market.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        return users.findById(id)
                .map(user -> ResponseEntity.ok(ApiResponse.ok(toDto(user))))
                .orElse(ResponseEntity.status(404).body(ApiResponse.error("User not found")));
    }

    @GetMapping
    public ResponseEntity<?> listUsers(@RequestParam(required = false) Role role) {
        List<User> list = (role != null) ? users.findByRole(role) : users.findAll();
        return ResponseEntity.ok(ApiResponse.ok(list.stream().map(this::toDto).toList()));
    }

    @GetMapping("/farmers")
    public ResponseEntity<?> findFarmers(@RequestParam(required = false) String location) {
        List<User> farmers = (location != null && !location.isBlank())
                ? users.findByRoleAndLocationContainingIgnoreCase(Role.FARMER, location)
                : users.findByRole(Role.FARMER);
        return ResponseEntity.ok(ApiResponse.ok(farmers.stream().map(this::toDto).toList()));
    }

    private Map<String, Object> toDto(User user) {
        return Map.of(
                "id", user.getId(),
                "name", user.getName() != null ? user.getName() : "",
                "email", user.getEmail() != null ? user.getEmail() : "",
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "role", user.getRole().name(),
                "location", user.getLocation() != null ? user.getLocation() : "",
                "organizationName", user.getOrganizationName() != null ? user.getOrganizationName() : ""
        );
    }
}
