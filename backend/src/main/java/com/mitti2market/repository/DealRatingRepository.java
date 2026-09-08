package com.mitti2market.repository;

import com.mitti2market.model.DealRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DealRatingRepository extends JpaRepository<DealRating, Long> {

    List<DealRating> findByDealId(Long dealId);

    Optional<DealRating> findByDealIdAndReviewerId(Long dealId, Long reviewerId);

    boolean existsByDealIdAndReviewerId(Long dealId, Long reviewerId);

    List<DealRating> findByRevieweeId(Long revieweeId);

    @Query("SELECT AVG(dr.rating) FROM DealRating dr WHERE dr.reviewee.id = :userId")
    Double getAverageRatingForUser(@Param("userId") Long userId);
}
