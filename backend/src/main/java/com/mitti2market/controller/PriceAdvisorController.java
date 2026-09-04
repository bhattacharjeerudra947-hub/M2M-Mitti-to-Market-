package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
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
     * GET /api/price-advisor/{cropName}?location=Pune&desiredPrice=30
     * Get detailed market analysis and AI suggestion for a specific crop.
     */
    @GetMapping("/{cropName}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCropAnalysis(
            @PathVariable String cropName,
            @RequestParam(required = false) String location,
            @RequestParam(required = false, defaultValue = "0") double desiredPrice) {

        Map<String, Object> analysis = marketDataService.getMarketAnalysis(cropName, location, desiredPrice);
        return ResponseEntity.ok(ApiResponse.ok(analysis));
    }

    /**
     * POST /api/price-advisor/suggest
     * Get AI price suggestion for a specific produce listing.
     * Used by AddProduce page to show real-time price suggestions.
     */
    @PostMapping("/suggest")
    public ResponseEntity<ApiResponse<Map<String, Object>>> suggestPrice(
            @RequestBody Map<String, Object> body) {

        String cropName = (String) body.getOrDefault("cropName", "");
        String location = (String) body.get("location");
        double desiredPrice = body.containsKey("desiredPrice")
                ? Double.parseDouble(body.get("desiredPrice").toString()) : 0;

        Map<String, Object> analysis = marketDataService.getMarketAnalysis(cropName, location, desiredPrice);
        return ResponseEntity.ok(ApiResponse.ok(analysis));
    }
}
