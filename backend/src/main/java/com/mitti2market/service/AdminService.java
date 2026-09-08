package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.model.User.Role;
import com.mitti2market.model.User.UserStatus;
import com.mitti2market.model.User.VerificationStatus;
import com.mitti2market.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final FarmerProfileRepository farmerProfileRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final SupportingDocumentRepository supportingDocumentRepository;
    private final ProduceRepository produceRepository;
    private final BuyerRequirementRepository buyerRequirementRepository;
    private final DealRepository dealRepository;
    private final ReportRepository reportRepository;
    private final DisputeRepository disputeRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    /** Calculate high-level platform statistics for the Admin Dashboard */
    public Map<String, Object> getPlatformStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("verifiedUsers", userRepository.countByVerifiedTrue());
        stats.put("pendingVerification", userRepository.countByVerificationStatus(VerificationStatus.PENDING));
        stats.put("activeFarmers", userRepository.countByRole(Role.FARMER));
        stats.put("activeBusinesses", userRepository.countByRole(Role.BUSINESS));
        
        List<Produce.ProduceStatus> activeProduceStatuses = List.of(
                Produce.ProduceStatus.AVAILABLE,
                Produce.ProduceStatus.LOW_STOCK,
                Produce.ProduceStatus.PARTIALLY_SOLD
        );
        stats.put("activeProduce", produceRepository.countByStatusIn(activeProduceStatuses));

        List<Deal.DealStatus> activeDealStatuses = List.of(
                Deal.DealStatus.LOCK_PENDING,
                Deal.DealStatus.LOCKED,
                Deal.DealStatus.LOGISTICS_PENDING,
                Deal.DealStatus.LOGISTICS_ASSIGNED,
                Deal.DealStatus.PICKUP_SCHEDULED,
                Deal.DealStatus.PICKED_UP,
                Deal.DealStatus.IN_TRANSIT,
                Deal.DealStatus.OUT_FOR_DELIVERY,
                Deal.DealStatus.DELIVERED
        );
        stats.put("activeDeals", dealRepository.findAll().stream().filter(d -> activeDealStatuses.contains(d.getStatus())).count());
        stats.put("openReports", reportRepository.countByStatus(Report.ReportStatus.OPEN));
        stats.put("openDisputes", disputeRepository.findByStatusOrderByCreatedAtDesc(Dispute.DisputeStatus.OPEN).size());

        return stats;
    }

    /** Search and filter users for Admin User Management */
    public List<Map<String, Object>> searchUsers(String role, String verification, String status, String keyword) {
        List<User> users = userRepository.findAll();

        return users.stream().filter(u -> {
            if (role != null && !role.isBlank()) {
                if (u.getRole() == null || !u.getRole().name().equalsIgnoreCase(role)) return false;
            }
            if (verification != null && !verification.isBlank()) {
                if (verification.equalsIgnoreCase("VERIFIED") && !Boolean.TRUE.equals(u.getVerified())) return false;
                if (verification.equalsIgnoreCase("UNVERIFIED") && Boolean.TRUE.equals(u.getVerified())) return false;
                if (verification.equalsIgnoreCase("PENDING") && u.getVerificationStatus() != VerificationStatus.PENDING) return false;
                if (verification.equalsIgnoreCase("REJECTED") && u.getVerificationStatus() != VerificationStatus.REJECTED) return false;
                if (verification.equalsIgnoreCase("RE_SUBMISSION_REQUESTED") && u.getVerificationStatus() != VerificationStatus.RE_SUBMISSION_REQUESTED) return false;
            }
            if (status != null && !status.isBlank()) {
                if (u.getStatus() == null || !u.getStatus().name().equalsIgnoreCase(status)) return false;
            }
            if (keyword != null && !keyword.isBlank()) {
                String k = keyword.toLowerCase();
                boolean nameMatch = u.getName() != null && u.getName().toLowerCase().contains(k);
                boolean emailMatch = u.getEmail() != null && u.getEmail().toLowerCase().contains(k);
                boolean phoneMatch = u.getPhone() != null && u.getPhone().contains(k);
                boolean orgMatch = u.getOrganizationName() != null && u.getOrganizationName().toLowerCase().contains(k);
                if (!nameMatch && !emailMatch && !phoneMatch && !orgMatch) return false;
            }
            return true;
        }).map(this::toUserSummary).toList();
    }

    /** Detailed view of user profile, verification documents, and history */
    public Map<String, Object> getUserDetails(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("user", toUserSummary(user));

        if (user.getRole() == Role.FARMER) {
            farmerProfileRepository.findByUserId(userId).ifPresent(fp -> details.put("farmerProfile", fp));
        } else if (user.getRole() == Role.BUSINESS) {
            businessProfileRepository.findByUserId(userId).ifPresent(bp -> details.put("businessProfile", bp));
        }

        List<SupportingDocument> docs = supportingDocumentRepository.findByUserId(userId);
        details.put("documents", docs);

        return details;
    }

    /** Verify user account */
    @Transactional
    public User verifyUser(Long adminId, Long userId, String notes) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        User admin = userRepository.findById(adminId).orElse(null);

        user.setVerified(true);
        user.setVerificationStatus(VerificationStatus.VERIFIED);
        user.setVerifiedAt(LocalDateTime.now());
        user.setVerifiedBy(admin != null ? admin.getName() : "ADMIN");
        user.setVerificationNotes(notes);
        userRepository.save(user);

        // Update profile status if exists
        if (user.getRole() == Role.FARMER) {
            farmerProfileRepository.findByUserId(userId).ifPresent(fp -> {
                fp.setProfileStatus(FarmerProfile.ProfileStatus.APPROVED);
                farmerProfileRepository.save(fp);
            });
        } else if (user.getRole() == Role.BUSINESS) {
            businessProfileRepository.findByUserId(userId).ifPresent(bp -> {
                bp.setProfileStatus(BusinessProfile.ProfileStatus.APPROVED);
                businessProfileRepository.save(bp);
            });
        }

        auditLogService.log(adminId, "USER_VERIFIED", "USER", userId, notes, "Verified user account " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.VERIFICATION_APPROVED,
                "Account Verified", "Your Mitti2Market account has been verified.");

        return user;
    }

    /** Reject verification request */
    @Transactional
    public User rejectVerification(Long adminId, Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        user.setVerified(false);
        user.setVerificationStatus(VerificationStatus.REJECTED);
        user.setVerificationNotes(reason);
        userRepository.save(user);

        auditLogService.log(adminId, "USER_REJECTED", "USER", userId, reason, "Rejected verification for user " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.VERIFICATION_REJECTED,
                "Verification Update", "Your verification request was rejected: " + reason);

        return user;
    }

    /** Request re-submission of documents */
    @Transactional
    public User requestResubmission(Long adminId, Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        user.setVerified(false);
        user.setVerificationStatus(VerificationStatus.RE_SUBMISSION_REQUESTED);
        user.setVerificationNotes(reason);
        userRepository.save(user);

        auditLogService.log(adminId, "USER_RESUBMISSION_REQUESTED", "USER", userId, reason, "Requested re-submission for user " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.VERIFICATION_REJECTED,
                "Re-verification Requested", "Please update and re-submit your verification documents: " + reason);

        return user;
    }

    /** Suspend user */
    @Transactional
    public User suspendUser(Long adminId, Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        User admin = userRepository.findById(adminId).orElse(null);

        user.setStatus(UserStatus.SUSPENDED);
        user.setStatusReason(reason);
        user.setStatusUpdatedAt(LocalDateTime.now());
        user.setStatusUpdatedBy(admin != null ? admin.getName() : "ADMIN");
        userRepository.save(user);

        auditLogService.log(adminId, "USER_SUSPENDED", "USER", userId, reason, "Suspended user account " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.ACCOUNT_SUSPENDED,
                "Account Suspended", "Your account has been suspended: " + reason);

        return user;
    }

    /** Unsuspend user */
    @Transactional
    public User unsuspendUser(Long adminId, Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        User admin = userRepository.findById(adminId).orElse(null);

        user.setStatus(UserStatus.ACTIVE);
        user.setStatusReason(reason);
        user.setStatusUpdatedAt(LocalDateTime.now());
        user.setStatusUpdatedBy(admin != null ? admin.getName() : "ADMIN");
        userRepository.save(user);

        auditLogService.log(adminId, "USER_UNSUSPENDED", "USER", userId, reason, "Unsuspended user account " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.ACCOUNT_VERIFIED,
                "Account Restored", "Your Mitti2Market account suspension has been lifted.");

        return user;
    }

    /** Deactivate user (Soft Delete) */
    @Transactional
    public User deactivateUser(Long adminId, Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        User admin = userRepository.findById(adminId).orElse(null);

        user.setStatus(UserStatus.DEACTIVATED);
        user.setStatusReason(reason);
        user.setStatusUpdatedAt(LocalDateTime.now());
        user.setStatusUpdatedBy(admin != null ? admin.getName() : "ADMIN");
        userRepository.save(user);

        auditLogService.log(adminId, "USER_DEACTIVATED", "USER", userId, reason, "Deactivated user account " + user.getEmail());

        return user;
    }

    /** Restore deactivated user */
    @Transactional
    public User restoreUser(Long adminId, Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        User admin = userRepository.findById(adminId).orElse(null);

        user.setStatus(UserStatus.ACTIVE);
        user.setStatusReason(reason);
        user.setStatusUpdatedAt(LocalDateTime.now());
        user.setStatusUpdatedBy(admin != null ? admin.getName() : "ADMIN");
        userRepository.save(user);

        auditLogService.log(adminId, "USER_RESTORED", "USER", userId, reason, "Restored user account " + user.getEmail());

        return user;
    }

    /** Admin override to remove problematic produce listing */
    @Transactional
    public Produce removeProduce(Long adminId, Long produceId, String reason) {
        Produce produce = produceRepository.findById(produceId)
                .orElseThrow(() -> new ResourceNotFoundException("Produce", "id", produceId));
        User admin = userRepository.findById(adminId).orElse(null);

        produce.setStatus(Produce.ProduceStatus.ADMIN_REMOVED);
        produce.setAdminRemovalReason(reason);
        produce.setRemovedAt(LocalDateTime.now());
        produce.setRemovedBy(admin != null ? admin.getName() : "ADMIN");
        produceRepository.save(produce);

        auditLogService.log(adminId, "PRODUCE_REMOVED", "PRODUCE", produceId, reason, "Removed produce listing: " + produce.getName());

        notificationService.createNotification(produce.getFarmer().getId(), Notification.NotificationType.SYSTEM_ALERT,
                "Listing Removed", "Your listing for '" + produce.getName() + "' was removed by administration: " + reason);

        return produce;
    }

    /** Admin override to remove problematic buyer requirement */
    @Transactional
    public BuyerRequirement removeRequirement(Long adminId, Long requirementId, String reason) {
        BuyerRequirement req = buyerRequirementRepository.findById(requirementId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement", "id", requirementId));
        User admin = userRepository.findById(adminId).orElse(null);

        req.setStatus(BuyerRequirement.RequirementStatus.ADMIN_REMOVED);
        req.setAdminRemovalReason(reason);
        req.setRemovedAt(LocalDateTime.now());
        req.setRemovedBy(admin != null ? admin.getName() : "ADMIN");
        buyerRequirementRepository.save(req);

        auditLogService.log(adminId, "REQUIREMENT_REMOVED", "REQUIREMENT", requirementId, reason, "Removed buyer requirement: " + req.getCrop());

        notificationService.createNotification(req.getBuyer().getId(), Notification.NotificationType.SYSTEM_ALERT,
                "Requirement Removed", "Your requirement for '" + req.getCrop() + "' was removed by administration: " + reason);

        return req;
    }

    public Map<String, Object> toUserSummary(User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", user.getId());
        m.put("name", user.getName());
        m.put("email", user.getEmail());
        m.put("phone", user.getPhone());
        m.put("role", user.getRole() != null ? user.getRole().name() : "USER");
        m.put("status", user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
        m.put("verified", user.getVerified());
        m.put("verificationStatus", user.getVerificationStatus() != null ? user.getVerificationStatus().name()
                : Boolean.TRUE.equals(user.getVerified()) ? "VERIFIED" : "NOT_VERIFIED");
        m.put("rating", user.getRating());
        m.put("location", user.getLocation());
        m.put("organizationName", user.getOrganizationName());
        m.put("statusReason", user.getStatusReason());
        m.put("verificationNotes", user.getVerificationNotes());
        m.put("verifiedAt", user.getVerifiedAt());
        m.put("verifiedBy", user.getVerifiedBy());
        m.put("createdAt", user.getCreatedAt());
        return m;
    }
}
