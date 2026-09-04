package com.mitti2market.repository;

import com.mitti2market.model.BuyerInterest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BuyerInterestRepository extends JpaRepository<BuyerInterest, Long> {

    /** All interests on a farmer's produce listings */
    List<BuyerInterest> findByFarmerIdOrderByCreatedAtDesc(Long farmerId);

    /** All interests by a specific buyer */
    List<BuyerInterest> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    /** Interests on a specific produce listing */
    List<BuyerInterest> findByProduceIdOrderByCreatedAtDesc(Long produceId);

    /** Check if buyer already expressed interest in this produce */
    Optional<BuyerInterest> findByBuyerIdAndProduceId(Long buyerId, Long produceId);

    /** Pending interests for a farmer */
    List<BuyerInterest> findByFarmerIdAndStatusOrderByCreatedAtDesc(Long farmerId, BuyerInterest.InterestStatus status);

    /** Count pending interests for a farmer */
    long countByFarmerIdAndStatus(Long farmerId, BuyerInterest.InterestStatus status);
}
