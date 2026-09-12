package com.mitti2market.repository;

import com.mitti2market.model.ReverseLogistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReverseLogisticsRepository extends JpaRepository<ReverseLogistics, Long> {

    Optional<ReverseLogistics> findByReverseTrackingId(String reverseTrackingId);

    List<ReverseLogistics> findByDealIdOrderByCreatedAtDesc(Long dealId);

    List<ReverseLogistics> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    List<ReverseLogistics> findByFarmerIdOrderByCreatedAtDesc(Long farmerId);

    List<ReverseLogistics> findByAssignedHubIdOrderByCreatedAtDesc(Long hubId);

    List<ReverseLogistics> findByStatus(ReverseLogistics.ReverseStatus status);

    @Query("SELECT r FROM ReverseLogistics r WHERE r.buyer.id = :userId OR r.farmer.id = :userId ORDER BY r.createdAt DESC")
    List<ReverseLogistics> findByUserInvolved(@Param("userId") Long userId);
}
