package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.dto.order.OrderRequest;
import com.mitti2market.dto.order.OrderResponse;
import com.mitti2market.dto.order.OrderStatusUpdateRequest;
import com.mitti2market.model.Order.OrderStatus;
import com.mitti2market.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @Valid @RequestBody OrderRequest request) {
        OrderResponse order = orderService.placeOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Order placed successfully", order));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getAllOrders(
            @RequestParam(required = false) OrderStatus status) {
        List<OrderResponse> orders = orderService.listOrders(status);
        return ResponseEntity.ok(ApiResponse.ok(orders));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(@PathVariable Long id) {
        OrderResponse order = orderService.getOrder(id);
        return ResponseEntity.ok(ApiResponse.ok(order));
    }

    @GetMapping("/farmer/{farmerId}")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrdersByFarmer(@PathVariable Long farmerId) {
        List<OrderResponse> orders = orderService.getByFarmer(farmerId);
        return ResponseEntity.ok(ApiResponse.ok(orders));
    }

    @GetMapping("/buyer/{buyerId}")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrdersByBuyer(@PathVariable Long buyerId) {
        List<OrderResponse> orders = orderService.getByBuyer(buyerId);
        return ResponseEntity.ok(ApiResponse.ok(orders));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long id,
            @Valid @RequestBody OrderStatusUpdateRequest request) {
        OrderResponse updated = orderService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Order status updated successfully", updated));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(@PathVariable Long id) {
        OrderResponse cancelled = orderService.cancelOrder(id);
        return ResponseEntity.ok(ApiResponse.ok("Order cancelled successfully", cancelled));
    }
}
