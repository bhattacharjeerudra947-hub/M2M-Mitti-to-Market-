package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.Deal;
import com.mitti2market.model.Deal.DealStatus;
import com.mitti2market.model.DealRating;
import com.mitti2market.model.Notification;
import com.mitti2market.model.User;
import com.mitti2market.repository.DealRatingRepository;
import com.mitti2market.repository.DealRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class RatingService {

    private final DealRatingRepository ratingRepository;
    private final DealRepository dealRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /** Submit a rating for a completed deal */
    @Transactional
    public DealRating submitRating(Long reviewerId, Long dealId, Integer rating, String comment) {
        Deal deal = dealRepository.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));

        if (deal.getStatus() != DealStatus.COMPLETED) {
            throw new BadRequestException("Ratings can only be submitted for COMPLETED deals");
        }

        Long farmerId = deal.getFarmer().getId();
        Long buyerId = deal.getBuyer().getId();

        if (!reviewerId.equals(farmerId) && !reviewerId.equals(buyerId)) {
            throw new BadRequestException("You are not a participant in this deal");
        }

        Long revieweeId = reviewerId.equals(farmerId) ? buyerId : farmerId;

        if (reviewerId.equals(revieweeId)) {
            throw new BadRequestException("You cannot rate yourself");
        }

        if (ratingRepository.existsByDealIdAndReviewerId(dealId, reviewerId)) {
            throw new BadRequestException("You have already submitted a rating for this deal");
        }

        if (rating == null || rating < 1 || rating > 5) {
            throw new BadRequestException("Rating must be between 1 and 5 stars");
        }

        User reviewer = userRepository.findById(reviewerId).orElseThrow();
        User reviewee = userRepository.findById(revieweeId).orElseThrow();

        DealRating dealRating = DealRating.builder()
                .deal(deal)
                .reviewer(reviewer)
                .reviewee(reviewee)
                .rating(rating)
                .comment(comment != null ? comment.trim() : "")
                .build();

        dealRating = ratingRepository.save(dealRating);

        // Recalculate average rating for reviewee user
        Double avg = ratingRepository.getAverageRatingForUser(revieweeId);
        if (avg != null) {
            double roundedAvg = Math.round(avg * 10.0) / 10.0;
            reviewee.setRating(roundedAvg);
            userRepository.save(reviewee);
        }

        notificationService.createNotification(revieweeId, Notification.NotificationType.RATING_RECEIVED,
                "New Rating Received", reviewer.getName() + " rated your transaction " + rating + " stars.", dealId, "DEAL");

        return dealRating;
    }

    /** Get ratings for a deal */
    public List<Map<String, Object>> getDealRatings(Long dealId) {
        return ratingRepository.findByDealId(dealId).stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("dealId", r.getDeal().getId());
            m.put("reviewerId", r.getReviewer().getId());
            m.put("reviewerName", r.getReviewer().getName());
            m.put("revieweeId", r.getReviewee().getId());
            m.put("revieweeName", r.getReviewee().getName());
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put("createdAt", r.getCreatedAt());
            return m;
        }).toList();
    }

    /** Get public reviews for a user */
    public List<Map<String, Object>> getReviewsForUser(Long userId) {
        return ratingRepository.findByRevieweeIdOrderByCreatedAtDesc(userId).stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("dealId", r.getDeal().getId());
            m.put("reviewerName", r.getReviewer().getName());
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put("createdAt", r.getCreatedAt());
            return m;
        }).toList();
    }

    /** Get count and average for a user */
    public Map<String, Object> getUserRatingSummary(Long userId) {
        long count = ratingRepository.countByRevieweeId(userId);
        Double avg = ratingRepository.getAverageRatingForUser(userId);
        double roundedAvg = avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("rating", roundedAvg);
        m.put("reviewCount", count);
        return m;
    }
}
