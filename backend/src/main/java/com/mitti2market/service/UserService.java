package com.mitti2market.service;

import com.mitti2market.dto.user.LoginRequest;
import com.mitti2market.dto.user.RegisterRequest;
import com.mitti2market.dto.user.UserResponse;
import com.mitti2market.exception.DuplicateEmailException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.User;
import com.mitti2market.model.User.Role;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new DuplicateEmailException(request.getEmail());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                // NOTE: Storing plaintext password for hackathon simplicity.
                // Pre-production: hash with BCryptPasswordEncoder.
                .password(request.getPassword())
                .phone(request.getPhone())
                .role(request.getRole())
                .location(request.getLocation())
                .organizationName(request.getOrganizationName())
                .build();

        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    public UserResponse login(LoginRequest request) {
        // NOTE: Plaintext password verification for hackathon.
        // Pre-production: use BCryptPasswordEncoder.matches().
        User user = null;

        // Try email first, then phone
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            user = userRepository.findByEmail(request.getEmail()).orElse(null);
        }
        if (user == null && request.getPhone() != null && !request.getPhone().isBlank()) {
            user = userRepository.findByPhone(request.getPhone()).orElse(null);
        }

        if (user == null) {
            String identifier = (request.getEmail() != null && !request.getEmail().isBlank())
                    ? request.getEmail() : request.getPhone();
            throw new ResourceNotFoundException("User", "email or phone", identifier);
        }

        if (!user.getPassword().equals(request.getPassword())) {
            throw new ResourceNotFoundException("User", "credentials", "invalid");
        }

        return toResponse(user);
    }

    public UserResponse getUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return toResponse(user);
    }

    public List<UserResponse> listUsers(Role role) {
        List<User> users = (role != null)
                ? userRepository.findByRole(role)
                : userRepository.findAll();
        return users.stream().map(this::toResponse).toList();
    }

    public List<UserResponse> findFarmers(String location) {
        List<User> farmers = (location != null && !location.isBlank())
                ? userRepository.findByRoleAndLocationContainingIgnoreCase(Role.FARMER, location)
                : userRepository.findByRole(Role.FARMER);
        return farmers.stream().map(this::toResponse).toList();
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .location(user.getLocation())
                .organizationName(user.getOrganizationName())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
