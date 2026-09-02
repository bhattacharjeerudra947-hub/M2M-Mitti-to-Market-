package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.produce.ProduceRequest;
import com.mitti2market.dto.produce.ProduceResponse;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.service.ProduceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/produce")
@RequiredArgsConstructor
public class ProduceController {

    private final ProduceService produceService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProduceResponse>> createProduce(
            @Valid @RequestBody ProduceRequest request) {
        ProduceResponse produced = produceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Produce created successfully", produced));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProduceResponse>>> getAllProduce(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Boolean availableOnly) {
        List<ProduceResponse> produceList = produceService.listAll(category, keyword, location, availableOnly);
        return ResponseEntity.ok(ApiResponse.ok(produceList));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProduceResponse>> getProduceById(@PathVariable Long id) {
        ProduceResponse produce = produceService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok(produce));
    }

    @GetMapping("/farmer/{farmerId}")
    public ResponseEntity<ApiResponse<List<ProduceResponse>>> getProduceByFarmer(@PathVariable Long farmerId) {
        List<ProduceResponse> produceList = produceService.getByFarmer(farmerId);
        return ResponseEntity.ok(ApiResponse.ok(produceList));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProduceResponse>> updateProduce(
            @PathVariable Long id,
            @Valid @RequestBody ProduceRequest request) {
        ProduceResponse updated = produceService.update(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Produce updated successfully", updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ProduceResponse>> updateProduceStatus(
            @PathVariable Long id,
            @RequestParam ProduceStatus status) {
        ProduceResponse updated = produceService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.ok("Status updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduce(@PathVariable Long id) {
        produceService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Produce deleted successfully", null));
    }
}
