package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.Dispute;
import com.mitti2market.model.DisputeResponse;
import com.mitti2market.model.Evidence;
import com.mitti2market.model.ObserverAssignment;
import com.mitti2market.config.TokenService;
import com.mitti2market.service.DisputeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class DisputeController {

    private final DisputeService disputeService;
    private final TokenService tokens;

    // ─────────────────────────────────────────────────────────────
    // EVIDENCE ENDPOINTS
    // ─────────────────────────────────────────────────────────────

    /** Upload evidence with multipart file */
    @PostMapping(value = "/deals/{dealId}/evidence/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadEvidenceFile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "stage", defaultValue = "ORIGIN") String stage,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "latitude", required = false) Double latitude,
            @RequestParam(value = "longitude", required = false) Double longitude,
            @RequestParam(value = "lotQuantity", required = false) Double lotQuantity,
            @RequestParam(value = "grade", required = false) String grade) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Evidence ev = disputeService.uploadEvidence(userId, dealId, file, null, stage,
                    description, location, latitude, longitude, lotQuantity, grade);
            return ResponseEntity.ok(ApiResponse.ok("Evidence uploaded successfully", disputeService.evidenceToMap(ev)));
        } catch (Exception e) {
            log.error("Error uploading evidence: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Upload or record evidence via JSON payload (e.g. from existing Cloudinary URL) */
    @PostMapping("/deals/{dealId}/evidence")
    public ResponseEntity<?> uploadEvidenceJson(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            String imageUrl = (String) body.get("imageUrl");
            String stage = (String) body.getOrDefault("stage", "ORIGIN");
            String description = (String) body.get("description");
            String location = (String) body.get("location");
            Double latitude = body.get("latitude") != null ? Double.valueOf(body.get("latitude").toString()) : null;
            Double longitude = body.get("longitude") != null ? Double.valueOf(body.get("longitude").toString()) : null;
            Double lotQuantity = body.get("lotQuantity") != null ? Double.valueOf(body.get("lotQuantity").toString()) : null;
            String grade = (String) body.get("grade");

            Evidence ev = disputeService.uploadEvidence(userId, dealId, null, imageUrl, stage,
                    description, location, latitude, longitude, lotQuantity, grade);
            return ResponseEntity.ok(ApiResponse.ok("Evidence recorded successfully", disputeService.evidenceToMap(ev)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Fetch all evidence for a deal */
    @GetMapping("/deals/{dealId}/evidence")
    public ResponseEntity<?> getDealEvidence(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            List<Evidence> list = disputeService.getDealEvidence(dealId, userId);
            return ResponseEntity.ok(ApiResponse.ok(list.stream().map(disputeService::evidenceToMap).toList()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Observer / Admin verification of an evidence item */
    @PutMapping("/evidence/{evidenceId}/verify")
    public ResponseEntity<?> verifyEvidence(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long evidenceId,
            @RequestBody Map<String, String> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            String status = body.getOrDefault("status", "VERIFIED");
            String notes = body.get("notes");
            Evidence ev = disputeService.verifyEvidence(userId, evidenceId, status, notes);
            return ResponseEntity.ok(ApiResponse.ok("Evidence verified successfully", disputeService.evidenceToMap(ev)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // DELIVERY ACCEPTANCE (BUYER CONFIRMATION)
    // ─────────────────────────────────────────────────────────────

    @PostMapping("/deals/{dealId}/accept-delivery")
    public ResponseEntity<?> acceptDelivery(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            var deal = disputeService.acceptDelivery(userId, dealId);
            return ResponseEntity.ok(ApiResponse.ok("Delivery accepted and order completed successfully", Map.of(
                    "dealId", deal.getId(),
                    "status", deal.getStatus().name()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // DISPUTE ENDPOINTS
    // ─────────────────────────────────────────────────────────────

    /** Open a dispute on a deal */
    @PostMapping("/deals/{dealId}/disputes")
    public ResponseEntity<?> openDispute(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            String reason = String.valueOf(body.get("reason"));
            String description = (String) body.get("description");
            Integer disputedQuantity = body.get("disputedQuantity") != null ? Integer.valueOf(body.get("disputedQuantity").toString()) : null;
            String evidenceUrl = (String) body.get("evidenceUrl");

            Dispute dispute = disputeService.openDispute(userId, dealId, reason, description, disputedQuantity, evidenceUrl, null);
            return ResponseEntity.ok(ApiResponse.ok("Dispute opened successfully", disputeService.disputeToMap(dispute)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** List disputes for a specific deal */
    @GetMapping("/deals/{dealId}/disputes")
    public ResponseEntity<?> getDisputesForDeal(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            List<Map<String, Object>> disputes = disputeService.getDisputesForDeal(dealId, userId);
            return ResponseEntity.ok(ApiResponse.ok(disputes));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Get comprehensive dispute details including claims, responses, timeline, and evidence */
    @GetMapping("/disputes/{disputeId}")
    public ResponseEntity<?> getDisputeDetails(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long disputeId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Map<String, Object> details = disputeService.getDisputeDetails(disputeId, userId);
            return ResponseEntity.ok(ApiResponse.ok(details));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Respond to a dispute (farmer, buyer, observer, admin) */
    @PostMapping("/disputes/{disputeId}/respond")
    public ResponseEntity<?> respondToDispute(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long disputeId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            String message = (String) body.get("message");
            String responseType = (String) body.getOrDefault("responseType", "RESPONSE");
            String evidenceUrl = (String) body.get("evidenceUrl");

            DisputeResponse resp = disputeService.respondToDispute(userId, disputeId, message, responseType, evidenceUrl, null);
            return ResponseEntity.ok(ApiResponse.ok("Response submitted", disputeService.disputeResponseToMap(resp)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Admin assigns an observer to a dispute */
    @PostMapping("/disputes/{disputeId}/assign-observer")
    public ResponseEntity<?> assignObserver(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long disputeId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Long observerId = Long.valueOf(body.get("observerId").toString());
            String notes = (String) body.get("notes");
            ObserverAssignment assignment = disputeService.assignObserver(userId, disputeId, observerId, notes);
            return ResponseEntity.ok(ApiResponse.ok("Observer assigned successfully", Map.of(
                    "assignmentId", assignment.getId(),
                    "observerId", observerId,
                    "status", assignment.getStatus().name()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Admin requests additional evidence from farmer or buyer */
    @PostMapping("/disputes/{disputeId}/request-evidence")
    public ResponseEntity<?> requestAdditionalEvidence(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long disputeId,
            @RequestBody Map<String, String> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            String targetRole = body.getOrDefault("targetRole", "FARMER");
            String notes = body.get("notes");
            Dispute d = disputeService.requestAdditionalEvidence(userId, disputeId, targetRole, notes);
            return ResponseEntity.ok(ApiResponse.ok("Additional evidence requested", disputeService.disputeToMap(d)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Admin resolves dispute (full buyer, full farmer, partial settlement, rejection, escalation) */
    @PostMapping("/disputes/{disputeId}/resolve")
    public ResponseEntity<?> resolveDispute(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long disputeId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            String resolutionType = (String) body.get("resolutionType");
            String resolutionNotes = (String) body.get("resolutionNotes");
            Integer acceptedQuantity = body.get("acceptedQuantity") != null ? Integer.valueOf(body.get("acceptedQuantity").toString()) : null;
            Integer disputedQuantity = body.get("disputedQuantity") != null ? Integer.valueOf(body.get("disputedQuantity").toString()) : null;
            Double adjustmentAmount = body.get("adjustmentAmount") != null ? Double.valueOf(body.get("adjustmentAmount").toString()) : null;
            Boolean returnDisputedToStock = body.get("returnDisputedToStock") != null ? Boolean.valueOf(body.get("returnDisputedToStock").toString()) : null;

            Dispute d = disputeService.resolveDispute(userId, disputeId, resolutionType, resolutionNotes,
                    acceptedQuantity, disputedQuantity, adjustmentAmount, returnDisputedToStock);
            return ResponseEntity.ok(ApiResponse.ok("Dispute resolved successfully", disputeService.disputeToMap(d)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN & OBSERVER QUERY VIEWS
    // ─────────────────────────────────────────────────────────────


    /** Observer assigned verification cases */
    @GetMapping("/observer/cases")
    public ResponseEntity<?> getObserverCases(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            List<Map<String, Object>> cases = disputeService.getObserverAssignedCases(userId);
            return ResponseEntity.ok(ApiResponse.ok(cases));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}
