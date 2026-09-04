package com.mitti2market.repository;

import com.mitti2market.model.DeliveryConfirmation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeliveryConfirmationRepository extends JpaRepository<DeliveryConfirmation, Long> {

    Optional<DeliveryConfirmation> findByDealId(Long dealId);

    Optional<DeliveryConfirmation> findByDealIdAndConfirmedTrue(Long dealId);
}
