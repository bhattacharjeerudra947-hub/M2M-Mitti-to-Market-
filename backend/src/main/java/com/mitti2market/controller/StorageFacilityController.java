package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.StorageComparisonDto;
import com.mitti2market.dto.StorageCostBreakdownDto;
import com.mitti2market.dto.StorageFacilityDto;
import com.mitti2market.model.InventoryLot;
import com.mitti2market.model.InventoryLot.BillingModel;
import com.mitti2market.model.InventoryLot.LotStatus;
import com.mitti2market.model.InventoryLot.StorageInvoiceStatus;
import com.mitti2market.model.User;
import com.mitti2market.model.WarehouseHub;
import com.mitti2market.repository.InventoryLotRepository;
import com.mitti2market.repository.UserRepository;
import com.mitti2market.repository.WarehouseHubRepository;
import com.mitti2market.service.StorageComparisonService;
import com.mitti2market.service.StorageFacilityService;
import com.mitti2market.service.StoragePricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StorageFacilityController {

    private final StorageFacilityService storageFacilityService;
    private final StoragePricingService storagePricingService;
    private final StorageComparisonService storageComparisonService;
    private final InventoryLotRepository inventoryLotRepository;
    private final WarehouseHubRepository hubRepository;
    private final UserRepository userRepository;

    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<StorageFacilityDto>>> getNearbyFacilities(
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String district,
            @RequestParam(required = false, defaultValue = "50000") Integer radius) {

        List<StorageFacilityDto> facilities = storageFacilityService.findNearbyFacilities(
                latitude, longitude, query, district, radius);
        return ResponseEntity.ok(ApiResponse.ok(facilities));
    }

    /**
     * POST /api/storage/calculate
     * Configurable storage expense calculator supporting multiple billing models.
     */
    @PostMapping("/calculate")
    public ResponseEntity<ApiResponse<StorageCostBreakdownDto>> calculateCost(
            @RequestBody Map<String, Object> body) {

        Double quantityKg = body.get("quantityKg") != null ? Double.parseDouble(body.get("quantityKg").toString()) : 1000.0;
        Long durationDays = body.get("durationDays") != null ? Long.parseLong(body.get("durationDays").toString()) : 30L;
        String billingModelStr = (String) body.getOrDefault("billingModel", "PER_KG_PER_DAY");
        BillingModel billingModel = BillingModel.valueOf(billingModelStr.toUpperCase());
        Double ratePerUnit = body.get("ratePerUnit") != null ? Double.parseDouble(body.get("ratePerUnit").toString()) : 0.50;
        Double fixedBookingFee = body.get("fixedBookingFee") != null ? Double.parseDouble(body.get("fixedBookingFee").toString()) : 0.0;
        Double loadingUnloadingFee = body.get("loadingUnloadingFee") != null ? Double.parseDouble(body.get("loadingUnloadingFee").toString()) : 0.0;
        Double handlingPackagingFee = body.get("handlingPackagingFee") != null ? Double.parseDouble(body.get("handlingPackagingFee").toString()) : 0.0;
        Double transportationFee = body.get("transportationFee") != null ? Double.parseDouble(body.get("transportationFee").toString()) : 0.0;
        Double taxAndOtherFee = body.get("taxAndOtherFee") != null ? Double.parseDouble(body.get("taxAndOtherFee").toString()) : 0.0;

        StorageCostBreakdownDto breakdown = storagePricingService.calculateStorageExpense(
                quantityKg, durationDays, billingModel, ratePerUnit, fixedBookingFee,
                loadingUnloadingFee, handlingPackagingFee, transportationFee, taxAndOtherFee, false
        );

        return ResponseEntity.ok(ApiResponse.ok(breakdown));
    }

    /**
     * POST /api/storage/compare
     * Compare Scenario A (Sell Immediately) vs Scenario B (Store in Facility & Sell Later).
     */
    @PostMapping("/compare")
    public ResponseEntity<ApiResponse<StorageComparisonDto>> compareScenarios(
            @RequestBody Map<String, Object> body) {

        String cropName = (String) body.getOrDefault("cropName", "Tomato");
        Double quantityKg = body.get("quantityKg") != null ? Double.parseDouble(body.get("quantityKg").toString()) : 1000.0;
        Double currentPrice = body.get("currentPricePerKg") != null ? Double.parseDouble(body.get("currentPricePerKg").toString()) : null;
        Double futurePrice = body.get("futurePricePerKg") != null ? Double.parseDouble(body.get("futurePricePerKg").toString()) : null;
        Integer storageDays = body.get("storageDays") != null ? Integer.parseInt(body.get("storageDays").toString()) : 30;
        String billingModelStr = (String) body.getOrDefault("billingModel", "PER_KG_PER_DAY");
        BillingModel billingModel = BillingModel.valueOf(billingModelStr.toUpperCase());
        Double dailyRate = body.get("dailyStorageRate") != null ? Double.parseDouble(body.get("dailyStorageRate").toString()) : 0.50;
        Double loadingFee = body.get("loadingFee") != null ? Double.parseDouble(body.get("loadingFee").toString()) : null;
        Double handlingFee = body.get("handlingFee") != null ? Double.parseDouble(body.get("handlingFee").toString()) : null;
        Double transportFee = body.get("transportFee") != null ? Double.parseDouble(body.get("transportFee").toString()) : null;
        Double productionCostTotal = body.get("productionCostTotal") != null ? Double.parseDouble(body.get("productionCostTotal").toString()) : null;
        Double qualityLossPct = body.get("qualityLossPct") != null ? Double.parseDouble(body.get("qualityLossPct").toString()) : 2.0;

        StorageComparisonDto comparison = storageComparisonService.compareScenarios(
                cropName, quantityKg, currentPrice, futurePrice, storageDays,
                billingModel, dailyRate, loadingFee, handlingFee, transportFee, productionCostTotal, qualityLossPct
        );

        return ResponseEntity.ok(ApiResponse.ok(comparison));
    }

    /**
     * GET /api/storage/lots/farmer/{farmerId}
     * Get all storage produce lots for a farmer/FPO along with accumulated cost metrics.
     */
    @GetMapping("/lots/farmer/{farmerId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFarmerStorageLots(@PathVariable Long farmerId) {
        List<InventoryLot> lots = inventoryLotRepository.findByFarmerIdOrderByCreatedAtDesc(farmerId);

        LocalDateTime now = LocalDateTime.now();
        double totalStoredKg = 0.0;
        double totalAvailableKg = 0.0;
        double totalAccumulatedCost = 0.0;
        double totalEstimatedBill = 0.0;

        List<Map<String, Object>> lotResponses = new ArrayList<>();
        for (InventoryLot lot : lots) {
            double initial = lot.getInitialQuantityKg() != null ? lot.getInitialQuantityKg() : 0.0;
            double available = lot.getAvailableQuantityKg() != null ? lot.getAvailableQuantityKg() : 0.0;
            double reserved = lot.getReservedQuantityKg() != null ? lot.getReservedQuantityKg() : 0.0;
            double rate = lot.getDailyRatePerUnit() != null ? lot.getDailyRatePerUnit() : 0.50;

            LocalDateTime entry = lot.getInboundDate() != null ? lot.getInboundDate() : lot.getCreatedAt();
            long daysPassed = entry != null ? Math.max(1, ChronoUnit.DAYS.between(entry, now)) : 1;

            LocalDateTime planned = lot.getPlannedReleaseDate() != null ? lot.getPlannedReleaseDate() : (entry != null ? entry.plusDays(30) : now.plusDays(30));
            long totalPlannedDays = entry != null ? Math.max(1, ChronoUnit.DAYS.between(entry, planned)) : 30;

            double accumulatedFee = Math.round(initial * rate * daysPassed);
            double projectedTotalFee = Math.round(initial * rate * totalPlannedDays);

            totalStoredKg += initial;
            totalAvailableKg += available;
            totalAccumulatedCost += (lot.getActualStorageCost() != null && lot.getActualStorageCost() > 0 ? lot.getActualStorageCost() : accumulatedFee);
            totalEstimatedBill += projectedTotalFee;

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", lot.getId());
            map.put("lotId", lot.getLotId());
            map.put("cropName", lot.getCropName());
            map.put("variety", lot.getVariety());
            map.put("initialQuantityKg", initial);
            map.put("availableQuantityKg", available);
            map.put("reservedQuantityKg", reserved);
            map.put("status", lot.getStatus() != null ? lot.getStatus().name() : "IN_STORAGE");
            map.put("condition", lot.getInboundCondition() != null ? lot.getInboundCondition().name() : "GOOD");
            map.put("facilityName", lot.getFacilityName() != null ? lot.getFacilityName() : (lot.getHub() != null ? lot.getHub().getName() : "Partner Cold Storage"));
            map.put("facilityLocation", lot.getFacilityLocation() != null ? lot.getFacilityLocation() : (lot.getHub() != null ? lot.getHub().getLocation() : "Local Agri Hub"));
            map.put("facilityType", lot.getFacilityType() != null ? lot.getFacilityType() : "COLD_STORAGE");
            map.put("bayLocation", lot.getStorageLocationBay());
            map.put("inboundDate", entry);
            map.put("plannedReleaseDate", planned);
            map.put("billingModel", lot.getBillingModel() != null ? lot.getBillingModel().name() : "PER_KG_PER_DAY");
            map.put("dailyRate", rate);
            map.put("accumulatedDays", daysPassed);
            map.put("accumulatedStorageCost", accumulatedFee);
            map.put("projectedTotalCost", projectedTotalFee);
            map.put("actualStorageCost", lot.getActualStorageCost());
            map.put("invoiceNumber", lot.getStorageInvoiceNumber());
            map.put("invoiceStatus", lot.getStorageInvoiceStatus() != null ? lot.getStorageInvoiceStatus().name() : "ESTIMATED");
            map.put("qualityLossPct", lot.getEstimatedQualityLossPct() != null ? lot.getEstimatedQualityLossPct() : 2.0);
            lotResponses.add(map);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("lots", lotResponses);
        result.put("totalStoredKg", Math.round(totalStoredKg));
        result.put("totalAvailableKg", Math.round(totalAvailableKg));
        result.put("totalAccumulatedCost", Math.round(totalAccumulatedCost));
        result.put("totalEstimatedBill", Math.round(totalEstimatedBill));
        result.put("activeLotsCount", lots.size());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * POST /api/storage/lots
     * Record a new produce lot into cold storage or warehouse.
     */
    @PostMapping("/lots")
    public ResponseEntity<ApiResponse<InventoryLot>> recordStorageLot(@RequestBody Map<String, Object> body) {
        Long farmerId = Long.parseLong(body.get("farmerId").toString());
        User farmer = userRepository.findById(farmerId)
                .orElseThrow(() -> new IllegalArgumentException("Farmer not found: " + farmerId));

        String cropName = (String) body.getOrDefault("cropName", "Tomato");
        String variety = (String) body.getOrDefault("variety", "Hybrid");
        Double quantityKg = Double.parseDouble(body.get("quantityKg").toString());
        String facilityName = (String) body.getOrDefault("facilityName", "Partner Agri Cold Storage");
        String facilityLocation = (String) body.getOrDefault("facilityLocation", farmer.getLocation() != null ? farmer.getLocation() : "Pune Hub");
        String facilityType = (String) body.getOrDefault("facilityType", "COLD_STORAGE");
        String bay = (String) body.getOrDefault("storageLocationBay", "Bay A - Staging Room");
        Double dailyRate = body.get("dailyRate") != null ? Double.parseDouble(body.get("dailyRate").toString()) : 0.50;
        Integer days = body.get("storageDays") != null ? Integer.parseInt(body.get("storageDays").toString()) : 30;

        WarehouseHub hub = null;
        if (body.get("hubId") != null) {
            Long hubId = Long.parseLong(body.get("hubId").toString());
            hub = hubRepository.findById(hubId).orElse(null);
        }

        LocalDateTime now = LocalDateTime.now();
        String lotId = "LOT-M2M-" + LocalDate.now().toString().replace("-", "") + "-" + (1000 + new Random().nextInt(9000));

        double estimatedCost = Math.round(quantityKg * dailyRate * days);

        InventoryLot lot = InventoryLot.builder()
                .lotId(lotId)
                .farmer(farmer)
                .hub(hub)
                .cropName(cropName)
                .variety(variety)
                .initialQuantityKg(quantityKg)
                .availableQuantityKg(quantityKg)
                .reservedQuantityKg(0.0)
                .dispatchedQuantityKg(0.0)
                .quarantinedQuantityKg(0.0)
                .inboundCondition(InventoryLot.LotCondition.GOOD)
                .packagingType(InventoryLot.PackagingType.PLASTIC_CRATES)
                .status(LotStatus.IN_STORAGE)
                .facilityName(facilityName)
                .facilityLocation(facilityLocation)
                .facilityType(facilityType)
                .storageLocationBay(bay)
                .inboundDate(now)
                .plannedReleaseDate(now.plusDays(days))
                .billingModel(BillingModel.PER_KG_PER_DAY)
                .dailyRatePerUnit(dailyRate)
                .estimatedStorageCost(estimatedCost)
                .storageInvoiceStatus(StorageInvoiceStatus.ESTIMATED)
                .estimatedQualityLossPct(2.0)
                .inboundNotes((String) body.getOrDefault("notes", "Farmer-recorded storage deposit"))
                .build();

        InventoryLot saved = inventoryLotRepository.save(lot);
        return ResponseEntity.ok(ApiResponse.ok("Produce lot successfully recorded into storage", saved));
    }

    /**
     * PATCH /api/storage/lots/{id}/invoice
     * Reconcile and finalize actual storage invoice.
     */
    @PatchMapping("/lots/{id}/invoice")
    public ResponseEntity<ApiResponse<InventoryLot>> updateStorageInvoice(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        InventoryLot lot = inventoryLotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lot not found: " + id));

        if (body.get("actualStorageCost") != null) {
            lot.setActualStorageCost(Double.parseDouble(body.get("actualStorageCost").toString()));
        }
        if (body.get("invoiceNumber") != null) {
            lot.setStorageInvoiceNumber((String) body.get("invoiceNumber"));
        }
        if (body.get("invoiceStatus") != null) {
            lot.setStorageInvoiceStatus(StorageInvoiceStatus.valueOf(body.get("invoiceStatus").toString().toUpperCase()));
        }
        if (body.get("actualReleaseDate") != null) {
            lot.setActualReleaseDate(LocalDateTime.now());
            lot.setStatus(LotStatus.COMPLETED);
        }
        lot.setStorageInvoiceDate(LocalDateTime.now());

        InventoryLot updated = inventoryLotRepository.save(lot);
        return ResponseEntity.ok(ApiResponse.ok("Storage invoice reconciled successfully", updated));
    }
}

