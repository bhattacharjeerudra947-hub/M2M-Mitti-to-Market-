package com.mitti2market.repository;

import com.mitti2market.model.User;
import com.mitti2market.model.User.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    Optional<User> findByFirebaseUid(String firebaseUid);

    List<User> findByRole(Role role);

    List<User> findByRoleAndLocationContainingIgnoreCase(Role role, String location);

    long countByVerifiedTrue();

    long countByVerificationStatus(User.VerificationStatus status);

    long countByStatus(User.UserStatus status);

    long countByRole(Role role);

    List<User> findByVerificationStatus(User.VerificationStatus status);

    List<User> findByStatus(User.UserStatus status);
}
