package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.service.BuyerMatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for Two-Way Live Matches and Farmer-Initiated Deals.
 */
@RestController
@RequestMapping("/api/matches")
public class BuyerMatchController {

    private final BuyerMatchService matchService;
    private final TokenService tokens;

    public BuyerMatchController(BuyerMatchService matchService, TokenService tokens) {
        this.matchService = matchService;
        this.tokens = tokens;
    }

    /**
     * GET /api/matches/farmer?filter=new|best|discussions|locked|completed
     * Fetch farmer's match feed categorized by tab.
     */
    @GetMapping("/farmer")
    public ResponseEntity<?> getFarmerMatches(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false, defaultValue = "all") String filter) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> matches = matchService.getFarmerMatches(userId, filter);
        return ResponseEntity.ok(ApiResponse.ok(matches));
    }

    /**
     * GET /api/matches/counts
     * Unread match count for badge notifications.
     */
    @GetMapping("/counts")
    public ResponseEntity<?> getMatchCounts(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        Map<String, Object> counts = matchService.getMatchCounts(userId);
        return ResponseEntity.ok(ApiResponse.ok(counts));
    }

    /**
     * GET /api/matches/{id}
     * Get details of a single match.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getMatch(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        Map<String, Object> match = matchService.getMatch(id);
        return ResponseEntity.ok(ApiResponse.ok(match));
    }

    /**
     * POST /api/matches/{id}/start-deal
     * FARMER STARTS DEAL.
     * Enforces that only the farmer can initiate.
     */
    @PostMapping("/{id}/start-deal")
    public ResponseEntity<?> startDeal(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        Map<String, Object> result = matchService.startDeal(userId, id);
        return ResponseEntity.ok(ApiResponse.ok("Deal initiated successfully", result));
    }

    /**
     * PUT /api/matches/{id}/view
     * Mark match as viewed by farmer.
     */
    @PutMapping("/{id}/view")
    public ResponseEntity<?> markViewed(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        matchService.markViewed(userId, id);
        return ResponseEntity.ok(ApiResponse.ok("Match marked as viewed", null));
    }

    /**
     * PUT /api/matches/{id}/skip
     * Farmer dismisses match.
     */
    @PutMapping("/{id}/skip")
    public ResponseEntity<?> skipMatch(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        matchService.skipMatch(userId, id);
        return ResponseEntity.ok(ApiResponse.ok("Match dismissed", null));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}
