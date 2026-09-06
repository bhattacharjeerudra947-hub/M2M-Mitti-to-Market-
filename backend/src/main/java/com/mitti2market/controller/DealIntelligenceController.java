package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.DealAnalysis;
import com.mitti2market.model.User;
import com.mitti2market.repository.UserRepository;
import com.mitti2market.service.DealIntelligenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Deal Intelligence endpoints — the core differentiator.
 * "Highest offer ≠ highest net realization."
 */
@RestController
@RequestMapping("/api/deal-intelligence")
public class DealIntelligenceController {

    private final DealIntelligenceService dealIntelligence;
    private final TokenService tokens;
    private final UserRepository userRepository;

    public DealIntelligenceController(DealIntelligenceService dealIntelligence,
                                      TokenService tokens,
                                      UserRepository userRepository) {
        this.dealIntelligence = dealIntelligence;
        this.tokens = tokens;
        this.userRepository = userRepository;
    }

    /** GET /api/deal-intelligence/produce/{produceId} — all buyer offers ranked by estimated net realization */
    @GetMapping("/produce/{produceId}")
    public ResponseEntity<?> analyzeProduce(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long produceId) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<DealAnalysis> analyses = dealIntelligence.analyzeProduce(produceId);
        return ResponseEntity.ok(ApiResponse.ok(analyses));
    }

    /** GET /api/deal-intelligence/produce/{produceId}/recommendation — single best deal */
    @GetMapping("/produce/{produceId}/recommendation")
    public ResponseEntity<?> recommend(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long produceId) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        DealAnalysis best = dealIntelligence.recommendBestDeal(produceId);
        if (best == null) {
            return ResponseEntity.ok(ApiResponse.ok("No buyer offers yet for this produce", null));
        }
        return ResponseEntity.ok(ApiResponse.ok(best));
    }

    /** GET /api/deal-intelligence/farmer/{farmerId} — best deal for each of the farmer's active listings */
    @GetMapping("/farmer/{farmerId}")
    public ResponseEntity<?> farmerOverview(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long farmerId) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        // Only the farmer themselves (or a valid token holder) may view
        List<DealAnalysis> bestDeals = dealIntelligence.analyzeFarmerProduce(farmerId);
        return ResponseEntity.ok(ApiResponse.ok(bestDeals));
    }

    /** GET /api/deal-intelligence/my — best deal for each of the caller's active listings */
    @GetMapping("/my")
    public ResponseEntity<?> myBestDeals(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(ApiResponse.error("User not found"));
        if (userOpt.get().getRole() != User.Role.FARMER) {
            return ResponseEntity.status(403).body(ApiResponse.error("Only farmers can view deal intelligence"));
        }

        List<DealAnalysis> bestDeals = dealIntelligence.analyzeFarmerProduce(userId);
        return ResponseEntity.ok(ApiResponse.ok(bestDeals));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}