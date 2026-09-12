package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.Deal;
import com.mitti2market.model.ReturnInspection;
import com.mitti2market.model.ReverseLogistics;
import com.mitti2market.model.User;
import com.mitti2market.repository.DealRepository;
import com.mitti2market.repository.UserRepository;
import com.mitti2market.service.CloudinaryService;
import com.mitti2market.service.ReverseLogisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReverseLogisticsController {

    private final ReverseLogisticsService reverseService;
    private final DealRepository dealRepo;
    private final UserRepository userRepo;
    private final CloudinaryService cloudinaryService;
    private final TokenService tokens;

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }

    private User getAuthenticatedUser(String authHeader) {
        Long userId = extractUserId(authHeader);
        return userId != null ? userRepo.findById(userId).orElse(null) : null;
    }

    /** GET /api/deals/{dealId}/reverse-logistics/optimize — preview reverse route recommendation */
    @GetMapping("/deals/{dealId}/reverse-logistics/optimize")
    public ResponseEntity<?> previewOptimization(
            @PathVariable Long dealId,
            @RequestParam(required = false, defaultValue = "100") double returnQuantityKg
    ) {
        Deal deal = dealRepo.findById(dealId).orElse(null);
        if (deal == null) return ResponseEntity.badRequest().body(ApiResponse.error("Deal not found"));

        double buyerLat = deal.getDeliveryLatitude() != null ? deal.getDeliveryLatitude() : 18.5204;
        double buyerLng = deal.getDeliveryLongitude() != null ? deal.getDeliveryLongitude() : 73.8567;
        double farmerLat = deal.getPickupLatitude() != null ? deal.getPickupLatitude() : 19.9975;
        double farmerLng = deal.getPickupLongitude() != null ? deal.getPickupLongitude() : 73.7898;

        var opt = reverseService.optimizeReverseDestination(
                buyerLat, buyerLng, deal.getDeliveryLocation(),
                farmerLat, farmerLng, deal.getPickupLocation(),
                deal.getCropName(), returnQuantityKg
        );

        return ResponseEntity.ok(ApiResponse.ok(opt));
    }

    /** POST /api/deals/{dealId}/reverse-logistics — buyer requests return */
    @PostMapping("/deals/{dealId}/reverse-logistics")
    public ResponseEntity<?> requestReturn(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestBody Map<String, Object> body
    ) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        String reasonStr = (String) body.get("reason");
        ReverseLogistics.ReturnReason reason = ReverseLogistics.ReturnReason.valueOf(reasonStr != null ? reasonStr : "OTHER");
        Double qty = body.get("returnQuantityKg") != null ? Double.valueOf(body.get("returnQuantityKg").toString()) : null;
        String notes = (String) body.get("rejectionNotes");
        String evidenceUrl = (String) body.get("evidenceImageUrl");

        ReverseLogistics rev = reverseService.requestReturn(dealId, user.getId(), reason, qty, notes, evidenceUrl);
        return ResponseEntity.ok(ApiResponse.ok("Return requested", rev));
    }

    /** POST /api/deals/{dealId}/reverse-logistics/upload — upload return photo with file */
    @PostMapping(value = "/deals/{dealId}/reverse-logistics/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> requestReturnWithFile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("reason") String reasonStr,
            @RequestParam("returnQuantityKg") Double returnQuantityKg,
            @RequestParam(value = "rejectionNotes", required = false) String notes
    ) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        String imageUrl = null;
        if (file != null && !file.isEmpty()) {
            imageUrl = cloudinaryService.uploadFile(file, "mitti2market/reverse");
        }

        ReverseLogistics.ReturnReason reason = ReverseLogistics.ReturnReason.valueOf(reasonStr);
        ReverseLogistics rev = reverseService.requestReturn(dealId, user.getId(), reason, returnQuantityKg, notes, imageUrl);
        return ResponseEntity.ok(ApiResponse.ok("Return requested", rev));
    }

    /** GET /api/deals/{dealId}/reverse-logistics — list returns for deal */
    @GetMapping("/deals/{dealId}/reverse-logistics")
    public ResponseEntity<?> getReturnsByDeal(@PathVariable Long dealId) {
        List<ReverseLogistics> list = reverseService.getReverseLogisticsByDeal(dealId);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /** GET /api/reverse-logistics/my — list returns involved with current user */
    @GetMapping("/reverse-logistics/my")
    public ResponseEntity<?> getMyReturns(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<ReverseLogistics> list;
        if (user.getRole() == User.Role.ADMIN) {
            list = reverseService.getAllForAdmin();
        } else {
            list = reverseService.getReverseLogisticsForUser(user.getId());
        }
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /** GET /api/reverse-logistics/{id} — get details */
    @GetMapping("/reverse-logistics/{id}")
    public ResponseEntity<?> getReverseDetails(@PathVariable Long id) {
        ReverseLogistics rev = reverseService.getById(id);
        var inspection = reverseService.getInspectionByReverseId(id).orElse(null);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("reverseLogistics", rev);
        data.put("inspection", inspection);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    /** PUT /api/reverse-logistics/{id}/approve — approve return and schedule reverse transport */
    @PutMapping("/reverse-logistics/{id}/approve")
    public ResponseEntity<?> approveReturn(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        Long hubIdOverride = body != null && body.get("hubId") != null ? Long.valueOf(body.get("hubId").toString()) : null;
        ReverseLogistics approved = reverseService.approveReturn(id, user.getId(), hubIdOverride);
        return ResponseEntity.ok(ApiResponse.ok("Return approved", approved));
    }

    /** PUT /api/reverse-logistics/{id}/status — update status */
    @PutMapping("/reverse-logistics/{id}/status")
    public ResponseEntity<?> updateStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        ReverseLogistics.ReverseStatus status = ReverseLogistics.ReverseStatus.valueOf(body.get("status"));
        ReverseLogistics updated = reverseService.updateReverseStatus(id, user.getId(), status);
        return ResponseEntity.ok(ApiResponse.ok("Status updated", updated));
    }

    /** POST /api/reverse-logistics/{id}/inspection — submit return inspection report */
    @PostMapping("/reverse-logistics/{id}/inspection")
    public ResponseEntity<?> submitInspection(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        Double verifiedQty = body.get("verifiedQuantityKg") != null ? Double.valueOf(body.get("verifiedQuantityKg").toString()) : null;
        String condStr = (String) body.get("condition");
        ReturnInspection.ProduceCondition condition = condStr != null ? ReturnInspection.ProduceCondition.valueOf(condStr) : ReturnInspection.ProduceCondition.GOOD_CONDITION;
        String decStr = (String) body.get("decision");
        ReturnInspection.InspectionDecision decision = ReturnInspection.InspectionDecision.valueOf(decStr);
        String notes = (String) body.get("decisionNotes");
        Double discountPrice = body.get("discountedPricePerKg") != null ? Double.valueOf(body.get("discountedPricePerKg").toString()) : null;
        String redirectionTarget = (String) body.get("redirectionTarget");
        String evidenceUrl = (String) body.get("evidenceImageUrl");

        ReturnInspection insp = reverseService.submitInspection(
                id, user.getId(), verifiedQty, condition, decision, notes, discountPrice, redirectionTarget, evidenceUrl
        );

        return ResponseEntity.ok(ApiResponse.ok("Return inspection submitted", insp));
    }
}
