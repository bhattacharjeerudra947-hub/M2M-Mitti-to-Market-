package com.mitti2market.controller;

import com.mitti2market.service.MandiPriceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/market-prices")
@CrossOrigin(origins = "http://localhost:5173")
public class MarketPriceController {

    private final MandiPriceService mandiPriceService;

    public MarketPriceController(MandiPriceService mandiPriceService) {
        this.mandiPriceService = mandiPriceService;
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchPrices(
            @RequestParam(required = false) String commodity,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String market) {

        return ResponseEntity.ok(
                mandiPriceService.searchPrices(
                        commodity,
                        state,
                        district,
                        market
                )
        );
    }
}