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

    Optional<Deal> findByConversationIdAndStatusNot(String conversationId, Deal.DealStatus status);

    @Query("SELECT d FROM Deal d WHERE d.farmer.id = :userId OR d.buyer.id = :userId ORDER BY d.createdAt DESC")
    List<Deal> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT d FROM Deal d WHERE (d.farmer.id = :userId OR d.buyer.id = :userId) AND d.status = :status ORDER BY d.createdAt DESC")
    List<Deal> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") Deal.DealStatus status);
}
