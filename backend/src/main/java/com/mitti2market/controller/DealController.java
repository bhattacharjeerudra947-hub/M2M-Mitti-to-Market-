package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.exception.BadRequestException;
import com.mitti2market.model.Deal;
import com.mitti2market.model.DeliveryConfirmation;
import com.mitti2market.model.Logistics;
import com.mitti2market.model.LogisticsEvent;
import com.mitti2market.service.DealService;
import com.mitti2market.service.DealStateMachineService;
import com.mitti2market.service.LogisticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deals")
public class DealController {

    private final DealService dealService;
    private final LogisticsService logisticsService;
    private final DealStateMachineService stateMachine;
    private final TokenService tokens;

    public DealController(DealService dealService, LogisticsService logisticsService,
                          DealStateMachineService stateMachine,
                          TokenService tokens) {
        this.dealService = dealService;
        this.logisticsService = logisticsService;
        this.stateMachine = stateMachine;
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

    /** Get the full audit timeline for a deal */
    @GetMapping("/{dealId}/timeline")
    public ResponseEntity<?> getDealTimeline(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> events = stateMachine.getTimeline(dealId).stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.getId());
            m.put("eventType", e.getEventType());
            m.put("actorId", e.getActorId());
            m.put("actorRole", e.getActorRole());
            m.put("description", e.getDescription());
            m.put("metadata", e.getMetadata());
            m.put("createdAt", e.getCreatedAt());
            return m;
        }).toList();
        return ResponseEntity.ok(ApiResponse.ok(events));
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

    /** Configure Own Logistics for a deal */
    @PostMapping("/{dealId}/logistics/own")
    public ResponseEntity<?> configureOwnLogistics(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Map<String, Object> result = logisticsService.configureOwnLogistics(dealId, userId, body);
            return ResponseEntity.ok(ApiResponse.ok("Own logistics configured", result));
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

    /** Current route summary: distance / ETA / cost (pickup → delivery) */
    @GetMapping("/logistics/{logisticsId}/route")
    public ResponseEntity<?> getRoute(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long logisticsId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            return ResponseEntity.ok(ApiResponse.ok("Route estimate", logisticsService.getRouteSummary(logisticsId, userId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Update live logistics / driver location */
    @RequestMapping(value = "/logistics/{logisticsId}/location", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> updateLogisticsLocation(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long logisticsId,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            Double lat = body.get("latitude") != null ? Double.valueOf(body.get("latitude").toString()) : null;
            Double lng = body.get("longitude") != null ? Double.valueOf(body.get("longitude").toString()) : null;
            Logistics logistics = logisticsService.updateLiveLocation(logisticsId, userId, lat, lng);
            return ResponseEntity.ok(ApiResponse.ok("Location updated", Map.of(
                    "id", logistics.getId(),
                    "trackingId", logistics.getTrackingId()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Set logistics coordinates (registered or live) for a deal and recompute shared route */
    @RequestMapping(value = "/{dealId}/locations", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> setDealLocations(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId,
            @RequestBody com.mitti2market.dto.RouteRequest body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            return ResponseEntity.ok(ApiResponse.ok("Deal locations updated", logisticsService.setDealLocations(dealId, userId, body)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Get identical shared route info and polyline for both Farmer and Buyer */
    @GetMapping("/{dealId}/route-info")
    public ResponseEntity<?> getDealRouteInfo(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long dealId) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            return ResponseEntity.ok(ApiResponse.ok("Deal route info", logisticsService.getSharedRouteInfo(dealId, userId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Optimize a multi-stop route (capacity-aware nearest-neighbor) */
    @PostMapping("/logistics/optimize-route")
    public ResponseEntity<?> optimizeRoute(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> stops = (List<Map<String, Object>>) body.get("stops");
            @SuppressWarnings("unchecked")
            List<Double> originList = (List<Double>) body.get("origin");
            Double capacity = body.get("capacityKg") != null
                    ? Double.valueOf(body.get("capacityKg").toString()) : null;

            if (stops == null || originList == null || originList.size() < 2) {
                throw new com.mitti2market.exception.BadRequestException("origin [lat,lng] and stops are required");
            }
            var result = logisticsService.optimizeRoute(
                    new double[]{originList.get(0), originList.get(1)}, stops, capacity);
            return ResponseEntity.ok(ApiResponse.ok("Route optimized", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** All logistics records involving the authenticated user (farmer or buyer). */
    @GetMapping("/logistics/my")
    public ResponseEntity<?> getMyLogistics(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        return ResponseEntity.ok(ApiResponse.ok(logisticsService.getMyLogistics(userId)));
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
        return ResponseEntity.ok(ApiResponse.ok(logisticsToMap(logistics)));
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

    private Map<String, Object> logisticsToMap(Logistics l) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", l.getId());
        resp.put("trackingId", l.getTrackingId());
        resp.put("type", l.getType().name());
        resp.put("status", l.getStatus() != null ? l.getStatus().name() : "");
        resp.put("vehicleNumber", l.getVehicleNumber() != null ? l.getVehicleNumber() : "");
        resp.put("vehicleType", l.getVehicleType() != null ? l.getVehicleType() : "");
        resp.put("pickupLocation", l.getPickupLocation() != null ? l.getPickupLocation() : "");
        resp.put("deliveryLocation", l.getDeliveryLocation() != null ? l.getDeliveryLocation() : "");
        resp.put("pickupLatitude", l.getPickupLatitude());
        resp.put("pickupLongitude", l.getPickupLongitude());
        resp.put("deliveryLatitude", l.getDeliveryLatitude());
        resp.put("deliveryLongitude", l.getDeliveryLongitude());
        resp.put("scheduledPickup", l.getScheduledPickup());
        resp.put("expectedDelivery", l.getExpectedDelivery());
        resp.put("routeDistanceKm", l.getRouteDistanceKm());
        resp.put("routeDurationMinutes", l.getRouteDurationMinutes());
        resp.put("routeEstimatedCost", l.getRouteEstimatedCost());
        resp.put("routeProvider", l.getRouteProvider());
        resp.put("routeSummary", l.getRouteSummary());
        resp.put("routeCaveat", l.getRouteCaveat());
        resp.put("routeComputedAt", l.getRouteComputedAt());
        return resp;
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}
