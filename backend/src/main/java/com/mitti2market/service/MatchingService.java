package com.mitti2market.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mitti2market.model.*;
import com.mitti2market.model.BuyerMatch.MatchStatus;
import com.mitti2market.model.BuyerMatch.MatchType;
import com.mitti2market.model.BuyerRequirement.RequirementStatus;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.repository.BuyerMatchRepository;
import com.mitti2market.repository.BuyerRequirementRepository;
import com.mitti2market.repository.ProduceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Two-Way AI Live Matching Engine.
 * Matches active farmer produce listings with active buyer bulk requirements
 * regardless of which was created first.
 *
 * Enforces the core business rule: The system identifies matches and ranks them,
 * but ONLY THE FARMER can initiate a deal.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {

    private final BuyerMatchRepository matchRepo;
    private final ProduceRepository produceRepo;
    private final BuyerRequirementRepository requirementRepo;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final List<ProduceStatus> ELIGIBLE_PRODUCE_STATUSES = List.of(
            ProduceStatus.AVAILABLE,
            ProduceStatus.LOW_STOCK,
            ProduceStatus.PARTIALLY_SOLD
    );

    private static final List<RequirementStatus> ELIGIBLE_REQ_STATUSES = List.of(
            RequirementStatus.OPEN,
            RequirementStatus.MATCHED,
            RequirementStatus.NEGOTIATING,
            RequirementStatus.PARTIALLY_FULFILLED
    );

    /**
     * Trigger A: Farmer creates or updates Produce listing.
     * Searches existing active BuyerRequirements and generates matches.
     */
    @Transactional
    public List<BuyerMatch> matchProduceAgainstRequirements(Produce produce) {
        if (produce == null || produce.getId() == null || produce.getQuantity() == null || produce.getQuantity() <= 0) {
            return Collections.emptyList();
        }
        if (!ELIGIBLE_PRODUCE_STATUSES.contains(produce.getStatus())) {
            return Collections.emptyList();
        }

        List<BuyerRequirement> candidates = requirementRepo.findByStatusInOrderByCreatedAtDesc(ELIGIBLE_REQ_STATUSES);
        List<BuyerMatch> generatedMatches = new ArrayList<>();

        for (BuyerRequirement req : candidates) {
            // Avoid matching a farmer with themselves if IDs happen to overlap
            if (req.getBuyer() != null && produce.getFarmer() != null &&
                req.getBuyer().getId().equals(produce.getFarmer().getId())) {
                continue;
            }

            MatchEvaluation eval = evaluate(produce, req);
            if (eval.score >= 50 && eval.isCropMatch) {
                BuyerMatch match = saveOrUpdateMatch(produce, req, eval, true);
                if (match != null) {
                    generatedMatches.add(match);
                }
            }
        }

        return generatedMatches;
    }

    /**
     * Trigger B: Buyer creates or updates Bulk Requirement.
     * Searches existing active Produce listings and generates matches.
     */
    @Transactional
    public List<BuyerMatch> matchRequirementAgainstProduces(BuyerRequirement req) {
        if (req == null || req.getId() == null || req.getRemainingQuantity() == null || req.getRemainingQuantity() <= 0) {
            return Collections.emptyList();
        }
        if (!ELIGIBLE_REQ_STATUSES.contains(req.getStatus())) {
            return Collections.emptyList();
        }

        List<Produce> candidates = produceRepo.findAll();
        List<BuyerMatch> generatedMatches = new ArrayList<>();

        for (Produce produce : candidates) {
            if (!ELIGIBLE_PRODUCE_STATUSES.contains(produce.getStatus())) continue;
            if (produce.getQuantity() == null || produce.getQuantity() <= 0) continue;
            if (req.getBuyer() != null && produce.getFarmer() != null &&
                req.getBuyer().getId().equals(produce.getFarmer().getId())) {
                continue;
            }

            MatchEvaluation eval = evaluate(produce, req);
            if (eval.score >= 50 && eval.isCropMatch) {
                BuyerMatch match = saveOrUpdateMatch(produce, req, eval, true);
                if (match != null) {
                    generatedMatches.add(match);
                }
            }
        }

        return generatedMatches;
    }

    /**
     * Evaluates compatibility and calculates score (0 - 100) + checklist reasons.
     *
     * Weights:
     * - Crop compatibility: 30%
     * - Quantity compatibility: 20%
     * - Price compatibility: 20%
     * - Location compatibility: 10%
     * - Ready / Required Date: 10%
     * - Buyer Trust & Verification: 10%
     */
    public MatchEvaluation evaluate(Produce produce, BuyerRequirement req) {
        MatchEvaluation eval = new MatchEvaluation();
        int totalScore = 0;
        List<String> reasons = new ArrayList<>();

        // 1. Crop Match (30%)
        String pCrop = produce.getName() != null ? produce.getName().trim().toLowerCase() : "";
        String rCrop = req.getCrop() != null ? req.getCrop().trim().toLowerCase() : "";
        boolean cropMatch = isCropCompatible(pCrop, rCrop);
        eval.isCropMatch = cropMatch;

        if (cropMatch) {
            totalScore += 30;
            reasons.add("✓ Same crop (" + produce.getName() + ")");
        } else {
            reasons.add("✗ Incompatible crop");
            eval.score = 0;
            eval.reasons = reasons;
            return eval;
        }

        // 2. Quantity Match (20%)
        int availQty = produce.getQuantity() != null ? produce.getQuantity() : 0;
        int reqQty = req.getRemainingQuantity() != null ? req.getRemainingQuantity() :
                     (req.getRequiredQuantity() != null ? req.getRequiredQuantity() : req.getQuantity());

        if (reqQty <= 0) reqQty = 1;

        if (availQty >= reqQty) {
            totalScore += 20;
            reasons.add("✓ Quantity compatible (" + availQty + " " + produce.getUnit() + " available for " + reqQty + " " + req.getUnit() + " required)");
            eval.matchType = MatchType.EXACT;
        } else {
            // Partial match
            double ratio = (double) availQty / reqQty;
            int qScore = (int) Math.round(ratio * 20.0);
            qScore = Math.max(5, Math.min(18, qScore));
            totalScore += qScore;
            reasons.add("⚠ Partial quantity (" + availQty + " " + produce.getUnit() + " available against " + reqQty + " " + req.getUnit() + " requirement)");
            eval.matchType = MatchType.PARTIAL;
        }

        // 3. Price Match (20%)
        Double pPrice = produce.getPricePerUnit();
        Double rMin = req.getMinPrice();
        Double rMax = req.getMaxPrice();

        if (pPrice != null) {
            if (rMax == null && rMin == null) {
                totalScore += 20;
                reasons.add("✓ Price compatible (₹" + pPrice + "/" + produce.getUnit() + ")");
            } else if (rMax != null && pPrice <= rMax) {
                totalScore += 20;
                reasons.add("✓ Price compatible (Farmer ₹" + pPrice + " ≤ Buyer budget ₹" + rMax + ")");
            } else if (rMax != null && pPrice <= rMax * 1.15) {
                totalScore += 10;
                reasons.add("⚠ Price negotiable (Farmer ₹" + pPrice + " close to Buyer budget ₹" + rMax + ")");
            } else {
                totalScore += 2;
                reasons.add("✗ Farmer price ₹" + pPrice + " above buyer budget ₹" + rMax);
            }
        } else {
            totalScore += 10;
        }

        // 4. Location Match (10%)
        String pLoc = produce.getLocation() != null ? produce.getLocation().trim().toLowerCase() : "";
        String rLoc = req.getDeliveryLocation() != null ? req.getDeliveryLocation().trim().toLowerCase() : "";

        if (pLoc.isBlank() || rLoc.isBlank()) {
            totalScore += 8;
            reasons.add("✓ Delivery location flexible");
        } else if (pLoc.contains(rLoc) || rLoc.contains(pLoc)) {
            totalScore += 10;
            reasons.add("✓ Location compatible (" + produce.getLocation() + ")");
        } else {
            totalScore += 6;
            reasons.add("✓ Regional transport available (" + produce.getLocation() + " to " + req.getDeliveryLocation() + ")");
        }

        // 5. Ready Date / Required Date (10%)
        LocalDate ready = produce.getReadyDate();
        LocalDate needed = req.getRequiredBy();

        if (ready == null && needed == null) {
            totalScore += 10;
            reasons.add("✓ Immediate availability");
        } else if (ready != null && needed != null) {
            if (!ready.isAfter(needed)) {
                totalScore += 10;
                reasons.add("✓ Ready date compatible (Ready by " + ready + ", required by " + needed + ")");
            } else if (ready.minusDays(3).isBefore(needed)) {
                totalScore += 6;
                reasons.add("⚠ Ready date close (" + ready + " vs " + needed + ")");
            } else {
                totalScore += 2;
                reasons.add("✗ Ready date after requirement deadline");
            }
        } else {
            totalScore += 8;
            reasons.add("✓ Availability timeline compatible");
        }

        // 6. Trust & Verification (10%)
        boolean buyerVerified = req.getBuyer() != null &&
                (Boolean.TRUE.equals(req.getBuyer().getVerified()) ||
                 req.getBuyer().getVerificationStatus() == User.VerificationStatus.VERIFIED);

        if (buyerVerified) {
            totalScore += 10;
            reasons.add("✓ Verified Business (" + req.getBuyer().getName() + ")");
        } else {
            totalScore += 6;
            reasons.add("✓ Active marketplace member");
        }

        eval.score = Math.min(100, Math.max(0, totalScore));
        eval.reasons = reasons;
        return eval;
    }

    private boolean isCropCompatible(String crop1, String crop2) {
        if (crop1.isEmpty() || crop2.isEmpty()) return false;
        if (crop1.equals(crop2)) return true;
        if (crop1.contains(crop2) || crop2.contains(crop1)) return true;

        // Common synonyms / transliterations
        Map<String, Set<String>> synonyms = Map.of(
                "mango", Set.of("aam", "alphonso", "kesar", "dasheri", "langra"),
                "potato", Set.of("aloo", "alu"),
                "tomato", Set.of("tamatar"),
                "onion", Set.of("pyaz", "kanda"),
                "wheat", Set.of("gehun", "gehu"),
                "rice", Set.of("chawal", "dhan", "basmati"),
                "banana", Set.of("kela"),
                "apple", Set.of("seb")
        );

        for (Map.Entry<String, Set<String>> entry : synonyms.entrySet()) {
            boolean has1 = crop1.contains(entry.getKey()) || entry.getValue().stream().anyMatch(crop1::contains);
            boolean has2 = crop2.contains(entry.getKey()) || entry.getValue().stream().anyMatch(crop2::contains);
            if (has1 && has2) return true;
        }

        return false;
    }

    private BuyerMatch saveOrUpdateMatch(Produce produce, BuyerRequirement req, MatchEvaluation eval, boolean notifyFarmer) {
        Optional<BuyerMatch> existingOpt = matchRepo.findByProduceIdAndBuyerRequirementId(produce.getId(), req.getId());

        String reasonsJson;
        try {
            reasonsJson = objectMapper.writeValueAsString(eval.reasons);
        } catch (JsonProcessingException e) {
            reasonsJson = String.join(", ", eval.reasons);
        }

        BuyerMatch match;
        boolean isBrandNew = false;

        if (existingOpt.isPresent()) {
            match = existingOpt.get();
            match.setMatchScore(eval.score);
            match.setMatchReasons(reasonsJson);
            match.setMatchType(eval.matchType);
            // If it was expired but now valid again
            if (match.getStatus() == MatchStatus.EXPIRED) {
                match.setStatus(MatchStatus.NEW);
                isBrandNew = true;
            }
        } else {
            isBrandNew = true;
            match = BuyerMatch.builder()
                    .produce(produce)
                    .buyerRequirement(req)
                    .farmer(produce.getFarmer())
                    .buyer(req.getBuyer())
                    .matchScore(eval.score)
                    .matchReasons(reasonsJson)
                    .matchType(eval.matchType)
                    .status(MatchStatus.NEW)
                    .build();
        }

        match = matchRepo.save(match);

        // Notify the FARMER (and ONLY the farmer receives actionable match prompt!)
        if (isBrandNew && notifyFarmer && produce.getFarmer() != null) {
            notifyFarmerOfMatch(match, produce, req, eval.score);
        }

        return match;
    }

    private void notifyFarmerOfMatch(BuyerMatch match, Produce produce, BuyerRequirement req, int score) {
        match.setNotifiedAt(LocalDateTime.now());
        matchRepo.save(match);

        String buyerName = req.getBuyer() != null ? req.getBuyer().getName() : "Bulk Buyer";
        String cropName = produce.getName();
        String reqQty = (req.getRemainingQuantity() != null ? req.getRemainingQuantity() : req.getQuantity()) + " " + req.getUnit();
        String budget = req.getMaxPrice() != null ? ("₹" + req.getMaxPrice() + "/" + req.getUnit()) : "Market Rate";

        String title = "🎉 NEW MATCH FOUND";
        String body = "Your " + cropName + " listing matches a bulk buyer.\n" +
                buyerName + "\nWants: " + reqQty + "\nBudget: up to " + budget + "\nAI Match: " + score + "%";

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("matchId", match.getId());
        meta.put("produceId", produce.getId());
        meta.put("buyerRequirementId", req.getId());
        meta.put("crop", cropName);
        meta.put("score", score);
        meta.put("buyerName", buyerName);

        String metaJson;
        try {
            metaJson = objectMapper.writeValueAsString(meta);
        } catch (Exception e) {
            metaJson = "{}";
        }

        notificationService.createNotification(
                produce.getFarmer().getId(),
                Notification.NotificationType.NEW_MATCH,
                title,
                body,
                match.getId(),
                "MATCH",
                metaJson
        );
    }

    /**
     * When Produce is sold out, deleted, or removed, expire open matches.
     */
    @Transactional
    public void handleProduceStatusChange(Produce produce) {
        if (produce == null || produce.getId() == null) return;
        if (!ELIGIBLE_PRODUCE_STATUSES.contains(produce.getStatus())) {
            List<BuyerMatch> matches = matchRepo.findByProduceId(produce.getId());
            for (BuyerMatch m : matches) {
                if (m.getStatus() == MatchStatus.NEW || m.getStatus() == MatchStatus.VIEWED || m.getStatus() == MatchStatus.FARMER_INTERESTED) {
                    m.setStatus(MatchStatus.EXPIRED);
                    matchRepo.save(m);
                }
            }
        }
    }

    /**
     * When BuyerRequirement is fulfilled, cancelled, or removed, expire open matches.
     */
    @Transactional
    public void handleRequirementStatusChange(BuyerRequirement req) {
        if (req == null || req.getId() == null) return;
        if (!ELIGIBLE_REQ_STATUSES.contains(req.getStatus())) {
            List<BuyerMatch> matches = matchRepo.findByBuyerRequirementId(req.getId());
            for (BuyerMatch m : matches) {
                if (m.getStatus() == MatchStatus.NEW || m.getStatus() == MatchStatus.VIEWED || m.getStatus() == MatchStatus.FARMER_INTERESTED) {
                    m.setStatus(MatchStatus.EXPIRED);
                    matchRepo.save(m);
                } else if (req.getStatus() == RequirementStatus.FULFILLED && m.getStatus() == MatchStatus.DEAL_LOCKED) {
                    m.setStatus(MatchStatus.COMPLETED);
                    matchRepo.save(m);
                }
            }
        }
    }

    public static class MatchEvaluation {
        public int score;
        public boolean isCropMatch;
        public MatchType matchType = MatchType.COMPATIBLE;
        public List<String> reasons = new ArrayList<>();
    }
}
