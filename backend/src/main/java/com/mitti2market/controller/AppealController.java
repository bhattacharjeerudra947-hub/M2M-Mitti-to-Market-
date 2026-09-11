package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.appeal.AppealRequest;
import com.mitti2market.dto.appeal.AppealResponse;
import com.mitti2market.service.AppealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appeals")
@RequiredArgsConstructor
public class AppealController {

    private final AppealService appealService;
    private final TokenService tokens;

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }

    /**
     * POST /api/appeals
     * User submits an appeal for a suspended or deactivated account.
     */
    @PostMapping
    public ResponseEntity<?> submitAppeal(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody AppealRequest request) {

        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }

        AppealResponse response = appealService.submitAppeal(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Appeal submitted successfully. Administration has been notified.", response));
    }

    /**
     * GET /api/appeals/my
     * Get all appeals submitted by the logged-in user.
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyAppeals(@RequestHeader("Authorization") String authHeader) {
        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }

        List<AppealResponse> list = appealService.getMyAppeals(userId);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /**
     * GET /api/appeals/{id}
     * Get details of a single appeal.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getAppealById(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {
        Long userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }

        AppealResponse appeal = appealService.getAppealDetails(id);
        return ResponseEntity.ok(ApiResponse.ok(appeal));
    }
}
