package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.Deal;
import com.mitti2market.model.Order;
import com.mitti2market.model.User;
import com.mitti2market.repository.DealRepository;
import com.mitti2market.repository.OrderRepository;
import com.mitti2market.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Public, aggregate platform statistics for landing pages (Landing.jsx, AboutUs.jsx).
 * Every value is computed from live MySQL rows at request time — no hardcoded numbers.
 * Only aggregate counts/sums are exposed; no personal data.
 */
@RestController
@RequestMapping("/api/stats")
public class PublicStatsController {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final DealRepository dealRepository;
    private final com.mitti2market.repository.ProduceRepository produceRepository;

    public PublicStatsController(UserRepository userRepository,
                                 OrderRepository orderRepository,
                                 DealRepository dealRepository,
                                 com.mitti2market.repository.ProduceRepository produceRepository) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.dealRepository = dealRepository;
        this.produceRepository = produceRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> publicStats() {
        // Only count users who can actually transact (exclude deactivated accounts)
        long farmers = userRepository.findByRole(User.Role.FARMER).stream()
                .filter(u -> u.getStatus() != User.UserStatus.DEACTIVATED)
                .count();
        long buyers = userRepository.findByRole(User.Role.BUSINESS).stream()
                .filter(u -> u.getStatus() != User.UserStatus.DEACTIVATED)
                .count();

        // Deals and Orders are separate transaction flows (deals never create orders),
        // so summing both gives the true value of produce sold — no double counting.
        double ordersValue = orderRepository.findByStatus(Order.OrderStatus.DELIVERED).stream()
                .mapToDouble(o -> o.getTotalPrice() != null ? o.getTotalPrice() : 0d)
                .sum();
        double dealsValue = dealRepository.findAll().stream()
                .filter(d -> d.getStatus() == Deal.DealStatus.COMPLETED)
                .mapToDouble(d -> d.getTotalAmount() != null ? d.getTotalAmount() : 0d)
                .sum();

        long completedDeals = dealRepository.findAll().stream()
                .filter(d -> d.getStatus() == Deal.DealStatus.COMPLETED)
                .count();
        long allDeals = dealRepository.count();

        long activeProduce = produceRepository.countByStatusIn(
                java.util.List.of(com.mitti2market.model.Produce.ProduceStatus.AVAILABLE)
        );

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("farmers", farmers);
        stats.put("buyers", buyers);
        stats.put("totalUsers", farmers + buyers);
        stats.put("produceSoldValue", Math.round(ordersValue + dealsValue));
        stats.put("totalDeals", allDeals > 0 ? allDeals : completedDeals);
        stats.put("completedDeals", completedDeals);
        stats.put("activeProduce", activeProduce);
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
