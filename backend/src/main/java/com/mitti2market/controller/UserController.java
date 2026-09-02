package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.user.LoginRequest;
import com.mitti2market.dto.user.RegisterRequest;
import com.mitti2market.dto.user.UserResponse;
import com.mitti2market.model.User.Role;
import com.mitti2market.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        UserResponse user = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("User registered successfully", user));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        UserResponse user = userService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(@PathVariable Long id) {
        UserResponse user = userService.getUser(id);
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> listUsers(
            @RequestParam(required = false) Role role) {
        List<UserResponse> users = userService.listUsers(role);
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @GetMapping("/farmers")
    public ResponseEntity<ApiResponse<List<UserResponse>>> findFarmers(
            @RequestParam(required = false) String location) {
        List<UserResponse> farmers = userService.findFarmers(location);
        return ResponseEntity.ok(ApiResponse.ok(farmers));
    }
}
