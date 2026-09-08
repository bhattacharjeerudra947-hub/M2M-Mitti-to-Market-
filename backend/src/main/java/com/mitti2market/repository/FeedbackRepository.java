package com.mitti2market.repository;

import com.mitti2market.model.Feedback;
import com.mitti2market.model.Feedback.FeedbackCategory;
import com.mitti2market.model.Feedback.FeedbackStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    List<Feedback> findAllByOrderByCreatedAtDesc();

    List<Feedback> findByStatusOrderByCreatedAtDesc(FeedbackStatus status);

    List<Feedback> findByCategoryOrderByCreatedAtDesc(FeedbackCategory category);

    List<Feedback> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByStatus(FeedbackStatus status);
}
