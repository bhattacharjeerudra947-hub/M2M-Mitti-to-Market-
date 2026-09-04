package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.BuyerInterest;
import com.mitti2market.service.BuyerInterestService;
import com.mitti2market.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/interests")
public class BuyerInterestController {

    private final BuyerInterestService interestService;
    private final NotificationService notificationService;
    private final TokenService tokens;

    public BuyerInterestController(BuyerInterestService interestService,
                                    NotificationService notificationService,
                                    TokenService tokens) {
        this.interestService = interestService;
        this.notificationService = notificationService;
        this.tokens = tokens;
    }

    /** Buyer expresses interest in a produce listing */
    @PostMapping
    public ResponseEntity<?> expressInterest(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        Long produceId = Long.valueOf(body.get("produceId").toString());
        Double offeredPrice = body.containsKey("offeredPrice") && body.get("offeredPrice") != null
                ? Double.parseDouble(body.get("offeredPrice").toString()) : null;
        Integer offeredQuantity = body.containsKey("offeredQuantity") && body.get("offeredQuantity") != null
                ? Integer.parseInt(body.get("offeredQuantity").toString()) : null;
        String message = (String) body.get("message");

        try {
            BuyerInterest interest = interestService.expressInterest(
                    userId, produceId, offeredPrice, offeredQuantity, message);
            return ResponseEntity.ok(ApiResponse.ok("Interest expressed successfully", Map.of(
                    "id", interest.getId(),
                    "status", interest.getStatus().name()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Farmer accepts a buyer's interest → creates conversation */
    @PutMapping("/{id}/accept")
    public ResponseEntity<?> acceptInterest(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            BuyerInterest interest = interestService.acceptInterest(id, userId);
            return ResponseEntity.ok(ApiResponse.ok("Interest accepted! Conversation started.", Map.of(
                    "id", interest.getId(),
                    "status", interest.getStatus().name(),
                    "conversationId", interest.getConversationId()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Farmer rejects a buyer's interest */
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectInterest(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            BuyerInterest interest = interestService.rejectInterest(id, userId);
            return ResponseEntity.ok(ApiResponse.ok("Interest rejected", Map.of(
                    "id", interest.getId(),
                    "status", interest.getStatus().name()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Get all interests for a farmer's produce */
    @GetMapping("/farmer/{farmerId}")
    public ResponseEntity<?> getFarmerInterests(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long farmerId) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> interests = interestService.getFarmerInterests(farmerId);
        return ResponseEntity.ok(ApiResponse.ok(interests));
    }

    /** Get pending interests for a farmer */
    @GetMapping("/farmer/{farmerId}/pending")
    public ResponseEntity<?> getFarmerPendingInterests(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long farmerId) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> interests = interestService.getFarmerPendingInterests(farmerId);
        return ResponseEntity.ok(ApiResponse.ok(interests));
    }

    /** Get interests by a buyer */
    @GetMapping("/buyer/{buyerId}")
    public ResponseEntity<?> getBuyerInterests(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long buyerId) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> interests = interestService.getBuyerInterests(buyerId);
        return ResponseEntity.ok(ApiResponse.ok(interests));
    }

    /** Get pending interest count for a farmer */
    @GetMapping("/farmer/{farmerId}/pending-count")
    public ResponseEntity<?> getPendingCount(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long farmerId) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        long count = interestService.getPendingCount(farmerId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("pendingCount", count)));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}
