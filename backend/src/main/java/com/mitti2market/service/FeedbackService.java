package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.Feedback;
import com.mitti2market.model.Feedback.FeedbackCategory;
import com.mitti2market.model.Feedback.FeedbackStatus;
import com.mitti2market.model.Notification;
import com.mitti2market.model.User;
import com.mitti2market.repository.FeedbackRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    /** User submits feedback or suggestion */
    @Transactional
    public Feedback submitFeedback(Long userId, Map<String, Object> body) {
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        String categoryStr = (String) body.get("category");
        if (categoryStr == null || categoryStr.isBlank()) {
            categoryStr = "GENERAL_FEEDBACK";
        }

        FeedbackCategory category;
        try {
            category = FeedbackCategory.valueOf(categoryStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            category = FeedbackCategory.GENERAL_FEEDBACK;
        }

        String message = (String) body.get("message");
        if (message == null || message.isBlank()) {
            throw new BadRequestException("Feedback message cannot be empty");
        }

        Integer rating = body.get("rating") != null ? Integer.valueOf(body.get("rating").toString()) : null;

        Feedback feedback = Feedback.builder()
                .user(user)
                .category(category)
                .message(message.trim())
                .rating(rating)
                .status(FeedbackStatus.NEW)
                .build();

        return feedbackRepository.save(feedback);
    }

    /** List feedback for Admin with filters */
    public List<Map<String, Object>> getAllFeedback(String category, String status) {
        List<Feedback> list = feedbackRepository.findAllByOrderByCreatedAtDesc();

        return list.stream().filter(f -> {
            if (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL")) {
                if (!f.getCategory().name().equalsIgnoreCase(category)) return false;
            }
            if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                if (!f.getStatus().name().equalsIgnoreCase(status)) return false;
            }
            return true;
        }).map(this::toResponse).toList();
    }

    /** Get user's own feedback */
    public List<Map<String, Object>> getUserFeedback(Long userId) {
        return feedbackRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse).toList();
    }

    /** Admin responds to and updates feedback */
    @Transactional
    public Feedback updateFeedbackStatus(Long adminId, Long feedbackId, String statusStr, String adminResponse, String adminNote) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback", "id", feedbackId));

        if (statusStr != null && !statusStr.isBlank()) {
            try {
                feedback.setStatus(FeedbackStatus.valueOf(statusStr.toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status: " + statusStr);
            }
        }

        if (adminResponse != null) {
            feedback.setAdminResponse(adminResponse);
        }
        if (adminNote != null) {
            feedback.setAdminNote(adminNote);
        }

        feedbackRepository.save(feedback);

        auditLogService.log(adminId, "FEEDBACK_RESPONDED", "FEEDBACK", feedbackId, adminNote, "Updated feedback #" + feedbackId);

        if (feedback.getUser() != null && adminResponse != null && !adminResponse.isBlank()) {
            notificationService.createNotification(feedback.getUser().getId(), Notification.NotificationType.SYSTEM_ALERT,
                    "Feedback Response", "Admin replied to your feedback: " + adminResponse);
        }

        return feedback;
    }

    public Map<String, Object> toResponse(Feedback f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("userId", f.getUser() != null ? f.getUser().getId() : null);
        m.put("userName", f.getUser() != null ? f.getUser().getName() : "Guest User");
        m.put("userEmail", f.getUser() != null ? f.getUser().getEmail() : null);
        m.put("category", f.getCategory().name());
        m.put("message", f.getMessage());
        m.put("rating", f.getRating());
        m.put("status", f.getStatus().name());
        m.put("adminResponse", f.getAdminResponse());
        m.put("adminNote", f.getAdminNote());
        m.put("createdAt", f.getCreatedAt());
        m.put("updatedAt", f.getUpdatedAt());
        return m;
    }
}
