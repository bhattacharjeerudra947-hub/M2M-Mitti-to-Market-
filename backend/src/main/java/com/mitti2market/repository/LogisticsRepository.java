package com.mitti2market.repository;

import com.mitti2market.model.Logistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LogisticsRepository extends JpaRepository<Logistics, Long> {

    Optional<Logistics> findByTrackingId(String trackingId);

    Optional<Logistics> findByDealId(Long dealId);

    /** Efficient query for getMyLogistics — avoids loading all records. */
    @Query("SELECT l FROM Logistics l " +
           "WHERE l.deal.farmer.id = :userId OR l.deal.buyer.id = :userId " +
           "ORDER BY l.createdAt DESC")
    List<Logistics> findByUserId(@Param("userId") Long userId);

    /** All logistics records ordered by date — for admin panel. */
    List<Logistics> findAllByOrderByCreatedAtDesc();
}
