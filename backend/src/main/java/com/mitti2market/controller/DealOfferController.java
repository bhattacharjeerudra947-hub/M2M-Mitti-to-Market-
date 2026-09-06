package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.DealOffer;
import com.mitti2market.service.DealOfferService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Structured negotiation — create/counter/accept/reject offers.
 * Offers carry concrete price + quantity, not just free-form chat.
 */
@RestController
@RequestMapping("/api/offers")
public class DealOfferController {

    private final DealOfferService offerService;
    private final TokenService tokens;

    public DealOfferController(DealOfferService offerService, TokenService tokens) {
        this.offerService = offerService;
        this.tokens = tokens;
    }

    /** POST /api/offers — create an offer in a conversation */
    @PostMapping
    public ResponseEntity<?> createOffer(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        String conversationId = (String) body.get("conversationId");
        if (conversationId == null || conversationId.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("conversationId is required"));
        }
        if (!body.containsKey("price") || !body.containsKey("quantity")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("price and quantity are required"));
        }

        DealOffer offer = offerService.createOffer(userId, conversationId, body);
        return ResponseEntity.ok(ApiResponse.ok("Offer sent", offerService.toResponse(offer)));
    }

    /** GET /api/offers/conversation/{conversationId} — offers in a conversation */
    @GetMapping("/conversation/{conversationId}")
    public ResponseEntity<?> conversationOffers(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String conversationId) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> offers = offerService.getConversationOffers(conversationId);
        return ResponseEntity.ok(ApiResponse.ok(offers));
    }

    /** GET /api/offers/pending — pending offers received by the caller */
    @GetMapping("/pending")
    public ResponseEntity<?> pendingOffers(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> offers = offerService.getPendingOffersForUser(userId);
        return ResponseEntity.ok(ApiResponse.ok(offers));
    }

    /** POST /api/offers/{id}/accept — accept → creates deal in LOCK_PENDING */
    @PostMapping("/{id}/accept")
    public ResponseEntity<?> acceptOffer(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        DealOffer offer = offerService.acceptOffer(userId, id);
        return ResponseEntity.ok(ApiResponse.ok("Offer accepted — deal created", offerService.toResponse(offer)));
    }

    /** POST /api/offers/{id}/counter — counter an offer */
    @PostMapping("/{id}/counter")
    public ResponseEntity<?> counterOffer(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        if (!body.containsKey("price") || !body.containsKey("quantity")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("price and quantity are required"));
        }

        DealOffer counter = offerService.counterOffer(userId, id, body);
        return ResponseEntity.ok(ApiResponse.ok("Counter-offer sent", offerService.toResponse(counter)));
    }

    /** POST /api/offers/{id}/reject — reject an offer */
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectOffer(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        DealOffer offer = offerService.rejectOffer(userId, id);
        return ResponseEntity.ok(ApiResponse.ok("Offer rejected", offerService.toResponse(offer)));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}