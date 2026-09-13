package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.service.DatasetPriceService;
import com.mitti2market.service.MarketDataService;
import com.mitti2market.service.ProduceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/price-advisor")
@RequiredArgsConstructor
public class PriceAdvisorController {

    private final MarketDataService marketDataService;
    private final ProduceService produceService;

    private final DatasetPriceService datasetPriceService;

    /**
     * GET /api/price-advisor/estimate?crop=Tomato&state=West Bengal
     * Dataset/mandi-backed price estimate. Source is disclosed; when neither
     * the trained model nor live mandi data covers the crop, source=UNAVAILABLE.
     */
    @GetMapping("/estimate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> estimate(
            @RequestParam String crop,
            @RequestParam(required = false) String state) {
        return ResponseEntity.ok(ApiResponse.ok(datasetPriceService.estimate(crop, state, null)));
    }

    /**
     * GET /api/price-advisor/all
     * Get AI price suggestions for all known crops.
     */
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllCropPrices() {
        List<Map<String, Object>> crops = marketDataService.getAllCropPrices();
        return ResponseEntity.ok(ApiResponse.ok(crops));
    }

    /**
     * GET /api/price-advisor/{cropName}?location=Pune&desiredPrice=30&distanceKm=80
     * Get detailed market analysis and AI suggestion for a specific crop, including logistics freight.
     */
    @GetMapping("/{cropName}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCropAnalysis(
            @PathVariable String cropName,
            @RequestParam(required = false) String location,
            @RequestParam(required = false, defaultValue = "0") double desiredPrice,
            @RequestParam(required = false) Double distanceKm,
            @RequestParam(required = false) String destination) {

        Map<String, Object> analysis = marketDataService.getMarketAnalysis(cropName, location, desiredPrice, distanceKm, destination);
        return ResponseEntity.ok(ApiResponse.ok(analysis));
    }

    /**
     * POST /api/price-advisor/suggest
     * Get AI price suggestion for a specific produce listing.
     * Used by AddProduce page to show real-time price suggestions including logistics.
     */
    @PostMapping("/suggest")
    public ResponseEntity<ApiResponse<Map<String, Object>>> suggestPrice(
            @RequestBody Map<String, Object> body) {

        String cropName = (String) body.getOrDefault("cropName", "");
        String location = (String) body.get("location");
        double desiredPrice = body.containsKey("desiredPrice")
                ? Double.parseDouble(body.get("desiredPrice").toString()) : 0;
        Double distanceKm = body.get("distanceKm") != null
                ? Double.parseDouble(body.get("distanceKm").toString()) : null;
        String destination = (String) body.get("destination");

        Map<String, Object> analysis = marketDataService.getMarketAnalysis(cropName, location, desiredPrice, distanceKm, destination);
        return ResponseEntity.ok(ApiResponse.ok(analysis));
    }
}
