package com.mitti2market.service;

import com.mitti2market.dto.appeal.AppealDecisionRequest;
import com.mitti2market.dto.appeal.AppealRequest;
import com.mitti2market.dto.appeal.AppealResponse;
import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.Appeal;
import com.mitti2market.model.Appeal.AppealStatus;
import com.mitti2market.model.Notification;
import com.mitti2market.model.User;
import com.mitti2market.repository.AppealRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppealService {

    private final AppealRepository appealRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public AppealResponse submitAppeal(Long userId, AppealRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Prevent duplicate concurrent appeals
        boolean hasActiveAppeal = appealRepository.existsByUserIdAndStatusIn(
                userId, List.of(AppealStatus.PENDING, AppealStatus.UNDER_REVIEW));
        if (hasActiveAppeal) {
            throw new BadRequestException("Your appeal is already under review.");
        }

        String phone = (req.getPhone() != null && !req.getPhone().isBlank())
                ? req.getPhone().trim()
                : user.getPhone();

        String email = (req.getEmail() != null && !req.getEmail().isBlank())
                ? req.getEmail().trim()
                : user.getEmail();

        String msg = (req.getMessage() != null && !req.getMessage().isBlank())
                ? req.getMessage().trim()
                : req.getReason().trim();

        Appeal appeal = Appeal.builder()
                .user(user)
                .phone(phone)
                .email(email)
                .reason(req.getReason().trim())
                .message(msg)
                .documentUrl(req.getDocumentUrl())
                .status(AppealStatus.PENDING)
                .build();

        appeal = appealRepository.save(appeal);

        // Notify all admins about the new appeal
        List<User> admins = userRepository.findByRole(User.Role.ADMIN);
        String notifBody = "Farmer/User: " + user.getName() + " (" + (user.getRole() != null ? user.getRole().name() : "USER") + ")\n" +
                "Reason: " + appeal.getReason() + "\n" +
                "Submitted: " + appeal.getCreatedAt() + "\n" +
                "Status: Pending";

        for (User admin : admins) {
            notificationService.createNotification(
                    admin.getId(),
                    Notification.NotificationType.NEW_APPEAL,
                    "🔔 New Appeal",
                    notifBody,
                    appeal.getId(),
                    "APPEAL"
            );
        }

        log.info("APPEAL_SUBMITTED appealId={} userId={} reason={}", appeal.getId(), userId, appeal.getReason());
        return toResponse(appeal);
    }

    public List<AppealResponse> getMyAppeals(Long userId) {
        return appealRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<AppealResponse> getAppealsForAdmin(String statusFilter) {
        List<Appeal> list;
        if (statusFilter != null && !statusFilter.isBlank() && !statusFilter.equalsIgnoreCase("ALL")) {
            try {
                AppealStatus st = AppealStatus.valueOf(statusFilter.trim().toUpperCase());
                list = appealRepository.findByStatusOrderByCreatedAtDesc(st);
            } catch (IllegalArgumentException e) {
                list = appealRepository.findAllByOrderByCreatedAtDesc();
            }
        } else {
            list = appealRepository.findAllByOrderByCreatedAtDesc();
        }
        return list.stream().map(this::toResponse).toList();
    }

    public AppealResponse getAppealDetails(Long appealId) {
        Appeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new ResourceNotFoundException("Appeal", "id", appealId));
        return toResponse(appeal);
    }

    @Transactional
    public AppealResponse markUnderReview(Long adminId, Long appealId) {
        Appeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new ResourceNotFoundException("Appeal", "id", appealId));

        User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;

        appeal.setStatus(AppealStatus.UNDER_REVIEW);
        appeal.setReviewedBy(admin);
        appeal.setReviewedAt(LocalDateTime.now());
        appeal = appealRepository.save(appeal);

        // Notify user in-app
        if (appeal.getUser() != null) {
            notificationService.createNotification(
                    appeal.getUser().getId(),
                    Notification.NotificationType.APPEAL_UNDER_REVIEW,
                    "Appeal Under Review",
                    "Your account appeal regarding \"" + appeal.getReason() + "\" is currently under review by administration.",
                    appeal.getId(),
                    "APPEAL"
            );
        }

        return toResponse(appeal);
    }

    @Transactional
    public AppealResponse decideAppeal(Long adminId, Long appealId, AppealDecisionRequest req) {
        Appeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new ResourceNotFoundException("Appeal", "id", appealId));

        User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;
        User user = appeal.getUser();

        String statusStr = req.getStatus() != null ? req.getStatus().trim().toUpperCase() : "";
        if (!statusStr.equals("APPROVED") && !statusStr.equals("REJECTED") && !statusStr.equals("UNDER_REVIEW")) {
            throw new BadRequestException("Status must be APPROVED, REJECTED, or UNDER_REVIEW");
        }

        AppealStatus newStatus = AppealStatus.valueOf(statusStr);
        appeal.setStatus(newStatus);
        appeal.setAdminDecision(req.getAdminDecision() != null ? req.getAdminDecision().trim() : newStatus.name());
        appeal.setAdminDecisionReason(req.getAdminDecisionReason() != null ? req.getAdminDecisionReason().trim() : "");
        appeal.setReviewedBy(admin);
        appeal.setReviewedAt(LocalDateTime.now());
        appeal = appealRepository.save(appeal);

        if (newStatus == AppealStatus.APPROVED) {
            // Restore account status based on verification state
            if (user != null) {
                user.setStatus(User.UserStatus.ACTIVE);
                String reasonMsg = "Appeal approved by administration" +
                        (req.getAdminDecisionReason() != null && !req.getAdminDecisionReason().isBlank()
                                ? ": " + req.getAdminDecisionReason() : "");
                user.setStatusReason(reasonMsg);
                user.setStatusUpdatedAt(LocalDateTime.now());
                if (admin != null) user.setStatusUpdatedBy(admin.getName());
                userRepository.save(user);

                notificationService.createNotification(
                        user.getId(),
                        Notification.NotificationType.APPEAL_APPROVED,
                        "Appeal Approved — Account Restored",
                        "Your appeal has been approved. Your account has been restored to active status.",
                        appeal.getId(),
                        "APPEAL"
                );
            }
        } else if (newStatus == AppealStatus.REJECTED) {
            // Account remains suspended/deactivated
            if (user != null) {
                String rejReason = req.getAdminDecisionReason() != null && !req.getAdminDecisionReason().isBlank()
                        ? req.getAdminDecisionReason()
                        : "Appeal rejected by administration.";
                user.setStatusReason(rejReason);
                user.setStatusUpdatedAt(LocalDateTime.now());
                if (admin != null) user.setStatusUpdatedBy(admin.getName());
                userRepository.save(user);

                notificationService.createNotification(
                        user.getId(),
                        Notification.NotificationType.APPEAL_REJECTED,
                        "Appeal Rejected",
                        "Your account appeal was reviewed and rejected. Reason: " + rejReason,
                        appeal.getId(),
                        "APPEAL"
                );
            }
        }

        log.info("APPEAL_DECIDED appealId={} newStatus={} adminId={}", appealId, newStatus, adminId);
        return toResponse(appeal);
    }

    public AppealResponse toResponse(Appeal a) {
        User u = a.getUser();
        User admin = a.getReviewedBy();
        return AppealResponse.builder()
                .id(a.getId())
                .userId(u != null ? u.getId() : null)
                .userName(u != null ? u.getName() : "Unknown")
                .userRole(u != null && u.getRole() != null ? u.getRole().name() : null)
                .userEmail(u != null ? u.getEmail() : null)
                .userPhone(u != null ? u.getPhone() : null)
                .userAccountStatus(u != null && u.getStatus() != null ? u.getStatus().name() : null)
                .userSuspensionReason(u != null ? u.getStatusReason() : null)
                .userSuspendedAt(u != null ? u.getSuspendedAt() : null)
                .phone(a.getPhone())
                .email(a.getEmail())
                .reason(a.getReason())
                .message(a.getMessage())
                .documentUrl(a.getDocumentUrl())
                .status(a.getStatus())
                .adminDecision(a.getAdminDecision())
                .adminDecisionReason(a.getAdminDecisionReason())
                .reviewedById(admin != null ? admin.getId() : null)
                .reviewedByName(admin != null ? admin.getName() : null)
                .reviewedAt(a.getReviewedAt())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
