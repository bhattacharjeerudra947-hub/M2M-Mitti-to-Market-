package com.mitti2market.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.model.BuyerMatch.MatchStatus;
import com.mitti2market.repository.BuyerMatchRepository;
import com.mitti2market.repository.BuyerRequirementRepository;
import com.mitti2market.repository.ProduceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Service managing BuyerMatch lifecycle and farmer deal initiation.
 *
 * Core rule: ONLY THE FARMER CAN INITIATE A DEAL.
 */
@Service
@RequiredArgsConstructor
public class BuyerMatchService {

    private final BuyerMatchRepository matchRepo;
    private final ProduceRepository produceRepo;
    private final BuyerRequirementRepository requirementRepo;
    private final MessageService messageService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Get matches for a farmer split by tab/filter.
     */
    public List<Map<String, Object>> getFarmerMatches(Long farmerId, String filter) {
        List<BuyerMatch> list;
        String f = filter != null ? filter.toLowerCase() : "all";

        switch (f) {
            case "new":
                list = matchRepo.findByFarmerIdAndStatusInOrderByCreatedAtDesc(
                        farmerId, List.of(MatchStatus.NEW));
                break;
            case "best":
                list = matchRepo.findByFarmerIdOrderByMatchScoreDesc(farmerId);
                // Filter out rejected / expired in best list
                list = list.stream().filter(m -> m.getStatus() != MatchStatus.REJECTED && m.getStatus() != MatchStatus.EXPIRED).toList();
                break;
            case "discussions":
                list = matchRepo.findByFarmerIdAndStatusInOrderByCreatedAtDesc(
                        farmerId, List.of(MatchStatus.DEAL_STARTED, MatchStatus.NEGOTIATING));
                break;
            case "locked":
                list = matchRepo.findByFarmerIdAndStatusInOrderByCreatedAtDesc(
                        farmerId, List.of(MatchStatus.DEAL_LOCKED));
                break;
            case "completed":
                list = matchRepo.findByFarmerIdAndStatusInOrderByCreatedAtDesc(
                        farmerId, List.of(MatchStatus.COMPLETED));
                break;
            default:
                list = matchRepo.findByFarmerIdOrderByCreatedAtDesc(farmerId);
                break;
        }

        return list.stream().map(this::toResponse).toList();
    }

    /**
     * Get a single match by ID.
     */
    public Map<String, Object> getMatch(Long matchId) {
        BuyerMatch match = matchRepo.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("BuyerMatch", "id", matchId));
        return toResponse(match);
    }

    /**
     * FARMER INITIATES THE DEAL.
     * Absolute Rule: Only the farmer can start a deal from a match.
     */
    @Transactional
    public Map<String, Object> startDeal(Long farmerId, Long matchId) {
        BuyerMatch match = matchRepo.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("BuyerMatch", "id", matchId));

        // Strict security enforcement: Only the farmer owner can start the deal
        if (!match.getFarmer().getId().equals(farmerId)) {
            throw new BadRequestException("ABSOLUTE RULE: Only the farmer can initiate the deal.");
        }

        Produce produce = match.getProduce();
        if (produce.getQuantity() == null || produce.getQuantity() <= 0) {
            throw new BadRequestException("This produce is no longer available.");
        }

        BuyerRequirement req = match.getBuyerRequirement();
        if (req.getStatus() == BuyerRequirement.RequirementStatus.FULFILLED ||
            req.getStatus() == BuyerRequirement.RequirementStatus.CANCELLED) {
            throw new BadRequestException("This buyer requirement is no longer active.");
        }

        // Establish conversation
        Long buyerId = match.getBuyer().getId();
        String convId = messageService.getOrCreateConversation(farmerId, buyerId, produce.getId());

        // Update match status
        match.setStatus(MatchStatus.DEAL_STARTED);
        match.setConversationId(convId);
        matchRepo.save(match);

        // Update requirement status if currently OPEN
        if (req.getStatus() == BuyerRequirement.RequirementStatus.OPEN ||
            req.getStatus() == BuyerRequirement.RequirementStatus.MATCHED) {
            req.setStatus(BuyerRequirement.RequirementStatus.NEGOTIATING);
            requirementRepo.save(req);
        }

        // Send opening message in Message Centre with product context
        String welcomeContent = "🤝 " + produce.getName() + " Deal Discussion Started\n\n" +
                "Produce: " + produce.getQuantity() + " " + produce.getUnit() + " available @ ₹" + produce.getPricePerUnit() + "/" + produce.getUnit() + "\n" +
                "Buyer Requirement: " + (req.getRemainingQuantity() != null ? req.getRemainingQuantity() : req.getQuantity()) + " " + req.getUnit() +
                (req.getMaxPrice() != null ? " (Budget: up to ₹" + req.getMaxPrice() + "/" + req.getUnit() + ")" : "") + "\n" +
                "AI Match Score: " + match.getMatchScore() + "%\n\n" +
                "Status: DEAL DISCUSSION\nBoth parties can chat and make offers.";

        messageService.sendMessage(farmerId, buyerId, welcomeContent, produce.getId());

        // Notify the BUYER that farmer has initiated the deal
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("matchId", match.getId());
        meta.put("produceId", produce.getId());
        meta.put("buyerRequirementId", req.getId());
        meta.put("conversationId", convId);
        meta.put("farmerId", farmerId);
        meta.put("farmerName", match.getFarmer().getName());

        String metaJson;
        try {
            metaJson = objectMapper.writeValueAsString(meta);
        } catch (Exception e) {
            metaJson = "{}";
        }

        notificationService.createNotification(
                buyerId,
                Notification.NotificationType.DEAL_STARTED,
                "Deal Initiated: " + produce.getName(),
                match.getFarmer().getName() + " has initiated a deal for " + produce.getName() + ". Click to negotiate in Message Centre.",
                match.getId(),
                "MATCH",
                metaJson
        );

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("matchId", match.getId());
        resp.put("conversationId", convId);
        resp.put("buyerId", buyerId);
        resp.put("buyerName", match.getBuyer().getName());
        resp.put("produceId", produce.getId());
        resp.put("produceName", produce.getName());
        resp.put("status", match.getStatus().name());
        return resp;
    }

    /**
     * Mark match as viewed by farmer.
     */
    @Transactional
    public void markViewed(Long farmerId, Long matchId) {
        BuyerMatch match = matchRepo.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("BuyerMatch", "id", matchId));

        if (match.getFarmer().getId().equals(farmerId) && match.getStatus() == MatchStatus.NEW) {
            match.setStatus(MatchStatus.VIEWED);
            match.setViewedAt(LocalDateTime.now());
            matchRepo.save(match);
        }
    }

    /**
     * Farmer skips / dismisses a match.
     */
    @Transactional
    public void skipMatch(Long farmerId, Long matchId) {
        BuyerMatch match = matchRepo.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("BuyerMatch", "id", matchId));

        if (!match.getFarmer().getId().equals(farmerId)) {
            throw new BadRequestException("You can only skip your own matches");
        }

        match.setStatus(MatchStatus.REJECTED);
        matchRepo.save(match);
    }

    /**
     * Get match counts for farmer badges.
     */
    public Map<String, Object> getMatchCounts(Long farmerId) {
        long newCount = matchRepo.countByFarmerIdAndStatus(farmerId, MatchStatus.NEW);
        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("newMatches", newCount);
        return counts;
    }

    /**
     * Link locked deal to match.
     */
    @Transactional
    public void onDealLocked(Long produceId, Long requirementId, String dealId) {
        if (produceId == null || requirementId == null) return;
        Optional<BuyerMatch> matchOpt = matchRepo.findByProduceIdAndBuyerRequirementId(produceId, requirementId);
        if (matchOpt.isPresent()) {
            BuyerMatch m = matchOpt.get();
            m.setStatus(MatchStatus.DEAL_LOCKED);
            m.setDealId(dealId);
            matchRepo.save(m);
        }
    }

    /**
     * Convert BuyerMatch to rich response map for frontend.
     */
    public Map<String, Object> toResponse(BuyerMatch m) {
        Produce p = m.getProduce();
        BuyerRequirement r = m.getBuyerRequirement();
        User farmer = m.getFarmer();
        User buyer = m.getBuyer();

        List<String> reasonsList = new ArrayList<>();
        if (m.getMatchReasons() != null && !m.getMatchReasons().isBlank()) {
            try {
                reasonsList = objectMapper.readValue(m.getMatchReasons(), new TypeReference<List<String>>() {});
            } catch (Exception e) {
                reasonsList = Arrays.asList(m.getMatchReasons().split(", "));
            }
        }

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("matchScore", m.getMatchScore());
        map.put("matchType", m.getMatchType().name());
        map.put("status", m.getStatus().name());
        map.put("conversationId", m.getConversationId());
        map.put("dealId", m.getDealId());
        map.put("matchReasons", reasonsList);
        map.put("createdAt", m.getCreatedAt());
        map.put("viewedAt", m.getViewedAt());

        // Produce Details
        Map<String, Object> prodMap = new LinkedHashMap<>();
        prodMap.put("id", p.getId());
        prodMap.put("name", p.getName());
        prodMap.put("category", p.getCategory());
        prodMap.put("quantity", p.getQuantity());
        prodMap.put("unit", p.getUnit());
        prodMap.put("pricePerUnit", p.getPricePerUnit());
        prodMap.put("location", p.getLocation());
        prodMap.put("readyDate", p.getReadyDate());
        prodMap.put("imageUrl", p.getImageUrl());
        prodMap.put("status", p.getStatus().name());
        map.put("produce", prodMap);

        // Buyer Requirement Details
        Map<String, Object> reqMap = new LinkedHashMap<>();
        reqMap.put("id", r.getId());
        reqMap.put("crop", r.getCrop());
        reqMap.put("quantity", r.getRemainingQuantity() != null ? r.getRemainingQuantity() : r.getQuantity());
        reqMap.put("unit", r.getUnit());
        reqMap.put("minPrice", r.getMinPrice());
        reqMap.put("maxPrice", r.getMaxPrice());
        reqMap.put("quality", r.getQuality());
        reqMap.put("requiredBy", r.getRequiredBy());
        reqMap.put("deliveryLocation", r.getDeliveryLocation());
        reqMap.put("status", r.getStatus().name());
        map.put("requirement", reqMap);

        // Buyer Details
        Map<String, Object> buyerMap = new LinkedHashMap<>();
        buyerMap.put("id", buyer.getId());
        buyerMap.put("name", buyer.getName());
        buyerMap.put("profilePhotoUrl", buyer.getProfilePhotoUrl());
        buyerMap.put("verified", Boolean.TRUE.equals(buyer.getVerified()) ||
                buyer.getVerificationStatus() == User.VerificationStatus.VERIFIED);
        buyerMap.put("rating", buyer.getRating() != null ? buyer.getRating() : 0.0);
        map.put("buyer", buyerMap);

        // Farmer Details
        Map<String, Object> farmerMap = new LinkedHashMap<>();
        farmerMap.put("id", farmer.getId());
        farmerMap.put("name", farmer.getName());
        farmerMap.put("profilePhotoUrl", farmer.getProfilePhotoUrl());
        farmerMap.put("verified", Boolean.TRUE.equals(farmer.getVerified()) ||
                farmer.getVerificationStatus() == User.VerificationStatus.VERIFIED);
        map.put("farmer", farmerMap);

        return map;
    }
}
