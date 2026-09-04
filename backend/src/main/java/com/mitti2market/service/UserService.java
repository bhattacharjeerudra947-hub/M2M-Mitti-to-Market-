package com.mitti2market.service;

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

    public List<User> findByRole(Role role) {
        return (role != null) ? userRepository.findByRole(role) : userRepository.findAll();
    }

    public List<User> findFarmers(String location) {
        return (location != null && !location.isBlank())
                ? userRepository.findByRoleAndLocationContainingIgnoreCase(Role.FARMER, location)
                : userRepository.findByRole(Role.FARMER);
    }
}
