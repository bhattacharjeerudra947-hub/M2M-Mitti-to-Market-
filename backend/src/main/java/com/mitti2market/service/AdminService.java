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
    private final FeedbackRepository feedbackRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    /** Calculate high-level platform statistics for the Admin Dashboard */
    public Map<String, Object> getPlatformStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        long totalUsers = userRepository.count();
        long farmers = userRepository.countByRole(Role.FARMER);
        long businesses = userRepository.countByRole(Role.BUSINESS);

        List<User> allUsers = userRepository.findAll();
        long pending = allUsers.stream().filter(u ->
                u.getVerificationStatus() == VerificationStatus.PENDING
                || u.getVerificationStatus() == VerificationStatus.UNDER_REVIEW
                || u.getVerificationStatus() == VerificationStatus.DOCUMENTS_SUBMITTED).count();

        long verifiedUsers = allUsers.stream().filter(u ->
                Boolean.TRUE.equals(u.getVerified())
                || u.getVerificationStatus() == VerificationStatus.VERIFIED
                || u.getVerificationStatus() == VerificationStatus.APPROVED).count();

        long rejected = allUsers.stream().filter(u ->
                u.getVerificationStatus() == VerificationStatus.REJECTED).count();

        long reupload = allUsers.stream().filter(u ->
                u.getVerificationStatus() == VerificationStatus.RE_SUBMISSION_REQUESTED
                || u.getVerificationStatus() == VerificationStatus.RESUBMISSION_REQUIRED).count();

        long activeUsers = userRepository.countByStatus(UserStatus.ACTIVE);
        long suspendedUsers = userRepository.countByStatus(UserStatus.SUSPENDED);
        long deactivatedUsers = userRepository.countByStatus(UserStatus.DEACTIVATED);

        // Core 17 metrics
        stats.put("totalUsers", totalUsers);
        stats.put("farmers", farmers);
        stats.put("businesses", businesses);
        stats.put("verifiedUsers", verifiedUsers);
        stats.put("pendingVerification", pending);
        stats.put("rejectedVerification", rejected);
        stats.put("resubmissionRequired", reupload);
        stats.put("activeUsers", activeUsers);
        stats.put("suspendedUsers", suspendedUsers);
        stats.put("deactivatedUsers", deactivatedUsers);

        // Aliases for compatibility
        stats.put("pendingApplications", pending);
        stats.put("approvedUsers", verifiedUsers);
        stats.put("rejectedApplications", rejected);
        stats.put("reuploadRequests", reupload);
        stats.put("activeFarmers", farmers);
        stats.put("activeBusinesses", businesses);
        
        List<Produce.ProduceStatus> activeProduceStatuses = List.of(
                Produce.ProduceStatus.AVAILABLE,
                Produce.ProduceStatus.LOW_STOCK,
                Produce.ProduceStatus.PARTIALLY_SOLD
        );
        stats.put("activeProduce", produceRepository.countByStatusIn(activeProduceStatuses));

        List<BuyerRequirement.RequirementStatus> activeReqStatuses = List.of(
                BuyerRequirement.RequirementStatus.OPEN,
                BuyerRequirement.RequirementStatus.PARTIALLY_FULFILLED
        );
        stats.put("activeRequirements", buyerRequirementRepository.countByStatusIn(activeReqStatuses));

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
        stats.put("completedDeals", dealRepository.countByStatus(Deal.DealStatus.COMPLETED));
        stats.put("cancelledDeals", dealRepository.countByStatus(Deal.DealStatus.CANCELLED));
        stats.put("openReports", reportRepository.countByStatus(Report.ReportStatus.OPEN));

        long pendingFeedback = feedbackRepository.findAll().stream().filter(f ->
                f.getStatus() == Feedback.FeedbackStatus.NEW || f.getStatus() == Feedback.FeedbackStatus.REVIEWING).count();
        stats.put("pendingFeedback", pendingFeedback);

        stats.put("openDisputes", disputeRepository.findByStatusOrderByCreatedAtDesc(Dispute.DisputeStatus.OPEN).size());

        return stats;
    }

    /** Search and filter users for Admin User Management & Verification Queue */
    public List<Map<String, Object>> searchUsers(String role, String verification, String status, String keyword) {
        return searchUsers(role, verification, status, keyword, null, null);
    }

    public List<Map<String, Object>> searchUsers(String role, String verification, String status, String keyword, String state, String district) {
        List<User> users = userRepository.findAll();

        return users.stream().filter(u -> {
            if (role != null && !role.isBlank() && !role.equalsIgnoreCase("ALL")) {
                if (u.getRole() == null || !u.getRole().name().equalsIgnoreCase(role)) return false;
            }
            if (verification != null && !verification.isBlank() && !verification.equalsIgnoreCase("ALL")) {
                String targetNorm = User.VerificationStatus.normalize(verification);
                String userNorm = u.getStandardVerificationStatus();
                if (targetNorm.equalsIgnoreCase("VERIFIED")) {
                    if (!userNorm.equalsIgnoreCase("VERIFIED") && !Boolean.TRUE.equals(u.getVerified())) return false;
                } else if (targetNorm.equalsIgnoreCase("UNVERIFIED")) {
                    if (Boolean.TRUE.equals(u.getVerified()) || !userNorm.equalsIgnoreCase("UNVERIFIED")) return false;
                } else {
                    if (!userNorm.equalsIgnoreCase(targetNorm)) return false;
                }
            }
            if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                if (u.getStatus() == null || !u.getStatus().name().equalsIgnoreCase(status)) return false;
            }
            if (state != null && !state.isBlank() && !state.equalsIgnoreCase("ALL")) {
                if (u.getState() == null || !u.getState().equalsIgnoreCase(state)) return false;
            }
            if (district != null && !district.isBlank() && !district.equalsIgnoreCase("ALL")) {
                if (u.getDistrict() == null || !u.getDistrict().equalsIgnoreCase(district)) return false;
            }
            if (keyword != null && !keyword.isBlank()) {
                String k = keyword.toLowerCase().trim();
                boolean nameMatch = u.getName() != null && u.getName().toLowerCase().contains(k);
                boolean emailMatch = u.getEmail() != null && u.getEmail().toLowerCase().contains(k);
                boolean phoneMatch = u.getPhone() != null && u.getPhone().contains(k);
                boolean orgMatch = u.getOrganizationName() != null && u.getOrganizationName().toLowerCase().contains(k);
                boolean villageMatch = u.getVillage() != null && u.getVillage().toLowerCase().contains(k);
                boolean tehsilMatch = u.getTehsil() != null && u.getTehsil().toLowerCase().contains(k);
                if (!nameMatch && !emailMatch && !phoneMatch && !orgMatch && !villageMatch && !tehsilMatch) return false;
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

    public void validateVerificationTransition(VerificationStatus current, VerificationStatus next) {
        String curr = current != null ? current.toStandardName() : "UNVERIFIED";
        String target = next != null ? next.toStandardName() : "UNVERIFIED";

        boolean valid = switch (target) {
            case "UNDER_REVIEW" -> curr.equals("DOCUMENTS_SUBMITTED") || curr.equals("UNVERIFIED");
            case "VERIFIED" -> curr.equals("UNDER_REVIEW") || curr.equals("DOCUMENTS_SUBMITTED");
            case "REJECTED" -> curr.equals("UNDER_REVIEW") || curr.equals("DOCUMENTS_SUBMITTED") || curr.equals("VERIFIED");
            case "RESUBMISSION_REQUIRED" -> curr.equals("UNDER_REVIEW") || curr.equals("DOCUMENTS_SUBMITTED") || curr.equals("REJECTED");
            case "DOCUMENTS_SUBMITTED" -> curr.equals("RESUBMISSION_REQUIRED") || curr.equals("REJECTED") || curr.equals("UNVERIFIED");
            case "UNVERIFIED" -> true;
            default -> false;
        };

        if (!valid) {
            throw new BadRequestException("Invalid verification transition from " + curr + " to " + target);
        }
    }

    /** Verify user account */
    @Transactional
    public User verifyUser(Long adminId, Long userId, String notes) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        User admin = userRepository.findById(adminId).orElse(null);

        validateVerificationTransition(user.getVerificationStatus(), VerificationStatus.VERIFIED);

        user.setVerified(true);
        user.setVerificationStatus(VerificationStatus.VERIFIED);
        user.setVerifiedAt(LocalDateTime.now());
        user.setVerifiedBy(admin != null ? admin.getName() : "ADMIN");
        user.setVerificationNotes(notes != null ? notes : "Verified by Admin");
        user.setStatusReason("Verification approved");
        user.setStatusUpdatedAt(LocalDateTime.now());
        user.setStatusUpdatedBy(admin != null ? admin.getName() : "ADMIN");
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

        auditLogService.log(adminId, "ADMIN_VERIFIED_USER", "USER", userId, notes, "Verified user account " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.VERIFICATION_APPROVED,
                "Account Verified", "Your Mitti2Market account has been verified successfully.", userId, "USER");

        return user;
    }

    /** Reject verification request */
    @Transactional
    public User rejectVerification(Long adminId, Long userId, String reason) {
        if (reason == null || reason.trim().isBlank()) {
            throw new BadRequestException("A rejection reason is required.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        User admin = userRepository.findById(adminId).orElse(null);

        validateVerificationTransition(user.getVerificationStatus(), VerificationStatus.REJECTED);

        user.setVerified(false);
        user.setVerificationStatus(VerificationStatus.REJECTED);
        user.setVerificationNotes(reason.trim());
        user.setStatusReason(reason.trim());
        user.setStatusUpdatedAt(LocalDateTime.now());
        user.setStatusUpdatedBy(admin != null ? admin.getName() : "ADMIN");
        userRepository.save(user);

        auditLogService.log(adminId, "ADMIN_REJECTED_USER", "USER", userId, reason.trim(), "Rejected verification for user " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.VERIFICATION_REJECTED,
                "Verification Rejected", "Supporting document or details could not be verified: " + reason.trim(), userId, "USER");

        return user;
    }

    /** Request re-submission of documents */
    @Transactional
    public User requestResubmission(Long adminId, Long userId, String reason) {
        if (reason == null || reason.trim().isBlank()) {
            throw new BadRequestException("A reason for requesting resubmission is required.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        User admin = userRepository.findById(adminId).orElse(null);

        validateVerificationTransition(user.getVerificationStatus(), VerificationStatus.RESUBMISSION_REQUIRED);

        user.setVerified(false);
        user.setVerificationStatus(VerificationStatus.RESUBMISSION_REQUIRED);
        user.setVerificationNotes(reason.trim());
        user.setStatusReason(reason.trim());
        user.setStatusUpdatedAt(LocalDateTime.now());
        user.setStatusUpdatedBy(admin != null ? admin.getName() : "ADMIN");
        userRepository.save(user);

        auditLogService.log(adminId, "ADMIN_REQUESTED_RESUBMISSION", "USER", userId, reason.trim(), "Requested document resubmission for user " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.RESUBMISSION_REQUESTED,
                "Documents Need Resubmission", "Please review and re-submit your verification documents: " + reason.trim(), userId, "USER");

        return user;
    }

    /** Suspend user */
    @Transactional
    public User suspendUser(Long adminId, Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        if (user.getRole() == Role.ADMIN) {
            throw new BadRequestException("Admin accounts cannot be suspended.");
        }
        User admin = userRepository.findById(adminId).orElse(null);

        user.setStatus(UserStatus.SUSPENDED);
        user.setStatusReason(reason);
        user.setStatusUpdatedAt(LocalDateTime.now());
        user.setStatusUpdatedBy(admin != null ? admin.getName() : "ADMIN");
        userRepository.save(user);

        auditLogService.log(adminId, "ADMIN_SUSPENDED_USER", "USER", userId, reason, "Suspended user account " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.ACCOUNT_SUSPENDED,
                "Account Suspended", "Your account has been suspended: " + reason, userId, "USER");

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

        auditLogService.log(adminId, "ADMIN_RESTORED_USER", "USER", userId, reason, "Unsuspended user account " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.ACCOUNT_RESTORED,
                "Account Restored", "Your account suspension has been lifted.", userId, "USER");

        return user;
    }

    /** Deactivate user (Soft Delete) */
    @Transactional
    public User deactivateUser(Long adminId, Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        if (user.getRole() == Role.ADMIN) {
            throw new BadRequestException("Admin accounts cannot be deactivated.");
        }
        User admin = userRepository.findById(adminId).orElse(null);

        user.setStatus(UserStatus.DEACTIVATED);
        user.setStatusReason(reason);
        user.setStatusUpdatedAt(LocalDateTime.now());
        user.setStatusUpdatedBy(admin != null ? admin.getName() : "ADMIN");
        userRepository.save(user);

        auditLogService.log(adminId, "ADMIN_DEACTIVATED_USER", "USER", userId, reason, "Deactivated user account " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.ACCOUNT_DEACTIVATED,
                "Account Deactivated", "Your account has been deactivated: " + reason, userId, "USER");

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

        auditLogService.log(adminId, "ADMIN_RESTORED_USER", "USER", userId, reason, "Restored user account " + user.getEmail());

        notificationService.createNotification(userId, Notification.NotificationType.ACCOUNT_RESTORED,
                "Account Restored", "Your account has been reactivated.", userId, "USER");

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
        m.put("verificationStatus", user.getVerificationStatus() != null ? user.getVerificationStatus().toStandardName()
                : Boolean.TRUE.equals(user.getVerified()) ? "VERIFIED" : "UNVERIFIED");
        m.put("rating", user.getRating());
        m.put("location", user.getLocation());
        m.put("country", "India");
        m.put("state", user.getState());
        m.put("district", user.getDistrict());
        m.put("tehsil", user.getTehsil());
        m.put("village", user.getVillage());
        m.put("pincode", user.getPincode());
        m.put("latitude", user.getLatitude());
        m.put("longitude", user.getLongitude());
        m.put("organizationName", user.getOrganizationName());
        m.put("statusReason", user.getStatusReason());
        m.put("statusUpdatedAt", user.getStatusUpdatedAt());
        m.put("statusUpdatedBy", user.getStatusUpdatedBy());
        m.put("verificationNotes", user.getVerificationNotes());
        m.put("verifiedAt", user.getVerifiedAt());
        m.put("verifiedBy", user.getVerifiedBy());
        m.put("profilePhotoUrl", user.getProfilePhotoUrl());
        m.put("createdAt", user.getCreatedAt());
        return m;
    }
}
