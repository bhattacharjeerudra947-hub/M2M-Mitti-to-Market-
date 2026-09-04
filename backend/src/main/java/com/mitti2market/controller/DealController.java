package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.Deal;
import com.mitti2market.model.DeliveryConfirmation;
import com.mitti2market.model.Logistics;
import com.mitti2market.model.LogisticsEvent;
import com.mitti2market.service.DealService;
import com.mitti2market.service.LogisticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deals")
public class DealController {

    private final DealService dealService;
    private final LogisticsService logisticsService;
    private final TokenService tokens;

    public DealController(DealService dealService, LogisticsService logisticsService, TokenService tokens) {
        this.dealService = dealService;
        this.logisticsService = logisticsService;
        this.tokens = tokens;
    }

    /** Initiate deal lock from chat */
    @PostMapping("/lock")
    public ResponseEntity<?> initiateDealLock(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            String conversationId = (String) body.get("conversationId");
            @SuppressWarnings("unchecked")
            Map<String, Object> details = (Map<String, Object>) body.get("details");
            if (details == null) details = body;

            Deal deal = dealService.initiateDealLock(userId, conversationId, details);
            return ResponseEntity.ok(ApiResponse.ok("Deal lock initiated", dealService.toDealResponse(deal)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Confirm a deal */
    @PostMapping("/{dealId}/confirm")
    public ResponseEntity<?> confirmDeal(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Deal deal = dealService.confirmDeal(dealId, userId);
            return ResponseEntity.ok(ApiResponse.ok("Deal confirmed", dealService.toDealResponse(deal)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Cancel a deal */
    @PostMapping("/{dealId}/cancel")
    public ResponseEntity<?> cancelDeal(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Deal deal = dealService.cancelDeal(dealId, userId);
            return ResponseEntity.ok(ApiResponse.ok("Deal cancelled", dealService.toDealResponse(deal)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Get deal details */
    @GetMapping("/{dealId}")
    public ResponseEntity<?> getDeal(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Deal deal = dealService.getDeal(dealId);
            return ResponseEntity.ok(ApiResponse.ok(dealService.toDealResponse(deal)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Get deal by conversation ID */
    @GetMapping("/conversation/{conversationId}")
    public ResponseEntity<?> getDealByConversation(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String conversationId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        Deal deal = dealService.getDealByConversation(conversationId);
        if (deal == null) return ResponseEntity.ok(ApiResponse.ok(null));
        return ResponseEntity.ok(ApiResponse.ok(dealService.toDealResponse(deal)));
    }

    /** Get all deals for a farmer */
    @GetMapping("/farmer/{farmerId}")
    public ResponseEntity<?> getFarmerDeals(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long farmerId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Deal> deals = dealService.getFarmerDeals(farmerId);
        return ResponseEntity.ok(ApiResponse.ok(deals.stream().map(dealService::toDealResponse).toList()));
    }

    /** Get all deals for a buyer */
    @GetMapping("/buyer/{buyerId}")
    public ResponseEntity<?> getBuyerDeals(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long buyerId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Deal> deals = dealService.getBuyerDeals(buyerId);
        return ResponseEntity.ok(ApiResponse.ok(deals.stream().map(dealService::toDealResponse).toList()));
    }

    // ──────── Logistics Endpoints ────────

    /** Select logistics type for a deal */
    @PostMapping("/{dealId}/logistics/select")
    public ResponseEntity<?> selectLogistics(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestBody Map<String, String> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Logistics.LogisticsType type = Logistics.LogisticsType.valueOf(body.get("type").toUpperCase());
            Logistics logistics = logisticsService.selectLogistics(dealId, userId, type);
            return ResponseEntity.ok(ApiResponse.ok("Logistics selected", Map.of(
                    "id", logistics.getId(),
                    "trackingId", logistics.getTrackingId(),
                    "type", logistics.getType().name(),
                    "status", logistics.getStatus().name()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Update logistics details (transporter info) */
    @PutMapping("/logistics/{logisticsId}/details")
    public ResponseEntity<?> updateLogisticsDetails(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long logisticsId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Logistics logistics = logisticsService.updateLogisticsDetails(logisticsId, userId, body);
            return ResponseEntity.ok(ApiResponse.ok("Logistics updated", Map.of(
                    "id", logistics.getId(),
                    "trackingId", logistics.getTrackingId(),
                    "status", logistics.getStatus().name()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Update logistics status */
    @PutMapping("/logistics/{logisticsId}/status")
    public ResponseEntity<?> updateLogisticsStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long logisticsId,
            @RequestBody Map<String, String> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Logistics.LogisticsStatus status = Logistics.LogisticsStatus.valueOf(body.get("status").toUpperCase());
            String location = body.get("location");
            String description = body.get("description");
            Logistics logistics = logisticsService.updateStatus(logisticsId, userId, status, location, description);
            return ResponseEntity.ok(ApiResponse.ok("Status updated", Map.of(
                    "id", logistics.getId(),
                    "status", logistics.getStatus().name()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Update live location */
    @PutMapping("/logistics/{logisticsId}/location")
    public ResponseEntity<?> updateLocation(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long logisticsId,
            @RequestBody Map<String, Double> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            logisticsService.updateLocation(logisticsId, body.get("latitude"), body.get("longitude"));
            return ResponseEntity.ok(ApiResponse.ok("Location updated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Get logistics for a deal */
    @GetMapping("/{dealId}/logistics")
    public ResponseEntity<?> getLogistics(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        Logistics logistics = logisticsService.getLogisticsForDeal(dealId);
        if (logistics == null) return ResponseEntity.ok(ApiResponse.ok(null));
        java.util.LinkedHashMap<String, Object> resp = new java.util.LinkedHashMap<>();
        resp.put("id", logistics.getId());
        resp.put("trackingId", logistics.getTrackingId());
        resp.put("type", logistics.getType().name());
        resp.put("status", logistics.getStatus().name());
        resp.put("driverName", logistics.getDriverName() != null ? logistics.getDriverName() : "");
        resp.put("vehicleNumber", logistics.getVehicleNumber() != null ? logistics.getVehicleNumber() : "");
        resp.put("pickupLocation", logistics.getPickupLocation() != null ? logistics.getPickupLocation() : "");
        resp.put("deliveryLocation", logistics.getDeliveryLocation() != null ? logistics.getDeliveryLocation() : "");
        resp.put("scheduledPickup", logistics.getScheduledPickup());
        resp.put("expectedDelivery", logistics.getExpectedDelivery());
        resp.put("lastLocationUpdate", logistics.getLastLocationUpdate());
        resp.put("latitude", logistics.getCurrentLatitude());
        resp.put("longitude", logistics.getCurrentLongitude());
        return ResponseEntity.ok(ApiResponse.ok(resp));
    }

    /** Get logistics timeline */
    @GetMapping("/logistics/{logisticsId}/timeline")
    public ResponseEntity<?> getTimeline(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long logisticsId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<LogisticsEvent> events = logisticsService.getTimeline(logisticsId);
        return ResponseEntity.ok(ApiResponse.ok(events.stream().map(e -> Map.of(
                "id", e.getId(),
                "status", e.getStatus().name(),
                "description", e.getDescription() != null ? e.getDescription() : "",
                "location", e.getLocation() != null ? e.getLocation() : "",
                "timestamp", e.getTimestamp()
        )).toList()));
    }

    /** Confirm delivery (buyer) */
    @PostMapping("/{dealId}/confirm-delivery")
    public ResponseEntity<?> confirmDelivery(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            DeliveryConfirmation confirmation = logisticsService.confirmDelivery(dealId, userId, body);
            Deal deal = dealService.getDeal(dealId);
            return ResponseEntity.ok(ApiResponse.ok("Delivery confirmed", dealService.toDealResponse(deal)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}
