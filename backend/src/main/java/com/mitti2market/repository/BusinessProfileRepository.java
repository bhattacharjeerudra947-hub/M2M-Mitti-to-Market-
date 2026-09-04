package com.mitti2market.repository;

import com.mitti2market.model.BusinessProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BusinessProfileRepository extends JpaRepository<BusinessProfile, Long> {
    Optional<BusinessProfile> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
}
