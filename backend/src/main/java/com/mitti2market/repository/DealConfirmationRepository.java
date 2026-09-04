package com.mitti2market.repository;

import com.mitti2market.model.DealConfirmation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DealConfirmationRepository extends JpaRepository<DealConfirmation, Long> {

    List<DealConfirmation> findByDealId(Long dealId);

    Optional<DealConfirmation> findByDealIdAndUserId(Long dealId, Long userId);

    long countByDealIdAndConfirmedTrue(Long dealId);
}
