package com.mitti2market.repository;

import com.mitti2market.model.BuyerMatch;
import com.mitti2market.model.BuyerMatch.MatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BuyerMatchRepository extends JpaRepository<BuyerMatch, Long> {

    Optional<BuyerMatch> findByProduceIdAndBuyerRequirementId(Long produceId, Long buyerRequirementId);

    List<BuyerMatch> findByFarmerIdOrderByCreatedAtDesc(Long farmerId);

    List<BuyerMatch> findByFarmerIdAndStatusInOrderByCreatedAtDesc(Long farmerId, Collection<MatchStatus> statuses);

    List<BuyerMatch> findByFarmerIdOrderByMatchScoreDesc(Long farmerId);

    List<BuyerMatch> findByBuyerRequirementId(Long buyerRequirementId);

    List<BuyerMatch> findByBuyerRequirementIdAndStatusNot(Long buyerRequirementId, MatchStatus status);

    List<BuyerMatch> findByProduceId(Long produceId);

    List<BuyerMatch> findByProduceIdAndStatusNot(Long produceId, MatchStatus status);

    long countByFarmerIdAndStatus(Long farmerId, MatchStatus status);
}
