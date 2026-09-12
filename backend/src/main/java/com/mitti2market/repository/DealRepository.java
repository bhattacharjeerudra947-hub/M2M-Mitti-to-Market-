package com.mitti2market.repository;

import com.mitti2market.model.Deal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DealRepository extends JpaRepository<Deal, Long> {

    Optional<Deal> findByDealId(String dealId);

    List<Deal> findByFarmerIdOrderByCreatedAtDesc(Long farmerId);

    List<Deal> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    List<Deal> findByConversationId(String conversationId);

    List<Deal> findByConversationIdOrderByCreatedAtDesc(String conversationId);

    Optional<Deal> findByConversationIdAndStatusNot(String conversationId, Deal.DealStatus status);

    @Query("SELECT d FROM Deal d WHERE d.farmer.id = :userId OR d.buyer.id = :userId ORDER BY d.createdAt DESC")
    List<Deal> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT d FROM Deal d WHERE (d.farmer.id = :userId OR d.buyer.id = :userId) AND d.status = :status ORDER BY d.createdAt DESC")
    List<Deal> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") Deal.DealStatus status);

    long countByStatus(Deal.DealStatus status);

    /** Max numeric sequence from deal IDs like M2M-2026-10003 (used to avoid duplicate IDs after restart) */
    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(deal_id, '-', -1) AS UNSIGNED)), 10000) FROM deals", nativeQuery = true)
    long findMaxDealSequence();
}
