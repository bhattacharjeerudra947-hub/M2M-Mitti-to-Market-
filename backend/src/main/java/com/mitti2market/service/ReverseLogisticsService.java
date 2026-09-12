package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class ReverseLogisticsService {

    private final ReverseLogisticsRepository reverseRepo;
    private final ReturnInspectionRepository inspectionRepo;
    private final DealRepository dealRepo;
    private final UserRepository userRepo;
    private final WarehouseHubRepository hubRepo;
    private final WarehouseHubService hubService;
    private final InventoryLotService lotService;
    private final EvidenceRepository evidenceRepo;
    private final NotificationService notificationService;
    private final LogisticsCostService costService;

    private final AtomicLong reverseSeq = new AtomicLong(100);

    /**
     * Algorithmic reverse destination optimization.
     * Evaluates road distance, hub capacity, crop compatibility, and produce condition
     * to recommend the optimal return destination rather than blindly hauling back to farmer.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> optimizeReverseDestination(
            double buyerLat, double buyerLng, String buyerAddress,
            double farmerLat, double farmerLng, String farmerAddress,
            String cropName, double returnQuantityKg
    ) {
        double farmerDistanceKm = RouteService.haversineKm(buyerLat, buyerLng, farmerLat, farmerLng);
        farmerDistanceKm = Math.round(farmerDistanceKm * 10.0) / 10.0;

        List<Map<String, Object>> candidateHubs = hubService.findSuitableHubs(buyerLat, buyerLng, cropName, returnQuantityKg);

        Map<String, Object> bestHub = null;
        for (Map<String, Object> h : candidateHubs) {
            if ((boolean) h.get("eligible")) {
                bestHub = h;
                break;
            }
        }

        Map<String, Object> recommendation = new LinkedHashMap<>();
        recommendation.put("farmerDistanceKm", farmerDistanceKm);
        recommendation.put("candidateHubs", candidateHubs);

        if (bestHub != null) {
            double hubDistKm = (Double) bestHub.get("distanceKm");
            recommendation.put("nearestEligibleHub", bestHub);
            recommendation.put("hubDistanceKm", hubDistKm);

            // Decision threshold: If hub is significantly closer than farmer, or farmer > 80km and hub < 60km
            if (hubDistKm < farmerDistanceKm * 0.7 || (farmerDistanceKm > 80.0 && hubDistKm < 60.0)) {
                recommendation.put("recommendedType", ReverseLogistics.DestinationType.NEAREST_HUB.name());
                recommendation.put("recommendedHubId", bestHub.get("id"));
                recommendation.put("recommendedDestinationName", bestHub.get("name"));
                recommendation.put("recommendedAddress", bestHub.get("address"));
                recommendation.put("recommendedLatitude", bestHub.get("latitude"));
                recommendation.put("recommendedLongitude", bestHub.get("longitude"));
                recommendation.put("distanceKm", hubDistKm);
                recommendation.put("distanceSavedKm", Math.round((farmerDistanceKm - hubDistKm) * 10.0) / 10.0);
                recommendation.put("rationale", bestHub.get("name") + " is only " + hubDistKm + " km away with "
                        + bestHub.get("availableCapacityKg") + " kg capacity (saves "
                        + (Math.round((farmerDistanceKm - hubDistKm) * 10.0) / 10.0) + " km vs hauling back to farmer). "
                        + "Staging here prevents perishability loss and allows quick inspection or local secondary sale.");
                recommendation.put("estimatedCost", Math.round(hubDistKm * 25.0)); // estimated truck haul
                return recommendation;
            }
        }

        // Default to Farmer if farmer is close or no suitable hub
        recommendation.put("recommendedType", ReverseLogistics.DestinationType.FARMER.name());
        recommendation.put("recommendedHubId", null);
        recommendation.put("recommendedDestinationName", "Farmer Return (" + farmerAddress + ")");
        recommendation.put("recommendedAddress", farmerAddress);
        recommendation.put("recommendedLatitude", farmerLat);
        recommendation.put("recommendedLongitude", farmerLng);
        recommendation.put("distanceKm", farmerDistanceKm);
        recommendation.put("distanceSavedKm", 0.0);
        recommendation.put("rationale", "Direct return to farmer (" + farmerDistanceKm
                + " km) is the most direct solution for this shipment.");
        recommendation.put("estimatedCost", Math.round(farmerDistanceKm * 25.0));
        return recommendation;
    }

    /**
     * Buyer initiates a return / reverse logistics request.
     */
    @Transactional
    public ReverseLogistics requestReturn(
            Long dealId,
            Long buyerId,
            ReverseLogistics.ReturnReason reason,
            Double returnQuantityKg,
            String rejectionNotes,
            String evidenceImageUrl
    ) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));

        if (!deal.getBuyer().getId().equals(buyerId)) {
            throw new BadRequestException("Only the buyer who received this deal can request reverse logistics");
        }

        if (returnQuantityKg == null || returnQuantityKg <= 0) {
            throw new BadRequestException("Return quantity must be greater than zero");
        }
        if (returnQuantityKg > deal.getQuantity()) {
            throw new BadRequestException("Return quantity cannot exceed original deal quantity (" + deal.getQuantity() + ")");
        }

        User buyer = deal.getBuyer();
        User farmer = deal.getFarmer();

        double buyerLat = deal.getDeliveryLatitude() != null ? deal.getDeliveryLatitude()
                : (buyer.getLatitude() != null ? buyer.getLatitude() : 18.5204);
        double buyerLng = deal.getDeliveryLongitude() != null ? deal.getDeliveryLongitude()
                : (buyer.getLongitude() != null ? buyer.getLongitude() : 73.8567);
        double farmerLat = deal.getPickupLatitude() != null ? deal.getPickupLatitude()
                : (farmer.getLatitude() != null ? farmer.getLatitude() : 19.9975);
        double farmerLng = deal.getPickupLongitude() != null ? deal.getPickupLongitude()
                : (farmer.getLongitude() != null ? farmer.getLongitude() : 73.7898);

        // Run reverse optimization
        Map<String, Object> opt = optimizeReverseDestination(
                buyerLat, buyerLng, deal.getDeliveryLocation() != null ? deal.getDeliveryLocation() : buyer.getLocation(),
                farmerLat, farmerLng, deal.getPickupLocation() != null ? deal.getPickupLocation() : farmer.getLocation(),
                deal.getCropName(), returnQuantityKg
        );

        WarehouseHub assignedHub = null;
        if (opt.get("recommendedHubId") != null) {
            assignedHub = hubRepo.findById((Long) opt.get("recommendedHubId")).orElse(null);
        }

        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String revTrkId = "M2M-REV-" + dateStr + "-" + reverseSeq.incrementAndGet();

        ReverseLogistics rev = ReverseLogistics.builder()
                .reverseTrackingId(revTrkId)
                .dealId(dealId)
                .buyer(buyer)
                .farmer(farmer)
                .assignedHub(assignedHub)
                .returnReason(reason)
                .returnQuantityKg(returnQuantityKg)
                .rejectionNotes(rejectionNotes)
                .pickupAddress(deal.getDeliveryLocation() != null ? deal.getDeliveryLocation() : buyer.getLocation())
                .pickupLatitude(buyerLat)
                .pickupLongitude(buyerLng)
                .destinationType(ReverseLogistics.DestinationType.valueOf((String) opt.get("recommendedType")))
                .destinationAddress((String) opt.get("recommendedAddress"))
                .destinationLatitude((Double) opt.get("recommendedLatitude"))
                .destinationLongitude((Double) opt.get("recommendedLongitude"))
                .routeDistanceKm((Double) opt.get("distanceKm"))
                .routeEstimatedCost(((Number) opt.get("estimatedCost")).doubleValue())
                .optimizationRationale((String) opt.get("rationale"))
                .status(ReverseLogistics.ReverseStatus.RETURN_REQUESTED)
                .requestedAt(LocalDateTime.now())
                .build();

        rev = reverseRepo.save(rev);

        // Record return photo evidence if provided
        if (evidenceImageUrl != null && !evidenceImageUrl.isBlank()) {
            Evidence ev = Evidence.builder()
                    .dealId(dealId)
                    .reverseLogisticsId(rev.getId())
                    .stage(Evidence.EvidenceStage.RETURN_PICKUP)
                    .uploader(buyer)
                    .uploaderRole("BUYER")
                    .imageUrl(evidenceImageUrl)
                    .lotQuantity(returnQuantityKg)
                    .location(rev.getPickupAddress())
                    .latitude(buyerLat)
                    .longitude(buyerLng)
                    .description("Reverse Logistics Pickup Photo: " + reason + " (" + returnQuantityKg + " kg)")
                    .verificationStatus(Evidence.VerificationStatus.PENDING)
                    .build();
            evidenceRepo.save(ev);
        }

        // Notify farmer and admin
        notificationService.createNotification(
                farmer.getId(),
                Notification.NotificationType.REVERSE_LOGISTICS_REQUESTED,
                "Return Request Initiated",
                "Buyer requested return of " + returnQuantityKg + " kg from Deal #" + deal.getDealId() + " (" + reason + "). Destination: " + rev.getDestinationType() + "."
        );

        return rev;
    }

    /**
     * Admin or Hub approves return and dispatches reverse transport.
     */
    @Transactional
    public ReverseLogistics approveReturn(Long reverseId, Long actorId, Long hubIdOverride) {
        ReverseLogistics rev = reverseRepo.findById(reverseId)
                .orElseThrow(() -> new ResourceNotFoundException("ReverseLogistics", "id", reverseId));

        if (hubIdOverride != null) {
            WarehouseHub hub = hubService.getHubById(hubIdOverride);
            rev.setAssignedHub(hub);
            rev.setDestinationType(ReverseLogistics.DestinationType.NEAREST_HUB);
            rev.setDestinationAddress(hub.getAddress() != null ? hub.getAddress() : hub.getName());
            rev.setDestinationLatitude(hub.getLatitude());
            rev.setDestinationLongitude(hub.getLongitude());
        }

        rev.setStatus(ReverseLogistics.ReverseStatus.RETURN_APPROVED);
        rev.setApprovedAt(LocalDateTime.now());

        // If routed to a hub, reserve staging capacity
        if (rev.getAssignedHub() != null) {
            hubService.reserveCapacity(rev.getAssignedHub().getId(), rev.getReturnQuantityKg());
        }

        rev = reverseRepo.save(rev);

        notificationService.createNotification(
                rev.getBuyer().getId(),
                Notification.NotificationType.REVERSE_LOGISTICS_APPROVED,
                "Return Approved",
                "Reverse pickup scheduled for " + rev.getReturnQuantityKg() + " kg (Tracking: " + rev.getReverseTrackingId() + ")."
        );

        return rev;
    }

    /**
     * Advance reverse logistics lifecycle status.
     */
    @Transactional
    public ReverseLogistics updateReverseStatus(Long reverseId, Long actorId, ReverseLogistics.ReverseStatus newStatus) {
        ReverseLogistics rev = reverseRepo.findById(reverseId)
                .orElseThrow(() -> new ResourceNotFoundException("ReverseLogistics", "id", reverseId));

        rev.setStatus(newStatus);
        if (newStatus == ReverseLogistics.ReverseStatus.IN_TRANSIT && rev.getPickedUpAt() == null) {
            rev.setPickedUpAt(LocalDateTime.now());
        }
        if (newStatus == ReverseLogistics.ReverseStatus.RECEIVED_AT_HUB) {
            rev.setReceivedAtHubAt(LocalDateTime.now());
            rev.setStatus(ReverseLogistics.ReverseStatus.INSPECTION_PENDING);
        }
        if (newStatus == ReverseLogistics.ReverseStatus.RETURNED_TO_FARMER || newStatus == ReverseLogistics.ReverseStatus.RESOLVED) {
            rev.setResolvedAt(LocalDateTime.now());
        }

        return reverseRepo.save(rev);
    }

    /**
     * Hub Operator or Observer conducts inspection on returned produce at the hub.
     */
    @Transactional
    public ReturnInspection submitInspection(
            Long reverseId,
            Long inspectorId,
            Double verifiedQtyKg,
            ReturnInspection.ProduceCondition condition,
            ReturnInspection.InspectionDecision decision,
            String decisionNotes,
            Double discountedPricePerKg,
            String redirectionTarget,
            String evidenceImageUrl
    ) {
        ReverseLogistics rev = reverseRepo.findById(reverseId)
                .orElseThrow(() -> new ResourceNotFoundException("ReverseLogistics", "id", reverseId));
        User inspector = userRepo.findById(inspectorId).orElseThrow();

        if (verifiedQtyKg == null || verifiedQtyKg <= 0) {
            verifiedQtyKg = rev.getReturnQuantityKg();
        }

        ReturnInspection insp = ReturnInspection.builder()
                .reverseLogistics(rev)
                .inspectedBy(inspector)
                .inspectionDate(LocalDateTime.now())
                .verifiedQuantityKg(verifiedQtyKg)
                .produceCondition(condition)
                .decision(decision)
                .decisionNotes(decisionNotes)
                .disposalAuthorized(decision == ReturnInspection.InspectionDecision.AUTHORIZED_DISPOSAL)
                .discountedPricePerKg(discountedPricePerKg)
                .redirectionTarget(redirectionTarget)
                .build();

        insp = inspectionRepo.save(insp);

        // Execute Decision
        switch (decision) {
            case REDIRECT_TO_ALTERNATIVE_BUYER -> {
                rev.setStatus(ReverseLogistics.ReverseStatus.REDIRECTED);
                if (rev.getAssignedHub() != null) {
                    hubService.recordOutboundDispatched(rev.getAssignedHub().getId(), verifiedQtyKg);
                }
            }
            case DISCOUNTED_LOCAL_SALE -> {
                rev.setStatus(ReverseLogistics.ReverseStatus.RESOLVED);
                if (rev.getAssignedHub() != null) {
                    // Create lot in hub inventory for local clearance sale
                    Deal deal = dealRepo.findById(rev.getDealId()).orElse(null);
                    lotService.recordInbound(
                            rev.getAssignedHub().getId(),
                            inspectorId,
                            deal != null ? deal.getCropName() : "Produce",
                            "Clearance Grade",
                            verifiedQtyKg,
                            verifiedQtyKg,
                            InventoryLot.LotCondition.ACCEPTABLE,
                            InventoryLot.PackagingType.GUNNY_BAGS,
                            "Clearance Section",
                            rev.getDealId(),
                            rev.getOrderId(),
                            rev.getFarmer().getId(),
                            "Returned lot cleared for local sale: " + decisionNotes,
                            evidenceImageUrl
                    );
                }
            }
            case RETURN_TO_FARMER -> {
                rev.setStatus(ReverseLogistics.ReverseStatus.IN_TRANSIT);
                rev.setDestinationType(ReverseLogistics.DestinationType.FARMER);
                if (rev.getAssignedHub() != null) {
                    hubService.recordOutboundDispatched(rev.getAssignedHub().getId(), verifiedQtyKg);
                }
            }
            case AUTHORIZED_DISPOSAL -> {
                rev.setStatus(ReverseLogistics.ReverseStatus.RESOLVED);
                if (rev.getAssignedHub() != null) {
                    hubService.releaseCapacity(rev.getAssignedHub().getId(), verifiedQtyKg);
                }
            }
            case RESTORE_TO_HUB_INVENTORY -> {
                rev.setStatus(ReverseLogistics.ReverseStatus.RESOLVED);
                if (rev.getAssignedHub() != null) {
                    Deal deal = dealRepo.findById(rev.getDealId()).orElse(null);
                    lotService.recordInbound(
                            rev.getAssignedHub().getId(),
                            inspectorId,
                            deal != null ? deal.getCropName() : "Produce",
                            "Inspected Restored",
                            verifiedQtyKg,
                            verifiedQtyKg,
                            InventoryLot.LotCondition.GOOD,
                            InventoryLot.PackagingType.GUNNY_BAGS,
                            "General Staging",
                            rev.getDealId(),
                            rev.getOrderId(),
                            rev.getFarmer().getId(),
                            "Returned produce verified in good condition and restored to hub inventory",
                            evidenceImageUrl
                    );
                }
            }
        }

        rev.setResolvedAt(LocalDateTime.now());
        reverseRepo.save(rev);

        // Record inspection evidence
        if (evidenceImageUrl != null && !evidenceImageUrl.isBlank()) {
            Evidence ev = Evidence.builder()
                    .dealId(rev.getDealId())
                    .reverseLogisticsId(rev.getId())
                    .stage(Evidence.EvidenceStage.RETURN_INSPECTION)
                    .uploader(inspector)
                    .uploaderRole(inspector.getRole() != null ? inspector.getRole().name() : "HUB_OPERATOR")
                    .imageUrl(evidenceImageUrl)
                    .lotQuantity(verifiedQtyKg)
                    .description("Return Inspection: " + condition + " → " + decision)
                    .verificationStatus(Evidence.VerificationStatus.VERIFIED)
                    .verifiedBy(inspector)
                    .verifiedAt(LocalDateTime.now())
                    .observerNotes(decisionNotes)
                    .build();
            evidenceRepo.save(ev);
        }

        // Notify farmer and buyer
        notificationService.createNotification(
                rev.getFarmer().getId(),
                Notification.NotificationType.RETURN_INSPECTED,
                "Return Inspection Completed",
                "Reverse shipment " + rev.getReverseTrackingId() + " inspected: " + condition + ". Decision: " + decision + "."
        );
        notificationService.createNotification(
                rev.getBuyer().getId(),
                Notification.NotificationType.RETURN_INSPECTED,
                "Return Inspection Completed",
                "Reverse shipment " + rev.getReverseTrackingId() + " inspected: " + decision + "."
        );

        return insp;
    }

    @Transactional(readOnly = true)
    public List<ReverseLogistics> getReverseLogisticsByDeal(Long dealId) {
        return reverseRepo.findByDealIdOrderByCreatedAtDesc(dealId);
    }

    @Transactional(readOnly = true)
    public List<ReverseLogistics> getReverseLogisticsForUser(Long userId) {
        return reverseRepo.findByUserInvolved(userId);
    }

    @Transactional(readOnly = true)
    public List<ReverseLogistics> getAllForAdmin() {
        return reverseRepo.findAll();
    }

    @Transactional(readOnly = true)
    public ReverseLogistics getById(Long id) {
        return reverseRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReverseLogistics", "id", id));
    }

    @Transactional(readOnly = true)
    public Optional<ReturnInspection> getInspectionByReverseId(Long reverseId) {
        return inspectionRepo.findByReverseLogisticsId(reverseId);
    }
}
