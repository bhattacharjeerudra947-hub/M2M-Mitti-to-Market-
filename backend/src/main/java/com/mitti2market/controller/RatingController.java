package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/deals")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;
    private final TokenService tokens;

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }

    @PostMapping("/{dealId}/rating")
    public ResponseEntity<?> submitRating(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        try {
            Integer rating = body.get("rating") != null ? Integer.valueOf(body.get("rating").toString()) : null;
            String comment = (String) body.get("comment");
            return ResponseEntity.ok(ApiResponse.ok("Rating submitted successfully", ratingService.submitRating(userId, dealId, rating, comment)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{dealId}/ratings")
    public ResponseEntity<?> getDealRatings(@PathVariable Long dealId) {
        return ResponseEntity.ok(ApiResponse.ok(ratingService.getDealRatings(dealId)));
    }

    @GetMapping("/users/{userId}/ratings")
    public ResponseEntity<?> getUserRatings(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(ratingService.getReviewsForUser(userId)));
    }

    @GetMapping("/users/{userId}/rating-summary")
    public ResponseEntity<?> getUserRatingSummary(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(ratingService.getUserRatingSummary(userId)));
    }
}
