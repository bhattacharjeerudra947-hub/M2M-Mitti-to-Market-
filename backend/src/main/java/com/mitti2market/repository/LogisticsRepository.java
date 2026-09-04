package com.mitti2market.repository;

import com.mitti2market.model.Logistics;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LogisticsRepository extends JpaRepository<Logistics, Long> {

    Optional<Logistics> findByTrackingId(String trackingId);

    Optional<Logistics> findByDealId(Long dealId);
}
