package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.StorageFacilityDto;
import com.mitti2market.service.StorageFacilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StorageFacilityController {

    private final StorageFacilityService storageFacilityService;

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
}
