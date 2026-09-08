package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.BuyerRequirement;
import com.mitti2market.service.BuyerRequirementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Buyer Requirements — buyers post what crops they need,
 * farmers see demand and matches.
 */
@RestController
@RequestMapping("/api/requirements")
public class BuyerRequirementController {

    private final BuyerRequirementService requirementService;
    private final TokenService tokens;

    public BuyerRequirementController(BuyerRequirementService requirementService, TokenService tokens) {
        this.requirementService = requirementService;
        this.tokens = tokens;
    }

    /** POST /api/requirements — buyer posts a requirement */
    @PostMapping
    public ResponseEntity<?> createRequirement(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        BuyerRequirement req = requirementService.createRequirement(userId, body);
        return ResponseEntity.ok(ApiResponse.ok("Requirement posted", requirementService.toResponse(req)));
    }

    /** GET /api/requirements/my — the buyer's own requirements */
    @GetMapping("/my")
    public ResponseEntity<?> myRequirements(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> reqs = requirementService.getMyRequirements(userId)
                .stream().map(requirementService::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(reqs));
    }

    /** GET /api/requirements/my/active — active requirements */
    @GetMapping("/my/active")
    public ResponseEntity<?> activeRequirements(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> reqs = requirementService.getActiveRequirements(userId)
                .stream().map(requirementService::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(reqs));
    }

    /** GET /api/requirements/my/history — fulfilled / expired / cancelled requirements */
    @GetMapping("/my/history")
    public ResponseEntity<?> historyRequirements(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> reqs = requirementService.getHistoryRequirements(userId)
                .stream().map(requirementService::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(reqs));
    }

    /** GET /api/requirements/open?crop= — open requirements (for farmers to see demand) */
    @GetMapping("/open")
    public ResponseEntity<?> openRequirements(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String crop) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> reqs = requirementService.getOpenRequirements(crop)
                .stream().map(requirementService::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(reqs));
    }

    /** GET /api/requirements/{id}/matches — farmer supply that could fulfil this requirement */
    @GetMapping("/{id}/matches")
    public ResponseEntity<?> matches(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> matches = requirementService.matchSupply(id);
        return ResponseEntity.ok(ApiResponse.ok(matches));
    }

    /** PUT /api/requirements/{id}/status — buyer updates own requirement status */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        BuyerRequirement req = requirementService.updateStatus(userId, id, body.get("status"));
        return ResponseEntity.ok(ApiResponse.ok("Requirement updated", requirementService.toResponse(req)));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}