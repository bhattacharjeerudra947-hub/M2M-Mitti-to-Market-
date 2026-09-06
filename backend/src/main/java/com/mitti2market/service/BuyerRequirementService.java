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

    /** Create a new buyer requirement. */
    @Transactional
    public BuyerRequirement createRequirement(Long buyerId, Map<String, Object> body) {
        User buyer = users.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", buyerId));

        String crop = (String) body.get("crop");
        if (crop == null || crop.isBlank()) throw new BadRequestException("Crop is required");
        Integer quantity = body.get("quantity") != null ? Integer.valueOf(body.get("quantity").toString()) : null;
        if (quantity == null || quantity <= 0) throw new BadRequestException("Quantity must be greater than zero");

        BuyerRequirement req = BuyerRequirement.builder()
                .buyer(buyer)
                .crop(crop.trim())
                .quantity(quantity)
                .unit((String) body.getOrDefault("unit", "kg"))
                .minPrice(body.get("minPrice") != null ? Double.valueOf(body.get("minPrice").toString()) : null)
                .maxPrice(body.get("maxPrice") != null ? Double.valueOf(body.get("maxPrice").toString()) : null)
                .quality((String) body.getOrDefault("quality", ""))
                .requiredBy(body.get("requiredBy") != null ? LocalDate.parse(body.get("requiredBy").toString()) : null)
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

        return requirementRepo.save(req);
    }

    /** List the buyer's own requirements. */
    public List<BuyerRequirement> getMyRequirements(Long buyerId) {
        return requirementRepo.findByBuyerIdOrderByCreatedAtDesc(buyerId);
    }

    /** List open requirements, optionally filtered by crop. */
    public List<BuyerRequirement> getOpenRequirements(String crop) {
        if (crop != null && !crop.isBlank()) {
            return requirementRepo.findByStatusAndCropIgnoreCaseOrderByCreatedAtDesc(RequirementStatus.OPEN, crop.trim());
        }
        return requirementRepo.findByStatusOrderByCreatedAtDesc(RequirementStatus.OPEN);
    }

    /**
     * Match an open requirement against farmer produce supply.
     * Returns produce listings that could fulfil the requirement.
     */
    public List<Map<String, Object>> matchSupply(Long requirementId) {
        BuyerRequirement req = requirementRepo.findById(requirementId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement", "id", requirementId));

        List<Produce> candidates = produceRepo.findByNameContainingIgnoreCase(req.getCrop());
        List<Map<String, Object>> matches = new ArrayList<>();

        for (Produce p : candidates) {
            if (p.getStatus() != ProduceStatus.AVAILABLE && p.getStatus() != ProduceStatus.LOW_STOCK) continue;
            if (p.getQuantity() < req.getQuantity()) continue;

            Map<String, Object> match = new LinkedHashMap<>();
            match.put("produceId", p.getId());
            match.put("crop", p.getName());
            match.put("availableQuantity", p.getQuantity());
            match.put("unit", p.getUnit());
            match.put("pricePerUnit", p.getPricePerUnit());
            match.put("location", p.getLocation());
            match.put("farmerId", p.getFarmer().getId());
            match.put("farmerName", p.getFarmer().getName());
            match.put("farmerVerified", p.getFarmer().getVerified());
            match.put("imageUrl", p.getImageUrl());

            // Price compatibility
            boolean priceOk = true;
            String priceNote = "Within target price";
            if (req.getMaxPrice() != null && p.getPricePerUnit() > req.getMaxPrice()) {
                priceOk = false;
                priceNote = "Above your max price of ₹" + req.getMaxPrice();
            } else if (req.getMinPrice() != null && p.getPricePerUnit() < req.getMinPrice()) {
                priceNote = "Below your min price of ₹" + req.getMinPrice();
            }
            match.put("priceCompatible", priceOk);
            match.put("priceNote", priceNote);

            matches.add(match);
        }

        // Best matches first
        matches.sort((a, b) -> Boolean.compare(!(Boolean) b.get("priceCompatible"), !(Boolean) a.get("priceCompatible")));
        return matches;
    }

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
        return requirementRepo.save(req);
    }

    /** Safe response map — never exposes the buyer's full entity. */
    public Map<String, Object> toResponse(BuyerRequirement req) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", req.getId());
        map.put("buyerId", req.getBuyer().getId());
        map.put("buyerName", req.getBuyer().getName());
        map.put("crop", req.getCrop());
        map.put("quantity", req.getQuantity());
        map.put("unit", req.getUnit());
        map.put("minPrice", req.getMinPrice());
        map.put("maxPrice", req.getMaxPrice());
        map.put("quality", req.getQuality());
        map.put("requiredBy", req.getRequiredBy());
        map.put("deliveryLocation", req.getDeliveryLocation());
        map.put("transportPreference", req.getTransportPreference().name());
        map.put("notes", req.getNotes());
        map.put("status", req.getStatus().name());
        map.put("createdAt", req.getCreatedAt());
        return map;
    }
}