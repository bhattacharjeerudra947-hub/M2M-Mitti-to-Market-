package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.produce.ProduceResponse;
import com.mitti2market.model.Deal;
import com.mitti2market.model.Dispute;
import com.mitti2market.model.User;
import com.mitti2market.repository.DealRepository;
import com.mitti2market.repository.DisputeRepository;
import com.mitti2market.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final ReportService reportService;
    private final FeedbackService feedbackService;
    private final AuditLogService auditLogService;
    private final DealRepository dealRepository;
    private final DisputeRepository disputeRepository;
    private final ProduceService produceService;
    private final AppealService appealService;
    private final TokenService tokens;

    private Long extractAdminId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getPlatformStats()));
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String verification,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.searchUsers(role, verification, status, search, state, district)));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserDetails(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getUserDetails(id)));
    }

    @PutMapping("/users/{id}/verify")
    public ResponseEntity<?> verifyUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String notes = body != null ? (String) body.get("notes") : "";
        User user = adminService.verifyUser(adminId, id, notes);
        return ResponseEntity.ok(ApiResponse.ok("User verified successfully", adminService.toUserSummary(user)));
    }

    @PutMapping("/users/{id}/reject")
    public ResponseEntity<?> rejectVerification(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String reason = (String) body.getOrDefault("reason", "Verification rejected by admin.");
        User user = adminService.rejectVerification(adminId, id, reason);
        return ResponseEntity.ok(ApiResponse.ok("Verification rejected", adminService.toUserSummary(user)));
    }

    @PutMapping("/users/{id}/request-resubmission")
    public ResponseEntity<?> requestResubmission(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String reason = (String) body.getOrDefault("reason", "Please re-submit required documents.");
        User user = adminService.requestResubmission(adminId, id, reason);
        return ResponseEntity.ok(ApiResponse.ok("Re-submission requested", adminService.toUserSummary(user)));
    }

    @PutMapping("/users/{id}/suspend")
    public ResponseEntity<?> suspendUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String reason = (String) body.getOrDefault("reason", "Account suspended due to policy violation.");
        User user = adminService.suspendUser(adminId, id, reason);
        return ResponseEntity.ok(ApiResponse.ok("User suspended", adminService.toUserSummary(user)));
    }

    @PutMapping("/users/{id}/unsuspend")
    public ResponseEntity<?> unsuspendUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String reason = body != null ? (String) body.getOrDefault("reason", "Suspension lifted.") : "Suspension lifted.";
        User user = adminService.unsuspendUser(adminId, id, reason);
        return ResponseEntity.ok(ApiResponse.ok("User unsuspended", adminService.toUserSummary(user)));
    }

    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<?> deactivateUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String reason = (String) body.getOrDefault("reason", "Account deactivated.");
        User user = adminService.deactivateUser(adminId, id, reason);
        return ResponseEntity.ok(ApiResponse.ok("User deactivated", adminService.toUserSummary(user)));
    }

    @PutMapping("/users/{id}/restore")
    public ResponseEntity<?> restoreUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String reason = body != null ? (String) body.getOrDefault("reason", "Account restored.") : "Account restored.";
        User user = adminService.restoreUser(adminId, id, reason);
        return ResponseEntity.ok(ApiResponse.ok("User restored", adminService.toUserSummary(user)));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String reason = body != null ? (String) body.getOrDefault("reason", "Account deleted by admin.") : "Account deleted by admin.";
        User user = adminService.deleteUser(adminId, id, reason);
        return ResponseEntity.ok(ApiResponse.ok("User deleted successfully", adminService.toUserSummary(user)));
    }

    // ─── Appeal Management Endpoints ─────────────────────────────────

    @GetMapping("/appeals")
    public ResponseEntity<?> getAppeals(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(appealService.getAppealsForAdmin(status)));
    }

    @GetMapping("/appeals/{id}")
    public ResponseEntity<?> getAppealDetails(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(appealService.getAppealDetails(id)));
    }

    @PutMapping("/appeals/{id}/review")
    public ResponseEntity<?> reviewAppeal(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {
        Long adminId = extractAdminId(authHeader);
        return ResponseEntity.ok(ApiResponse.ok("Appeal marked under review", appealService.markUnderReview(adminId, id)));
    }

    @PutMapping("/appeals/{id}/decide")
    public ResponseEntity<?> decideAppeal(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody com.mitti2market.dto.appeal.AppealDecisionRequest request) {
        Long adminId = extractAdminId(authHeader);
        return ResponseEntity.ok(ApiResponse.ok("Appeal decision recorded", appealService.decideAppeal(adminId, id, request)));
    }

    @GetMapping("/verifications")
    public ResponseEntity<?> getVerifications(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String search) {
        String verFilter = status != null && !status.isBlank() ? status : null;
        return ResponseEntity.ok(ApiResponse.ok(adminService.searchUsers(role, verFilter, null, search, state, district)));
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getReports(status, type, search)));
    }

    @PutMapping("/reports/{id}/resolve")
    public ResponseEntity<?> resolveReport(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String statusStr = (String) body.getOrDefault("status", "RESOLVED");
        String adminNote = (String) body.getOrDefault("adminNote", "");
        String actionType = (String) body.getOrDefault("actionType", "NONE");

        return ResponseEntity.ok(ApiResponse.ok("Report status updated", reportService.resolveReport(adminId, id, statusStr, adminNote, actionType)));
    }

    @GetMapping("/feedback")
    public ResponseEntity<?> getFeedback(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.ok(feedbackService.getAllFeedback(category, status, role, keyword)));
    }

    @GetMapping("/feedback/insights")
    public ResponseEntity<?> getFeedbackInsights() {
        return ResponseEntity.ok(ApiResponse.ok(feedbackService.getFeedbackInsights()));
    }

    @PutMapping("/feedback/{id}")
    public ResponseEntity<?> updateFeedback(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String statusStr = (String) body.get("status");
        String adminResponse = (String) body.get("adminResponse");
        String adminNote = (String) body.get("adminNote");

        return ResponseEntity.ok(ApiResponse.ok("Feedback updated", feedbackService.updateFeedbackStatus(adminId, id, statusStr, adminResponse, adminNote)));
    }

    @PutMapping("/produce/{id}/remove")
    public ResponseEntity<?> removeProduce(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String reason = (String) body.getOrDefault("reason", "Produce listing removed by admin.");
        return ResponseEntity.ok(ApiResponse.ok("Produce listing removed", adminService.removeProduce(adminId, id, reason)));
    }

    @PutMapping("/requirements/{id}/remove")
    public ResponseEntity<?> removeRequirement(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long adminId = extractAdminId(authHeader);
        String reason = (String) body.getOrDefault("reason", "Buyer requirement removed by admin.");
        return ResponseEntity.ok(ApiResponse.ok("Buyer requirement removed", adminService.removeRequirement(adminId, id, reason)));
    }

    @GetMapping("/deals")
    public ResponseEntity<?> getDeals(@RequestParam(required = false) String status) {
        List<Deal> deals = dealRepository.findAll();
        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
            deals = deals.stream().filter(d -> d.getStatus().name().equalsIgnoreCase(status)).toList();
        }
        return ResponseEntity.ok(ApiResponse.ok(deals));
    }

    /**
     * GET /api/admin/produce — all produce listings (for moderation).
     * Optional ?status= filter (AVAILABLE, PARTIALLY_SOLD, SOLD_OUT, ADMIN_REMOVED, ...).
     */
    @GetMapping("/produce")
    public ResponseEntity<?> getProduce(@RequestParam(required = false) String status) {
        List<ProduceResponse> all = produceService.listAll(null, null, null, null);
        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
            all = all.stream()
                    .filter(p -> p.getStatus() != null && p.getStatus().name().equalsIgnoreCase(status))
                    .toList();
        }
        return ResponseEntity.ok(ApiResponse.ok(all));
    }

    /**
     * GET /api/admin/disputes — all deal disputes (moderation queue).
     * Optional ?status= filter (OPEN, UNDER_REVIEW, RESOLVED, REJECTED).
     */
    @GetMapping("/disputes")
    public ResponseEntity<?> getDisputes(@RequestParam(required = false) String status) {
        List<Dispute> disputes = disputeRepository.findAllByOrderByCreatedAtDesc();
        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
            disputes = disputes.stream()
                    .filter(d -> d.getStatus() != null && d.getStatus().name().equalsIgnoreCase(status))
                    .toList();
        }
        List<Map<String, Object>> out = disputes.stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("dealId", d.getDealId());
            m.put("reason", d.getReason());
            m.put("description", d.getDescription());
            m.put("status", d.getStatus());
            m.put("createdAt", d.getCreatedAt());
            m.put("resolvedAt", d.getResolvedAt());
            m.put("raisedByName", d.getRaisedBy() != null ? d.getRaisedBy().getName() : null);
            m.put("raisedByEmail", d.getRaisedBy() != null ? d.getRaisedBy().getEmail() : null);
            return m;
        }).toList();
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    @GetMapping("/audit-log")
    public ResponseEntity<?> getAuditLog() {
        return ResponseEntity.ok(ApiResponse.ok(auditLogService.getAllAuditLogs()));
    }
}
