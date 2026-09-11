package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.model.BuyerRequirement.RequirementStatus;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.repository.BuyerRequirementRepository;
import com.mitti2market.repository.ProduceRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * Buyer Requirements — buyers post what they need and the system matches
 * farmer supply against open demand.
 */
@Service
@RequiredArgsConstructor
public class BuyerRequirementService {

    private final BuyerRequirementRepository requirementRepo;
    private final UserRepository users;
    private final ProduceRepository produceRepo;
    private final NotificationService notificationService;
    private final MatchingService matchingService;

    /** Create a new buyer requirement. */
    @Transactional
    public BuyerRequirement createRequirement(Long buyerId, Map<String, Object> body) {
        User buyer = users.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", buyerId));

        String crop = (String) body.get("crop");
        if (crop == null || crop.isBlank()) throw new BadRequestException("Crop is required");
        Integer quantity = body.get("quantity") != null ? Integer.valueOf(body.get("quantity").toString()) : null;
        if (quantity == null || quantity <= 0) throw new BadRequestException("Quantity must be greater than zero");

        // Empty/blank requiredBy must be treated as "not set", not parsed as a date.
        Object requiredByRaw = body.get("requiredBy");
        LocalDate requiredBy = (requiredByRaw != null && !requiredByRaw.toString().isBlank())
                ? LocalDate.parse(requiredByRaw.toString()) : null;

        BuyerRequirement req = BuyerRequirement.builder()
                .buyer(buyer)
                .crop(crop.trim())
                .quantity(quantity)
                .requiredQuantity(quantity)
                .fulfilledQuantity(0)
                .reservedQuantity(0)
                .remainingQuantity(quantity)
                .unit((String) body.getOrDefault("unit", "kg"))
                .minPrice(body.get("minPrice") != null ? Double.valueOf(body.get("minPrice").toString()) : null)
                .maxPrice(body.get("maxPrice") != null ? Double.valueOf(body.get("maxPrice").toString()) : null)
                .quality((String) body.getOrDefault("quality", ""))
                .requiredBy(requiredBy)
                .deliveryLocation((String) body.getOrDefault("deliveryLocation", ""))
                .notes((String) body.getOrDefault("notes", ""))
                .status(RequirementStatus.OPEN)
                .build();

        // Transport preference
        if (body.get("transportPreference") != null) {
            try {
                req.setTransportPreference(BuyerRequirement.TransportPreference.valueOf(
                        body.get("transportPreference").toString().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }

        BuyerRequirement saved = requirementRepo.save(req);
        // Two-way matching Trigger B: match existing active produce listings against this new requirement
        matchingService.matchRequirementAgainstProduces(saved);
        return saved;
    }

    /** List the buyer's own requirements. */
    public List<BuyerRequirement> getMyRequirements(Long buyerId) {
        return requirementRepo.findByBuyerIdOrderByCreatedAtDesc(buyerId);
    }

    public List<BuyerRequirement> getActiveRequirements(Long buyerId) {
        List<RequirementStatus> activeStatuses = List.of(
                RequirementStatus.OPEN,
                RequirementStatus.MATCHED,
                RequirementStatus.NEGOTIATING,
                RequirementStatus.PARTIALLY_FULFILLED
        );
        return requirementRepo.findByBuyerIdAndStatusInOrderByCreatedAtDesc(buyerId, activeStatuses);
    }

    public List<BuyerRequirement> getHistoryRequirements(Long buyerId) {
        List<RequirementStatus> activeStatuses = List.of(
                RequirementStatus.OPEN,
                RequirementStatus.MATCHED,
                RequirementStatus.NEGOTIATING,
                RequirementStatus.PARTIALLY_FULFILLED
        );
        return requirementRepo.findByBuyerIdAndStatusNotInOrderByCreatedAtDesc(buyerId, activeStatuses);
    }

    /** List open requirements, optionally filtered by crop. */
    public List<BuyerRequirement> getOpenRequirements(String crop) {
        List<RequirementStatus> openStatuses = List.of(
                RequirementStatus.OPEN,
                RequirementStatus.PARTIALLY_FULFILLED
        );
        if (crop != null && !crop.isBlank()) {
            return requirementRepo.findByStatusAndCropIgnoreCaseOrderByCreatedAtDesc(RequirementStatus.OPEN, crop.trim());
        }
        return requirementRepo.findByStatusInOrderByCreatedAtDesc(openStatuses);
    }

    /**
     * Match an open requirement against farmer produce supply.
     * Returns produce listings that could fulfil the requirement.
     */
    public List<Map<String, Object>> matchSupply(Long requirementId) {
        BuyerRequirement req = requirementRepo.findById(requirementId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement", "id", requirementId));

        List<Produce> allProduces = produceRepo.findAll();
        List<Map<String, Object>> matches = new ArrayList<>();

        int reqQty = req.getRemainingQuantity() != null ? req.getRemainingQuantity() :
                     (req.getRequiredQuantity() != null ? req.getRequiredQuantity() : req.getQuantity());

        for (Produce p : allProduces) {
            if (p.getStatus() != ProduceStatus.AVAILABLE && p.getStatus() != ProduceStatus.LOW_STOCK && p.getStatus() != ProduceStatus.PARTIALLY_SOLD) continue;
            if (p.getQuantity() == null || p.getQuantity() <= 0) continue;
            if (!com.mitti2market.util.CropNormalizer.matches(p.getName(), req.getCrop())) continue;

            Map<String, Object> match = new LinkedHashMap<>();
            match.put("produceId", p.getId());
            match.put("crop", p.getName());
            match.put("availableQuantity", p.getQuantity());
            match.put("unit", p.getUnit());
            match.put("pricePerUnit", p.getPricePerUnit());
            match.put("location", p.getLocation());
            if (p.getFarmer() != null) {
                match.put("farmerId", p.getFarmer().getId());
                match.put("farmerName", p.getFarmer().getName());
                match.put("farmerVerified", p.getFarmer().getVerified());
            } else {
                match.put("farmerId", null);
                match.put("farmerName", "Unknown Farmer");
                match.put("farmerVerified", false);
            }
            match.put("imageUrl", p.getImageUrl());

            // Quantity status
            boolean fullQuantity = p.getQuantity() >= reqQty;
            match.put("fullQuantity", fullQuantity);
            match.put("quantityNote", fullQuantity ? "Full requirement met" : "Partial supply (" + p.getQuantity() + " " + p.getUnit() + ")");

            // Price compatibility (with deterministic ±5% / ₹5 threshold)
            Double pPrice = p.getPricePerUnit();
            boolean priceOk = true;
            String priceNote = "Within target price";
            if (pPrice != null) {
                if (req.getMaxPrice() != null && pPrice > req.getMaxPrice()) {
                    double diff = pPrice - req.getMaxPrice();
                    double pctDiff = req.getMaxPrice() > 0 ? (diff / req.getMaxPrice()) * 100.0 : 0.0;
                    if (pctDiff <= 5.0 || diff <= 5.0) {
                        priceOk = true;
                        priceNote = "Negotiable (Within 5% / ₹5 of max budget)";
                    } else {
                        priceOk = false;
                        priceNote = "Above max price of ₹" + req.getMaxPrice();
                    }
                } else if (req.getMinPrice() != null && pPrice < req.getMinPrice()) {
                    priceNote = "Below min price of ₹" + req.getMinPrice();
                }
            }
            match.put("priceCompatible", priceOk);
            match.put("priceNote", priceNote);

            matches.add(match);
        }

        // Best matches first (price compatible and then full quantity)
        matches.sort((a, b) -> {
            int cmpPrice = Boolean.compare((Boolean) b.get("priceCompatible"), (Boolean) a.get("priceCompatible"));
            if (cmpPrice != 0) return cmpPrice;
            return Boolean.compare((Boolean) b.get("fullQuantity"), (Boolean) a.get("fullQuantity"));
        });
        return matches;
    }

    /**
     * Lifecycle: reserve requirement quantity when its deal is locked.
     * No-ops for deals not tied to a requirement.
     */
    @Transactional
    public void reserveForDeal(Deal deal) {
        BuyerRequirement req = deal.getBuyerRequirement();
        if (req == null || req.getId() == null || deal.getQuantity() == null) return;
        int remaining = remainingOf(req);
        if (deal.getQuantity() > remaining) {
            throw new BadRequestException("Requirement only needs " + remaining + " " +
                    (req.getUnit() != null ? req.getUnit() : "kg") + " more — cannot reserve " + deal.getQuantity());
        }
        req.setReservedQuantity(nz(req.getReservedQuantity()) + deal.getQuantity());
        if (req.getStatus() == RequirementStatus.OPEN || req.getStatus() == RequirementStatus.MATCHED) {
            req.setStatus(RequirementStatus.NEGOTIATING);
        }
        requirementRepo.save(req);
    }

    /**
     * Lifecycle: deal completed → move quantity from reserved to fulfilled.
     * Auto-FULFILLED when nothing remains. Notifies the buyer.
     */
    @Transactional
    public void fulfillForDeal(Deal deal) {
        BuyerRequirement req = deal.getBuyerRequirement();
        if (req == null || req.getId() == null || deal.getQuantity() == null) return;
        req = requirementRepo.findById(req.getId()).orElse(null);
        if (req == null) return;

        req.setFulfilledQuantity(nz(req.getFulfilledQuantity()) + deal.getQuantity());
        req.setReservedQuantity(Math.max(0, nz(req.getReservedQuantity()) - deal.getQuantity()));
        int required = req.getRequiredQuantity() != null ? req.getRequiredQuantity() : req.getQuantity();
        int fulfilled = nz(req.getFulfilledQuantity());
        req.setRemainingQuantity(Math.max(0, required - fulfilled));

        boolean wasFulfilled = req.getStatus() == RequirementStatus.FULFILLED;
        if (req.getRemainingQuantity() == 0) {
            req.setStatus(RequirementStatus.FULFILLED);
        } else if (req.getStatus() != RequirementStatus.FULFILLED) {
            req.setStatus(RequirementStatus.PARTIALLY_FULFILLED);
        }
        requirementRepo.save(req);

        if (!wasFulfilled) {
            boolean nowFulfilled = req.getStatus() == RequirementStatus.FULFILLED;
            notificationService.createNotification(req.getBuyer().getId(),
                    Notification.NotificationType.SYSTEM_ALERT,
                    nowFulfilled ? "Requirement Fulfilled!" : "Requirement Progress",
                    nowFulfilled
                        ? "Your requirement for " + required + " " + (req.getUnit() != null ? req.getUnit() : "kg") + " of " + req.getCrop() + " is now fully fulfilled."
                        : req.getCrop() + " requirement: " + fulfilled + "/" + required + " " + (req.getUnit() != null ? req.getUnit() : "kg") + " fulfilled.");
        }
    }

    /**
     * Lifecycle: deal cancelled → release the reserved requirement quantity.
     * Re-opens FULFILLED requirements when appropriate.
     */
    @Transactional
    public void releaseForDeal(Deal deal) {
        BuyerRequirement req = deal.getBuyerRequirement();
        if (req == null || req.getId() == null || deal.getQuantity() == null) return;
        req = requirementRepo.findById(req.getId()).orElse(null);
        if (req == null) return;

        req.setReservedQuantity(Math.max(0, nz(req.getReservedQuantity()) - deal.getQuantity()));
        int required = req.getRequiredQuantity() != null ? req.getRequiredQuantity() : req.getQuantity();
        int fulfilled = nz(req.getFulfilledQuantity());
        req.setRemainingQuantity(Math.max(0, required - fulfilled));

        // Re-derive an active status after release (unless the buyer cancelled/removed it)
        if (req.getStatus() != RequirementStatus.CANCELLED && req.getStatus() != RequirementStatus.ADMIN_REMOVED
                && req.getStatus() != RequirementStatus.EXPIRED) {
            if (req.getStatus() == RequirementStatus.FULFILLED && req.getRemainingQuantity() > 0) {
                req.setStatus(RequirementStatus.PARTIALLY_FULFILLED);
            } else if (req.getStatus() == RequirementStatus.NEGOTIATING && req.getReservedQuantity() == 0
                    && fulfilled == 0) {
                req.setStatus(RequirementStatus.OPEN);
            }
        }
        requirementRepo.save(req);
    }

    private int remainingOf(BuyerRequirement req) {
        int required = req.getRequiredQuantity() != null ? req.getRequiredQuantity() : req.getQuantity();
        int committed = Math.max(nz(req.getFulfilledQuantity()), nz(req.getReservedQuantity()));
        return Math.max(0, required - committed);
    }

    private int nz(Integer v) { return v != null ? v : 0; }

    /** Update requirement status (buyer owns it; OPEN→CANCELLED/FULFILLED etc.). */
    @Transactional
    public BuyerRequirement updateStatus(Long userId, Long requirementId, String status) {
        BuyerRequirement req = requirementRepo.findById(requirementId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement", "id", requirementId));

        if (!req.getBuyer().getId().equals(userId)) {
            throw new BadRequestException("You can only update your own requirements");
        }

        RequirementStatus newStatus;
        try {
            newStatus = RequirementStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: " + status);
        }

        req.setStatus(newStatus);
        BuyerRequirement saved = requirementRepo.save(req);
        matchingService.handleRequirementStatusChange(saved);
        return saved;
    }

    /** Safe response map — never exposes the buyer's full entity. */
    public Map<String, Object> toResponse(BuyerRequirement req) {
        int required = req.getRequiredQuantity() != null ? req.getRequiredQuantity() : req.getQuantity();
        int fulfilled = req.getFulfilledQuantity() != null ? req.getFulfilledQuantity() : 0;
        int remaining = req.getRemainingQuantity() != null ? req.getRemainingQuantity() : Math.max(0, required - fulfilled);

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", req.getId());
        map.put("buyerId", req.getBuyer().getId());
        map.put("buyerName", req.getBuyer().getName());
        map.put("crop", req.getCrop());
        map.put("quantity", req.getQuantity());
        map.put("requiredQuantity", required);
        map.put("fulfilledQuantity", fulfilled);
        map.put("remainingQuantity", remaining);
        map.put("unit", req.getUnit());
        map.put("minPrice", req.getMinPrice());
        map.put("maxPrice", req.getMaxPrice());
        map.put("quality", req.getQuality());
        map.put("requiredBy", req.getRequiredBy());
        map.put("deliveryLocation", req.getDeliveryLocation());
        map.put("transportPreference", req.getTransportPreference().name());
        map.put("notes", req.getNotes());
        map.put("status", req.getStatus().name());
        map.put("adminRemovalReason", req.getAdminRemovalReason());
        map.put("createdAt", req.getCreatedAt());
        return map;
    }
}