package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.model.*;
import com.mitti2market.model.Dispute.DisputeReason;
import com.mitti2market.model.Dispute.DisputeStatus;
import com.mitti2market.model.Evidence.EvidenceStage;
import com.mitti2market.model.Evidence.VerificationStatus;
import com.mitti2market.model.Notification.NotificationType;
import com.mitti2market.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DisputeService {

    private final DisputeRepository disputeRepo;
    private final DisputeResponseRepository disputeResponseRepo;
    private final EvidenceRepository evidenceRepo;
    private final ObserverAssignmentRepository observerAssignmentRepo;
    private final DealRepository dealRepo;
    private final UserRepository userRepo;
    private final DealStateMachineService stateMachine;
    private final DealService dealService;
    private final DealCompletionService dealCompletionService;
    private final NotificationService notificationService;
    private final CloudinaryService cloudinaryService;

    // ─────────────────────────────────────────────────────────────
    // EVIDENCE OPERATIONS (IMMUTABLE AUDIT CHAIN)
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public Evidence uploadEvidence(Long userId, Long dealId, MultipartFile file, String imageUrl,
                                   String stageStr, String description, String location,
                                   Double latitude, Double longitude, Double lotQuantity, String grade) {
        User user = validateActiveUser(userId);
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new BadRequestException("Deal not found with ID: " + dealId));

        boolean isFarmer = deal.getFarmer() != null && deal.getFarmer().getId().equals(userId);
        boolean isBuyer = deal.getBuyer() != null && deal.getBuyer().getId().equals(userId);
        boolean isObserver = user.getRole() == User.Role.OBSERVER;
        boolean isAdmin = user.getRole() == User.Role.ADMIN;

        if (!isFarmer && !isBuyer && !isObserver && !isAdmin) {
            throw new BadRequestException("Access denied: You are not authorized to upload evidence for this deal");
        }

        EvidenceStage stage;
        try {
            stage = EvidenceStage.valueOf(stageStr.toUpperCase());
        } catch (Exception e) {
            stage = isFarmer ? EvidenceStage.ORIGIN : isBuyer ? EvidenceStage.DELIVERY : EvidenceStage.ADDITIONAL;
        }

        // Strict stage authorization
        if (stage == EvidenceStage.ORIGIN && !isFarmer && !isObserver && !isAdmin) {
            throw new BadRequestException("Only the farmer, authorized observer, or admin can upload Origin evidence");
        }
        if (stage == EvidenceStage.DELIVERY && !isBuyer && !isObserver && !isAdmin) {
            throw new BadRequestException("Only the buyer, authorized observer, or admin can upload Delivery evidence");
        }

        // Resolve Image URL
        String finalImageUrl = imageUrl;
        if (file != null && !file.isEmpty()) {
            Map<String, String> uploadRes = cloudinaryService.uploadFile(file, "mitti2market/evidence/deal_" + dealId, true);
            finalImageUrl = uploadRes.get("url");
        }

        if (finalImageUrl == null || finalImageUrl.isBlank()) {
            throw new BadRequestException("Evidence photograph is required");
        }

        String uploaderRole = isAdmin ? "ADMIN" : isObserver ? "OBSERVER" : isFarmer ? "FARMER" : "BUYER";

        // Never overwrite: Always create a brand-new immutable record
        Evidence.EvidenceBuilder builder = Evidence.builder()
                .dealId(dealId)
                .orderId(dealId)
                .stage(stage)
                .uploader(user)
                .uploaderRole(uploaderRole)
                .imageUrl(finalImageUrl)
                .description(description)
                .location(location)
                .latitude(latitude)
                .longitude(longitude)
                .lotQuantity(lotQuantity != null ? lotQuantity : (deal.getQuantity() != null ? deal.getQuantity().doubleValue() : null))
                .grade(grade);

        // Observer or Admin uploads are auto-verified
        if (isObserver || isAdmin) {
            builder.verificationStatus(VerificationStatus.VERIFIED)
                    .verifiedBy(user)
                    .verifiedAt(LocalDateTime.now())
                    .observerNotes(description != null ? description : "Verified during field inspection");
        } else {
            builder.verificationStatus(VerificationStatus.PENDING);
        }

        Evidence saved = evidenceRepo.save(builder.build());

        // Audit Trail Event
        stateMachine.recordEvent(dealId, stage.name() + "_EVIDENCE_UPLOADED", userId, uploaderRole,
                (isObserver ? "Observer (" : (uploaderRole + " (")) + user.getName() + ") uploaded "
                        + stage.name().toLowerCase() + " evidence photo" + (description != null ? ": " + description : ""), null);

        // Targeted Notifications
        if (isFarmer && deal.getBuyer() != null) {
            notificationService.createNotification(deal.getBuyer().getId(), NotificationType.EVIDENCE_UPLOADED,
                    "Origin Evidence Uploaded",
                    user.getName() + " uploaded origin verification photos for Deal #" + dealId,
                    dealId, "DEAL");
        } else if (isBuyer && deal.getFarmer() != null) {
            notificationService.createNotification(deal.getFarmer().getId(), NotificationType.EVIDENCE_UPLOADED,
                    "Delivery Evidence Uploaded",
                    user.getName() + " uploaded delivery verification photos for Deal #" + dealId,
                    dealId, "DEAL");
        } else if (isObserver || isAdmin) {
            if (deal.getFarmer() != null) {
                notificationService.createNotification(deal.getFarmer().getId(), NotificationType.EVIDENCE_UPLOADED,
                        "Observer Verified Evidence",
                        "Authorized Observer " + user.getName() + " uploaded verified inspection evidence for Deal #" + dealId,
                        dealId, "DEAL");
            }
            if (deal.getBuyer() != null) {
                notificationService.createNotification(deal.getBuyer().getId(), NotificationType.EVIDENCE_UPLOADED,
                        "Observer Verified Evidence",
                        "Authorized Observer " + user.getName() + " uploaded verified inspection evidence for Deal #" + dealId,
                        dealId, "DEAL");
            }
        }

        return saved;
    }

    public List<Evidence> getDealEvidence(Long dealId, Long userId) {
        User user = validateActiveUser(userId);
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new BadRequestException("Deal not found with ID: " + dealId));

        boolean isFarmer = deal.getFarmer() != null && deal.getFarmer().getId().equals(userId);
        boolean isBuyer = deal.getBuyer() != null && deal.getBuyer().getId().equals(userId);
        boolean isObserver = user.getRole() == User.Role.OBSERVER;
        boolean isAdmin = user.getRole() == User.Role.ADMIN;

        if (!isFarmer && !isBuyer && !isObserver && !isAdmin) {
            throw new BadRequestException("Access denied: You do not have permission to view evidence for this deal");
        }

        return evidenceRepo.findByDealIdOrderByCreatedAtAsc(dealId);
    }

    @Transactional
    public Evidence verifyEvidence(Long verifierId, Long evidenceId, String statusStr, String notes) {
        User verifier = validateActiveUser(verifierId);
        if (verifier.getRole() != User.Role.OBSERVER && verifier.getRole() != User.Role.ADMIN) {
            throw new BadRequestException("Only authorized observers or administrators can verify evidence");
        }

        Evidence evidence = evidenceRepo.findById(evidenceId)
                .orElseThrow(() -> new BadRequestException("Evidence record not found"));

        // Observer cannot verify their own upload
        if (verifier.getRole() == User.Role.OBSERVER && evidence.getUploader().getId().equals(verifierId)) {
            throw new BadRequestException("An observer cannot verify their own uploaded evidence");
        }

        VerificationStatus status = "REJECTED".equalsIgnoreCase(statusStr) ? VerificationStatus.REJECTED : VerificationStatus.VERIFIED;
        evidence.setVerificationStatus(status);
        evidence.setVerifiedBy(verifier);
        evidence.setVerifiedAt(LocalDateTime.now());
        evidence.setObserverNotes(notes);

        Evidence saved = evidenceRepo.save(evidence);

        // Audit Trail Event
        stateMachine.recordEvent(evidence.getDealId(), "EVIDENCE_" + status.name(), verifierId,
                verifier.getRole().name(),
                verifier.getName() + " (" + verifier.getRole().name() + ") marked " + evidence.getStage().name().toLowerCase()
                        + " evidence as " + status.name() + (notes != null ? ": " + notes : ""), null);

        // Notify deal parties
        Deal deal = dealRepo.findById(evidence.getDealId()).orElse(null);
        if (deal != null) {
            String title = "Evidence " + (status == VerificationStatus.VERIFIED ? "Verified" : "Rejected");
            String body = verifier.getName() + " reviewed " + evidence.getStage().name().toLowerCase() + " evidence: " + (notes != null ? notes : status.name());
            if (deal.getFarmer() != null) notificationService.createNotification(deal.getFarmer().getId(), NotificationType.EVIDENCE_UPLOADED, title, body, deal.getId(), "DEAL");
            if (deal.getBuyer() != null) notificationService.createNotification(deal.getBuyer().getId(), NotificationType.EVIDENCE_UPLOADED, title, body, deal.getId(), "DEAL");
        }

        return saved;
    }

    // ─────────────────────────────────────────────────────────────
    // BUYER ACCEPTANCE (CONFIRM DELIVERY -> COMPLETE ORDER)
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public Deal acceptDelivery(Long buyerId, Long dealId) {
        User buyer = validateActiveUser(buyerId);
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new BadRequestException("Deal not found with ID: " + dealId));

        if (deal.getBuyer() == null || !deal.getBuyer().getId().equals(buyerId)) {
            throw new BadRequestException("Only the buyer of this deal can accept delivery");
        }

        if (deal.getStatus() == Deal.DealStatus.COMPLETED) {
            return deal;
        }

        if (deal.getStatus() == Deal.DealStatus.CANCELLED || deal.getStatus() == Deal.DealStatus.DISPUTED) {
            throw new BadRequestException("Cannot accept delivery while deal is " + deal.getStatus().name());
        }

        // Transition deal to COMPLETED
        stateMachine.transitionTo(dealId, Deal.DealStatus.COMPLETED);
        dealService.finalizeSoldQuantity(deal);

        // Record Audit Event
        stateMachine.recordEvent(dealId, "DELIVERY_ACCEPTED", buyerId, "BUYER",
                "Buyer (" + buyer.getName() + ") accepted delivery satisfactorily. Order completed.", null);

        // Notify Farmer
        if (deal.getFarmer() != null) {
            notificationService.createNotification(deal.getFarmer().getId(), NotificationType.DEAL_COMPLETED,
                    "Delivery Accepted — Deal Completed",
                    buyer.getName() + " accepted delivery for Deal #" + dealId + ". Transaction completed successfully.",
                    dealId, "DEAL");
        }

        // Notify Buyer
        notificationService.createNotification(buyerId, NotificationType.DEAL_COMPLETED,
                "Order Completed",
                "Delivery confirmed for Deal #" + dealId + ". Thank you for trading on Mitti2Market!",
                dealId, "DEAL");

        return dealRepo.findById(dealId).orElse(deal);
    }

    // ─────────────────────────────────────────────────────────────
    // DISPUTE CREATION & LIFECYCLE
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public Dispute openDispute(Long userId, Long dealId, String reasonStr, String description,
                               Integer disputedQuantity, String evidenceUrl, MultipartFile evidenceFile) {
        User user = validateActiveUser(userId);
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new BadRequestException("Deal not found with ID: " + dealId));

        boolean isFarmer = deal.getFarmer() != null && deal.getFarmer().getId().equals(userId);
        boolean isBuyer = deal.getBuyer() != null && deal.getBuyer().getId().equals(userId);
        boolean isAdmin = user.getRole() == User.Role.ADMIN;

        if (!isFarmer && !isBuyer && !isAdmin) {
            throw new BadRequestException("Access denied: You are not a party to this deal");
        }

        if (deal.getStatus() == Deal.DealStatus.CANCELLED) {
            throw new BadRequestException("Cannot dispute a cancelled deal");
        }

        DisputeReason reason;
        try {
            reason = DisputeReason.valueOf(reasonStr.toUpperCase());
        } catch (Exception e) {
            reason = DisputeReason.OTHER;
        }

        // If an initial evidence photo is provided, upload/record it
        String initialEvidenceUrl = evidenceUrl;
        if (evidenceFile != null && !evidenceFile.isEmpty()) {
            Map<String, String> uploadRes = cloudinaryService.uploadFile(evidenceFile, "mitti2market/evidence/deal_" + dealId, true);
            initialEvidenceUrl = uploadRes.get("url");
        }

        Integer origQty = deal.getQuantity() != null ? deal.getQuantity() : 0;
        Integer dispQty = disputedQuantity != null ? disputedQuantity : origQty;

        Dispute dispute = Dispute.builder()
                .dealId(dealId)
                .orderId(dealId)
                .raisedBy(user)
                .reason(reason)
                .description(description)
                .status(DisputeStatus.OPEN)
                .originalQuantity(origQty)
                .disputedQuantity(dispQty)
                .build();

        dispute = disputeRepo.save(dispute);

        // Put Deal into DISPUTED status
        try {
            stateMachine.transitionTo(dealId, Deal.DealStatus.DISPUTED);
        } catch (Exception ex) {
            deal.setStatus(Deal.DealStatus.DISPUTED);
            dealRepo.save(deal);
        }

        String userRole = isAdmin ? "ADMIN" : isFarmer ? "FARMER" : "BUYER";

        // Record initial DisputeResponse (CLAIM)
        DisputeResponse claimResponse = DisputeResponse.builder()
                .dispute(dispute)
                .user(user)
                .userRole(userRole)
                .message(description != null && !description.isBlank() ? description : "Dispute opened for reason: " + reason.name())
                .responseType(DisputeResponse.ResponseType.CLAIM)
                .evidenceUrl(initialEvidenceUrl)
                .build();
        disputeResponseRepo.save(claimResponse);

        // If evidence photo was uploaded, persist Evidence record
        if (initialEvidenceUrl != null && !initialEvidenceUrl.isBlank()) {
            Evidence ev = Evidence.builder()
                    .dealId(dealId)
                    .orderId(dealId)
                    .stage(EvidenceStage.DISPUTE)
                    .uploader(user)
                    .uploaderRole(userRole)
                    .imageUrl(initialEvidenceUrl)
                    .description("Dispute claim photo: " + reason.name())
                    .verificationStatus(VerificationStatus.PENDING)
                    .lotQuantity(dispQty.doubleValue())
                    .build();
            evidenceRepo.save(ev);
        }

        // Audit Trail Event
        stateMachine.recordEvent(dealId, "DISPUTE_OPENED", userId, userRole,
                "Dispute #" + dispute.getId() + " opened by " + user.getName() + " (" + userRole + "): " +
                        reason.name().replace('_', ' ') + (description != null ? " — " + description : ""), null);

        // Notifications
        User counterparty = isFarmer ? deal.getBuyer() : deal.getFarmer();
        if (counterparty != null) {
            notificationService.createNotification(counterparty.getId(), NotificationType.DISPUTE_OPENED,
                    "Dispute Raised on Deal #" + dealId,
                    user.getName() + " reported an issue (" + reason.name().replace('_', ' ') + "). Please review and respond.",
                    dispute.getId(), "DISPUTE");
        }

        // Notify Admins
        List<User> admins = userRepo.findAll().stream().filter(u -> u.getRole() == User.Role.ADMIN).toList();
        for (User adm : admins) {
            notificationService.createNotification(adm.getId(), NotificationType.DISPUTE_OPENED,
                    "New Dispute #" + dispute.getId() + " Requires Attention",
                    user.getName() + " disputed Deal #" + dealId + " (" + reason.name().replace('_', ' ') + ").",
                    dispute.getId(), "DISPUTE");
        }

        return dispute;
    }

    @Transactional
    public DisputeResponse respondToDispute(Long userId, Long disputeId, String message,
                                            String responseTypeStr, String evidenceUrl, MultipartFile evidenceFile) {
        User user = validateActiveUser(userId);
        Dispute dispute = disputeRepo.findById(disputeId)
                .orElseThrow(() -> new BadRequestException("Dispute not found with ID: " + disputeId));
        Deal deal = dealRepo.findById(dispute.getDealId())
                .orElseThrow(() -> new BadRequestException("Deal not found with ID: " + dispute.getDealId()));

        boolean isFarmer = deal.getFarmer() != null && deal.getFarmer().getId().equals(userId);
        boolean isBuyer = deal.getBuyer() != null && deal.getBuyer().getId().equals(userId);
        boolean isObserver = user.getRole() == User.Role.OBSERVER;
        boolean isAdmin = user.getRole() == User.Role.ADMIN;

        if (!isFarmer && !isBuyer && !isObserver && !isAdmin) {
            throw new BadRequestException("Access denied: You are not authorized to respond to this dispute");
        }

        DisputeResponse.ResponseType type;
        try {
            type = DisputeResponse.ResponseType.valueOf(responseTypeStr.toUpperCase());
        } catch (Exception e) {
            type = isObserver ? DisputeResponse.ResponseType.OBSERVER_REPORT :
                    isAdmin ? DisputeResponse.ResponseType.ADMIN_NOTE : DisputeResponse.ResponseType.RESPONSE;
        }

        String finalEvidenceUrl = evidenceUrl;
        if (evidenceFile != null && !evidenceFile.isEmpty()) {
            Map<String, String> uploadRes = cloudinaryService.uploadFile(evidenceFile, "mitti2market/evidence/deal_" + deal.getId(), true);
            finalEvidenceUrl = uploadRes.get("url");
        }

        String userRole = isAdmin ? "ADMIN" : isObserver ? "OBSERVER" : isFarmer ? "FARMER" : "BUYER";

        DisputeResponse response = DisputeResponse.builder()
                .dispute(dispute)
                .user(user)
                .userRole(userRole)
                .message(message)
                .responseType(type)
                .evidenceUrl(finalEvidenceUrl)
                .build();
        response = disputeResponseRepo.save(response);

        // If additional evidence was provided, save an Evidence record
        if (finalEvidenceUrl != null && !finalEvidenceUrl.isBlank()) {
            Evidence ev = Evidence.builder()
                    .dealId(deal.getId())
                    .orderId(deal.getId())
                    .stage(EvidenceStage.ADDITIONAL)
                    .uploader(user)
                    .uploaderRole(userRole)
                    .imageUrl(finalEvidenceUrl)
                    .description("Additional evidence for Dispute #" + dispute.getId() + ": " + message)
                    .verificationStatus(isObserver || isAdmin ? VerificationStatus.VERIFIED : VerificationStatus.PENDING)
                    .verifiedBy(isObserver || isAdmin ? user : null)
                    .verifiedAt(isObserver || isAdmin ? LocalDateTime.now() : null)
                    .build();
            evidenceRepo.save(ev);
        }

        // Advance Dispute status logically
        if (dispute.getStatus() == DisputeStatus.OPEN ||
                dispute.getStatus() == DisputeStatus.WAITING_FOR_FARMER ||
                dispute.getStatus() == DisputeStatus.WAITING_FOR_BUYER ||
                dispute.getStatus() == DisputeStatus.WAITING_FOR_OBSERVER) {
            dispute.setStatus(DisputeStatus.UNDER_REVIEW);
            disputeRepo.save(dispute);
        }

        // Audit Trail Event
        stateMachine.recordEvent(deal.getId(), "DISPUTE_RESPONSE_ADDED", userId, userRole,
                user.getName() + " (" + userRole + ") added " + type.name().toLowerCase() + " to Dispute #" + dispute.getId(), null);

        // Notifications
        if (isFarmer && deal.getBuyer() != null) {
            notificationService.createNotification(deal.getBuyer().getId(), NotificationType.DISPUTE_UPDATE,
                    "Farmer Responded to Dispute",
                    user.getName() + " provided a response on Dispute #" + disputeId,
                    dispute.getId(), "DISPUTE");
        } else if (isBuyer && deal.getFarmer() != null) {
            notificationService.createNotification(deal.getFarmer().getId(), NotificationType.DISPUTE_UPDATE,
                    "Buyer Responded to Dispute",
                    user.getName() + " submitted a response on Dispute #" + disputeId,
                    dispute.getId(), "DISPUTE");
        }

        return response;
    }

    // ─────────────────────────────────────────────────────────────
    // OBSERVER ASSIGNMENT
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public ObserverAssignment assignObserver(Long adminId, Long disputeId, Long observerId, String notes) {
        User admin = validateActiveUser(adminId);
        if (admin.getRole() != User.Role.ADMIN) {
            throw new BadRequestException("Only administrators can assign an observer");
        }

        Dispute dispute = disputeRepo.findById(disputeId)
                .orElseThrow(() -> new BadRequestException("Dispute not found with ID: " + disputeId));
        Deal deal = dealRepo.findById(dispute.getDealId())
                .orElseThrow(() -> new BadRequestException("Deal not found with ID: " + dispute.getDealId()));

        User observer = userRepo.findById(observerId)
                .orElseThrow(() -> new BadRequestException("Observer user not found with ID: " + observerId));
        if (observer.getRole() != User.Role.OBSERVER && observer.getRole() != User.Role.ADMIN) {
            throw new BadRequestException("Selected user is not an authorized observer");
        }

        dispute.setAssignedObserver(observer);
        dispute.setStatus(DisputeStatus.WAITING_FOR_OBSERVER);
        disputeRepo.save(dispute);

        ObserverAssignment assignment = ObserverAssignment.builder()
                .dispute(dispute)
                .dealId(deal.getId())
                .observer(observer)
                .assignedBy(admin)
                .notes(notes)
                .status(ObserverAssignment.AssignmentStatus.ASSIGNED)
                .build();
        assignment = observerAssignmentRepo.save(assignment);

        // Record response
        DisputeResponse adminResponse = DisputeResponse.builder()
                .dispute(dispute)
                .user(admin)
                .userRole("ADMIN")
                .message("Assigned authorized observer " + observer.getName() + " to inspect evidence. " + (notes != null ? notes : ""))
                .responseType(DisputeResponse.ResponseType.ADMIN_NOTE)
                .build();
        disputeResponseRepo.save(adminResponse);

        // Audit Trail Event
        stateMachine.recordEvent(deal.getId(), "OBSERVER_ASSIGNED", adminId, "ADMIN",
                "Admin (" + admin.getName() + ") assigned Observer " + observer.getName() + " to Dispute #" + disputeId, null);

        // Notifications
        notificationService.createNotification(observerId, NotificationType.OBSERVER_ASSIGNED,
                "New Inspection Assignment",
                "You have been assigned to verify Dispute #" + disputeId + " for Deal #" + deal.getId() + ".",
                dispute.getId(), "DISPUTE");

        if (deal.getFarmer() != null) {
            notificationService.createNotification(deal.getFarmer().getId(), NotificationType.OBSERVER_ASSIGNED,
                    "Field Observer Assigned",
                    "Authorized Observer " + observer.getName() + " has been assigned to inspect and verify Dispute #" + disputeId,
                    dispute.getId(), "DISPUTE");
        }
        if (deal.getBuyer() != null) {
            notificationService.createNotification(deal.getBuyer().getId(), NotificationType.OBSERVER_ASSIGNED,
                    "Field Observer Assigned",
                    "Authorized Observer " + observer.getName() + " has been assigned to inspect and verify Dispute #" + disputeId,
                    dispute.getId(), "DISPUTE");
        }

        return assignment;
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN DISPUTE RESOLUTION (INCLUDING PARTIAL SETTLEMENT)
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public Dispute resolveDispute(Long adminId, Long disputeId, String resolutionTypeStr,
                                  String resolutionNotes, Integer acceptedQuantity,
                                  Integer disputedQuantity, Double adjustmentAmount,
                                  Boolean returnDisputedToStock) {
        User admin = validateActiveUser(adminId);
        if (admin.getRole() != User.Role.ADMIN) {
            throw new BadRequestException("Only administrators can resolve disputes");
        }

        Dispute dispute = disputeRepo.findById(disputeId)
                .orElseThrow(() -> new BadRequestException("Dispute not found with ID: " + disputeId));
        Long targetDealId = dispute.getDealId();
        Deal deal = dealRepo.findById(targetDealId)
                .orElseThrow(() -> new BadRequestException("Deal not found with ID: " + targetDealId));

        dispute.setResolvedBy(admin);
        dispute.setResolvedAt(LocalDateTime.now());
        dispute.setResolutionNotes(resolutionNotes);
        dispute.setResolutionType(resolutionTypeStr);

        int origQty = dispute.getOriginalQuantity() != null ? dispute.getOriginalQuantity() : (deal.getQuantity() != null ? deal.getQuantity() : 0);
        int accQty = acceptedQuantity != null ? acceptedQuantity : origQty;
        int dispQty = disputedQuantity != null ? disputedQuantity : (origQty - accQty);

        dispute.setAcceptedQuantity(accQty);
        dispute.setDisputedQuantity(dispQty);
        dispute.setAdjustmentAmount(adjustmentAmount);

        String upperType = resolutionTypeStr != null ? resolutionTypeStr.toUpperCase() : "RESOLVED";

        if ("PARTIAL_SETTLEMENT".equals(upperType) || "PARTIAL".equals(upperType)) {
            dispute.setStatus(DisputeStatus.PARTIALLY_RESOLVED);
            stateMachine.transitionTo(deal.getId(), Deal.DealStatus.COMPLETED);
            dealService.finalizePartialQuantity(deal, accQty, dispQty, Boolean.TRUE.equals(returnDisputedToStock));
        } else if ("ACCEPT_BUYER".equals(upperType) || "FULL_BUYER".equals(upperType)) {
            dispute.setStatus(DisputeStatus.RESOLVED);
            // Complete buyer win: cancel deal and restore stock or release reservation
            stateMachine.transitionTo(deal.getId(), Deal.DealStatus.CANCELLED);
            dealService.restoreQuantity(deal);
        } else if ("ACCEPT_FARMER".equals(upperType) || "FULL_FARMER".equals(upperType)) {
            dispute.setStatus(DisputeStatus.RESOLVED);
            // Complete farmer win: deal accepted in full and completed
            stateMachine.transitionTo(deal.getId(), Deal.DealStatus.COMPLETED);
            dealService.finalizeSoldQuantity(deal);
        } else if ("REJECTED".equals(upperType)) {
            dispute.setStatus(DisputeStatus.REJECTED);
            // Revert back from DISPUTED to COMPLETED if already delivered
            stateMachine.transitionTo(deal.getId(), Deal.DealStatus.COMPLETED);
            dealService.finalizeSoldQuantity(deal);
        } else if ("ESCALATED".equals(upperType)) {
            dispute.setStatus(DisputeStatus.ESCALATED);
        } else {
            dispute.setStatus(DisputeStatus.RESOLVED);
            stateMachine.transitionTo(deal.getId(), Deal.DealStatus.COMPLETED);
            dealService.finalizeSoldQuantity(deal);
        }

        dispute = disputeRepo.save(dispute);

        // Record resolution note in dispute thread
        String resolutionSummary = "Dispute resolved with decision: " + dispute.getStatus().name() +
                ". Decision: " + upperType + ". Accepted Qty: " + accQty + " kg, Disputed Qty: " + dispQty + " kg." +
                (adjustmentAmount != null ? " Adjustment amount: ₹" + adjustmentAmount + "." : "") +
                " Notes: " + (resolutionNotes != null ? resolutionNotes : "Case closed by administrator.");

        DisputeResponse resolutionResponse = DisputeResponse.builder()
                .dispute(dispute)
                .user(admin)
                .userRole("ADMIN")
                .message(resolutionSummary)
                .responseType(DisputeResponse.ResponseType.ADMIN_NOTE)
                .build();
        disputeResponseRepo.save(resolutionResponse);

        // Audit Trail Event
        stateMachine.recordEvent(deal.getId(), "DISPUTE_RESOLVED", adminId, "ADMIN",
                "Dispute #" + disputeId + " resolved: " + dispute.getStatus().name() + " (" + upperType + ")", null);

        // Notifications to Both Parties
        String notifTitle = "Dispute #" + disputeId + " Resolved (" + dispute.getStatus().name().replace('_', ' ') + ")";
        if (deal.getFarmer() != null) {
            notificationService.createNotification(deal.getFarmer().getId(), NotificationType.DISPUTE_RESOLVED,
                    notifTitle, resolutionSummary, dispute.getId(), "DISPUTE");
        }
        if (deal.getBuyer() != null) {
            notificationService.createNotification(deal.getBuyer().getId(), NotificationType.DISPUTE_RESOLVED,
                    notifTitle, resolutionSummary, dispute.getId(), "DISPUTE");
        }

        return dispute;
    }

    @Transactional
    public Dispute requestAdditionalEvidence(Long adminId, Long disputeId, String targetRole, String notes) {
        User admin = validateActiveUser(adminId);
        if (admin.getRole() != User.Role.ADMIN) {
            throw new BadRequestException("Only administrators can request additional evidence");
        }

        Dispute dispute = disputeRepo.findById(disputeId)
                .orElseThrow(() -> new BadRequestException("Dispute not found with ID: " + disputeId));
        Long targetDealId = dispute.getDealId();
        Deal deal = dealRepo.findById(targetDealId)
                .orElseThrow(() -> new BadRequestException("Deal not found with ID: " + targetDealId));

        if ("FARMER".equalsIgnoreCase(targetRole)) {
            dispute.setStatus(DisputeStatus.WAITING_FOR_FARMER);
        } else if ("BUYER".equalsIgnoreCase(targetRole)) {
            dispute.setStatus(DisputeStatus.WAITING_FOR_BUYER);
        } else {
            dispute.setStatus(DisputeStatus.ADDITIONAL_EVIDENCE_REQUIRED);
        }
        dispute = disputeRepo.save(dispute);

        DisputeResponse adminResponse = DisputeResponse.builder()
                .dispute(dispute)
                .user(admin)
                .userRole("ADMIN")
                .message("Additional evidence requested from " + (targetRole != null ? targetRole.toUpperCase() : "parties") + ": " + (notes != null ? notes : ""))
                .responseType(DisputeResponse.ResponseType.ADMIN_NOTE)
                .build();
        disputeResponseRepo.save(adminResponse);

        // Audit Trail Event
        stateMachine.recordEvent(deal.getId(), "ADDITIONAL_EVIDENCE_REQUESTED", adminId, "ADMIN",
                "Admin requested additional evidence from " + targetRole + ": " + (notes != null ? notes : ""), null);

        // Targeted Notification
        if ("FARMER".equalsIgnoreCase(targetRole) && deal.getFarmer() != null) {
            notificationService.createNotification(deal.getFarmer().getId(), NotificationType.DISPUTE_UPDATE,
                    "Additional Evidence Requested",
                    "Admin requested more photographs/details for Dispute #" + disputeId + ": " + notes,
                    dispute.getId(), "DISPUTE");
        } else if ("BUYER".equalsIgnoreCase(targetRole) && deal.getBuyer() != null) {
            notificationService.createNotification(deal.getBuyer().getId(), NotificationType.DISPUTE_UPDATE,
                    "Additional Evidence Requested",
                    "Admin requested more photographs/details for Dispute #" + disputeId + ": " + notes,
                    dispute.getId(), "DISPUTE");
        }

        return dispute;
    }

    // ─────────────────────────────────────────────────────────────
    // QUERY METHODS WITH STRICT RBAC & MAP CONVERSION
    // ─────────────────────────────────────────────────────────────

    public Map<String, Object> getDisputeDetails(Long disputeId, Long userId) {
        User user = validateActiveUser(userId);
        Dispute dispute = disputeRepo.findById(disputeId)
                .orElseThrow(() -> new BadRequestException("Dispute not found with ID: " + disputeId));
        Deal deal = dealRepo.findById(dispute.getDealId())
                .orElseThrow(() -> new BadRequestException("Deal not found with ID: " + dispute.getDealId()));

        boolean isFarmer = deal.getFarmer() != null && deal.getFarmer().getId().equals(userId);
        boolean isBuyer = deal.getBuyer() != null && deal.getBuyer().getId().equals(userId);
        boolean isObserver = user.getRole() == User.Role.OBSERVER;
        boolean isAdmin = user.getRole() == User.Role.ADMIN;

        if (!isFarmer && !isBuyer && !isObserver && !isAdmin) {
            throw new BadRequestException("Access denied: You do not have permission to view Dispute #" + disputeId);
        }

        List<DisputeResponse> responses = disputeResponseRepo.findByDisputeIdOrderByCreatedAtAsc(disputeId);
        List<Evidence> dealEvidence = evidenceRepo.findByDealIdOrderByCreatedAtAsc(deal.getId());

        Map<String, Object> map = disputeToMap(dispute);
        map.put("deal", dealService.toDealResponse(deal));
        map.put("responses", responses.stream().map(this::disputeResponseToMap).toList());
        map.put("evidence", dealEvidence.stream().map(this::evidenceToMap).toList());
        return map;
    }

    public List<Map<String, Object>> getDisputesForDeal(Long dealId, Long userId) {
        User user = validateActiveUser(userId);
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new BadRequestException("Deal not found with ID: " + dealId));

        boolean isFarmer = deal.getFarmer() != null && deal.getFarmer().getId().equals(userId);
        boolean isBuyer = deal.getBuyer() != null && deal.getBuyer().getId().equals(userId);
        boolean isObserver = user.getRole() == User.Role.OBSERVER;
        boolean isAdmin = user.getRole() == User.Role.ADMIN;

        if (!isFarmer && !isBuyer && !isObserver && !isAdmin) {
            throw new BadRequestException("Access denied: You do not have permission to view disputes for this deal");
        }

        return disputeRepo.findByDealIdOrderByCreatedAtDesc(dealId).stream()
                .map(this::disputeToMap).toList();
    }

    public List<Map<String, Object>> getAllDisputesForAdmin(String statusStr) {
        List<Dispute> disputes;
        if (statusStr != null && !statusStr.isBlank() && !"ALL".equalsIgnoreCase(statusStr)) {
            try {
                DisputeStatus status = DisputeStatus.valueOf(statusStr.toUpperCase());
                disputes = disputeRepo.findByStatusOrderByCreatedAtDesc(status);
            } catch (Exception e) {
                disputes = disputeRepo.findAllByOrderByCreatedAtDesc();
            }
        } else {
            disputes = disputeRepo.findAllByOrderByCreatedAtDesc();
        }

        return disputes.stream().map(d -> {
            Map<String, Object> m = disputeToMap(d);
            Deal deal = dealRepo.findById(d.getDealId()).orElse(null);
            if (deal != null) {
                m.put("dealStatus", deal.getStatus().name());
                m.put("produceName", deal.getProduce() != null ? deal.getProduce().getName() : "—");
                m.put("quantity", deal.getQuantity());
                m.put("unit", deal.getUnit());
                m.put("agreedPrice", deal.getAgreedPrice());
                m.put("farmerName", deal.getFarmer() != null ? deal.getFarmer().getName() : "—");
                m.put("buyerName", deal.getBuyer() != null ? deal.getBuyer().getName() : "—");
            }
            return m;
        }).toList();
    }

    public List<Map<String, Object>> getObserverAssignedCases(Long observerId) {
        User observer = validateActiveUser(observerId);
        if (observer.getRole() != User.Role.OBSERVER && observer.getRole() != User.Role.ADMIN) {
            throw new BadRequestException("Only authorized observers can access assigned verification cases");
        }

        List<ObserverAssignment> assignments = observerAssignmentRepo.findByObserverIdOrderByAssignedAtDesc(observerId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (ObserverAssignment a : assignments) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("assignmentId", a.getId());
            m.put("assignedAt", a.getAssignedAt());
            m.put("status", a.getStatus().name());
            m.put("notes", a.getNotes());
            if (a.getDispute() != null) {
                m.put("dispute", disputeToMap(a.getDispute()));
            }
            Deal deal = dealRepo.findById(a.getDealId()).orElse(null);
            if (deal != null) {
                m.put("deal", dealService.toDealResponse(deal));
            }
            result.add(m);
        }
        return result;
    }

    public List<Map<String, Object>> getAvailableObservers() {
        return userRepo.findAll().stream()
                .filter(u -> u.getRole() == User.Role.OBSERVER && (u.getStatus() == null || u.getStatus() == User.UserStatus.ACTIVE))
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("name", u.getName());
                    m.put("email", u.getEmail());
                    m.put("phone", u.getPhone());
                    m.put("location", u.getLocation());
                    return m;
                }).toList();
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS & SERIALIZATION
    // ─────────────────────────────────────────────────────────────

    public Map<String, Object> evidenceToMap(Evidence e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("dealId", e.getDealId());
        m.put("orderId", e.getOrderId());
        m.put("stage", e.getStage() != null ? e.getStage().name() : "");
        m.put("uploaderId", e.getUploader() != null ? e.getUploader().getId() : null);
        m.put("uploaderName", e.getUploader() != null ? e.getUploader().getName() : "");
        m.put("uploaderRole", e.getUploaderRole());
        m.put("imageUrl", e.getImageUrl());
        m.put("description", e.getDescription());
        m.put("verificationStatus", e.getVerificationStatus() != null ? e.getVerificationStatus().name() : "PENDING");
        m.put("verifiedById", e.getVerifiedBy() != null ? e.getVerifiedBy().getId() : null);
        m.put("verifiedByName", e.getVerifiedBy() != null ? e.getVerifiedBy().getName() : null);
        m.put("verifiedAt", e.getVerifiedAt());
        m.put("observerNotes", e.getObserverNotes());
        m.put("location", e.getLocation());
        m.put("latitude", e.getLatitude());
        m.put("longitude", e.getLongitude());
        m.put("lotQuantity", e.getLotQuantity());
        m.put("grade", e.getGrade());
        m.put("createdAt", e.getCreatedAt());
        return m;
    }

    public Map<String, Object> disputeToMap(Dispute d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("dealId", d.getDealId());
        m.put("orderId", d.getOrderId());
        m.put("raisedById", d.getRaisedBy() != null ? d.getRaisedBy().getId() : null);
        m.put("raisedByName", d.getRaisedBy() != null ? d.getRaisedBy().getName() : "Unknown");
        m.put("raisedByEmail", d.getRaisedBy() != null ? d.getRaisedBy().getEmail() : "");
        m.put("reason", d.getReason() != null ? d.getReason().name() : "");
        m.put("description", d.getDescription());
        m.put("status", d.getStatus() != null ? d.getStatus().name() : "OPEN");
        m.put("assignedObserverId", d.getAssignedObserver() != null ? d.getAssignedObserver().getId() : null);
        m.put("assignedObserverName", d.getAssignedObserver() != null ? d.getAssignedObserver().getName() : null);
        m.put("resolvedById", d.getResolvedBy() != null ? d.getResolvedBy().getId() : null);
        m.put("resolvedByName", d.getResolvedBy() != null ? d.getResolvedBy().getName() : null);
        m.put("resolutionNotes", d.getResolutionNotes());
        m.put("resolutionType", d.getResolutionType());
        m.put("originalQuantity", d.getOriginalQuantity());
        m.put("acceptedQuantity", d.getAcceptedQuantity());
        m.put("disputedQuantity", d.getDisputedQuantity());
        m.put("adjustmentAmount", d.getAdjustmentAmount());
        m.put("createdAt", d.getCreatedAt());
        m.put("updatedAt", d.getUpdatedAt());
        m.put("resolvedAt", d.getResolvedAt());
        return m;
    }

    public Map<String, Object> disputeResponseToMap(DisputeResponse r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("disputeId", r.getDispute() != null ? r.getDispute().getId() : null);
        m.put("userId", r.getUser() != null ? r.getUser().getId() : null);
        m.put("userName", r.getUser() != null ? r.getUser().getName() : "");
        m.put("userRole", r.getUserRole());
        m.put("message", r.getMessage());
        m.put("responseType", r.getResponseType() != null ? r.getResponseType().name() : "");
        m.put("evidenceUrl", r.getEvidenceUrl());
        m.put("createdAt", r.getCreatedAt());
        return m;
    }

    private User validateActiveUser(Long userId) {
        if (userId == null) {
            throw new BadRequestException("Authentication required");
        }
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found with ID: " + userId));
        if (user.getStatus() == User.UserStatus.SUSPENDED || user.getStatus() == User.UserStatus.DEACTIVATED || user.getStatus() == User.UserStatus.DELETED) {
            throw new BadRequestException("Your account is currently suspended or deactivated. Contact support.");
        }
        return user;
    }
}
