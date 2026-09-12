package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.InventoryLot;
import com.mitti2market.model.User;
import com.mitti2market.model.WarehouseHub;
import com.mitti2market.repository.UserRepository;
import com.mitti2market.service.CloudinaryService;
import com.mitti2market.service.InventoryLotService;
import com.mitti2market.service.WarehouseHubService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/hubs")
@RequiredArgsConstructor
public class WarehouseHubController {

    private final WarehouseHubService hubService;
    private final InventoryLotService lotService;
    private final CloudinaryService cloudinaryService;
    private final TokenService tokens;
    private final UserRepository userRepo;

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }

    private User getAuthenticatedUser(String authHeader) {
        Long userId = extractUserId(authHeader);
        return userId != null ? userRepo.findById(userId).orElse(null) : null;
    }

    /** GET /api/hubs — list all active partner hubs */
    @GetMapping
    public ResponseEntity<?> getHubs(
            @RequestParam(required = false) String crop,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) Double minCapacity
    ) {
        List<WarehouseHub> list = hubService.getActiveHubs();
        if (state != null && !state.isBlank()) {
            list = list.stream().filter(h -> h.getState() != null && h.getState().equalsIgnoreCase(state)).toList();
        }
        if (crop != null && !crop.isBlank()) {
            list = list.stream().filter(h -> h.supportsCrop(crop)).toList();
        }
        if (minCapacity != null) {
            list = list.stream().filter(h -> h.getAvailableCapacityKg() >= minCapacity).toList();
        }
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /** GET /api/hubs/suitable — query suitable hubs near a coordinate with capacity & compatibility checks */
    @GetMapping("/suitable")
    public ResponseEntity<?> findSuitable(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(required = false, defaultValue = "") String crop,
            @RequestParam(required = false, defaultValue = "1000") double quantityKg
    ) {
        var suitable = hubService.findSuitableHubs(latitude, longitude, crop, quantityKg);
        return ResponseEntity.ok(ApiResponse.ok(suitable));
    }

    /** GET /api/hubs/{id} — hub details */
    @GetMapping("/{id}")
    public ResponseEntity<?> getHub(@PathVariable Long id) {
        WarehouseHub hub = hubService.getHubById(id);
        hub.recalculateAvailable();
        return ResponseEntity.ok(ApiResponse.ok(hub));
    }

    /** POST /api/hubs — create new partner hub (Admin / Hub Operator) */
    @PostMapping
    public ResponseEntity<?> createHub(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody WarehouseHub hub
    ) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null || (user.getRole() != User.Role.ADMIN && user.getRole() != User.Role.HUB_OPERATOR)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Only Admin or Hub Operators can create hubs"));
        }
        WarehouseHub created = hubService.createHub(hub);
        return ResponseEntity.ok(ApiResponse.ok("Hub created successfully", created));
    }

    /** PUT /api/hubs/{id} — update hub */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateHub(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody WarehouseHub update
    ) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null || (user.getRole() != User.Role.ADMIN && user.getRole() != User.Role.HUB_OPERATOR)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Only Admin or Hub Operators can update hubs"));
        }
        WarehouseHub updated = hubService.updateHub(id, update);
        return ResponseEntity.ok(ApiResponse.ok("Hub updated", updated));
    }

    /** GET /api/hubs/{id}/inventory — view hub inventory lots */
    @GetMapping("/{id}/inventory")
    public ResponseEntity<?> getHubInventory(@PathVariable Long id) {
        List<InventoryLot> lots = lotService.getLotsByHub(id);
        return ResponseEntity.ok(ApiResponse.ok(lots));
    }

    /** POST /api/hubs/{id}/inbound — record incoming produce lot with verification evidence */
    @PostMapping({ "/{id}/inbound", "/{id}/inventory/inbound" })
    public ResponseEntity<?> recordInboundLot(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        String cropName = (String) body.get("cropName");
        String grade = (String) body.get("variety");
        Double receivedQty = body.get("inboundQuantityKg") != null ? Double.valueOf(body.get("inboundQuantityKg").toString()) : null;
        Double expectedQty = body.get("expectedQuantityKg") != null ? Double.valueOf(body.get("expectedQuantityKg").toString()) : receivedQty;
        String condition = (String) body.get("lotCondition");
        String packagingType = (String) body.get("packagingType");
        String bay = (String) body.get("storageBay");
        Long dealId = body.get("dealId") != null ? Long.valueOf(body.get("dealId").toString()) : null;
        Long orderId = body.get("orderId") != null ? Long.valueOf(body.get("orderId").toString()) : null;
        Long farmerId = body.get("farmerId") != null ? Long.valueOf(body.get("farmerId").toString()) : null;
        String notes = (String) body.get("notes");
        String evidenceUrl = (String) body.get("evidencePhotoUrl");

        InventoryLot.LotCondition lotCond = InventoryLot.LotCondition.GOOD;
        try {
            if (condition != null) {
                if (condition.startsWith("EXCELLENT")) lotCond = InventoryLot.LotCondition.EXCELLENT;
                else if (condition.startsWith("ACCEPTABLE")) lotCond = InventoryLot.LotCondition.ACCEPTABLE;
                else if (condition.startsWith("DAMAGED") || condition.startsWith("SPOILED")) lotCond = InventoryLot.LotCondition.DAMAGED;
                else lotCond = InventoryLot.LotCondition.valueOf(condition);
            }
        } catch (Exception ignored) {}

        InventoryLot.PackagingType pkgType = InventoryLot.PackagingType.GUNNY_BAGS;
        try {
            if (packagingType != null) {
                if (packagingType.contains("CRATE")) pkgType = InventoryLot.PackagingType.PLASTIC_CRATES;
                else if (packagingType.contains("BOX")) pkgType = InventoryLot.PackagingType.CORRUGATED_BOXES;
                else if (packagingType.contains("BULK") || packagingType.contains("PALLET")) pkgType = InventoryLot.PackagingType.BULK;
                else pkgType = InventoryLot.PackagingType.valueOf(packagingType);
            }
        } catch (Exception ignored) {}

        InventoryLot lot = lotService.recordInbound(
                id, user.getId(), cropName, grade, receivedQty, expectedQty,
                lotCond, pkgType, bay, dealId, orderId, farmerId, notes, evidenceUrl
        );

        return ResponseEntity.ok(ApiResponse.ok("Lot received and verified at hub", lot));
    }

    /** POST /api/hubs/{id}/outbound — record outbound dispatch */
    @PostMapping({ "/{id}/outbound", "/{id}/inventory/outbound" })
    public ResponseEntity<?> recordOutbound(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        User user = getAuthenticatedUser(authHeader);
        if (user == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        String lotId = (String) body.get("lotId");
        Double dispatchQty = body.get("dispatchQuantityKg") != null ? Double.valueOf(body.get("dispatchQuantityKg").toString()) : null;
        String dest = (String) body.get("destinationLocation");
        String buyerName = (String) body.get("buyerName");
        Long dealId = body.get("dealId") != null ? Long.valueOf(body.get("dealId").toString()) : null;
        String notes = (String) body.get("dispatchNotes");
        String evidenceUrl = (String) body.get("evidenceImageUrl");

        InventoryLot lot = lotService.recordOutboundDispatch(
                lotId, user.getId(), dispatchQty, dest, buyerName, dealId, notes, evidenceUrl
        );

        return ResponseEntity.ok(ApiResponse.ok("Outbound dispatch recorded", lot));
    }
}
