package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.exception.BadRequestException;
import com.mitti2market.model.PaymentTransaction;
import com.mitti2market.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentService paymentService;
    private final TokenService tokens;

    @PostMapping("/create-demo")
    public ResponseEntity<ApiResponse<PaymentTransaction>> createDemoPayment(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {

        Long userId = extractUserId(authHeader);
        if (userId == null) throw new BadRequestException("Authentication required");

        Long dealId = Long.valueOf(body.get("dealId").toString());
        Double amount = body.get("amount") != null ? Double.valueOf(body.get("amount").toString()) : null;
        String method = body.get("paymentMethod") != null ? body.get("paymentMethod").toString() : "UPI";

        PaymentTransaction txn = paymentService.createDemoPayment(dealId, userId, amount, method);
        return ResponseEntity.ok(ApiResponse.ok(txn));
    }

    @PostMapping({"/confirm", "/{transactionId}/confirm"})
    public ResponseEntity<ApiResponse<PaymentTransaction>> confirmDemoPayment(
            @PathVariable(required = false) String transactionId,
            @RequestBody(required = false) Map<String, Object> body) {

        String txnId = transactionId;
        if (txnId == null && body != null && body.get("transactionId") != null) {
            txnId = body.get("transactionId").toString();
        }
        if (txnId == null) {
            throw new BadRequestException("Transaction ID is required for payment confirmation");
        }

        PaymentTransaction txn = paymentService.confirmDemoPayment(txnId);
        return ResponseEntity.ok(ApiResponse.ok(txn));
    }

    @GetMapping("/deal/{dealId}")
    public ResponseEntity<ApiResponse<List<PaymentTransaction>>> getDealPayments(
            @PathVariable Long dealId) {

        List<PaymentTransaction> transactions = paymentService.getTransactionsForDeal(dealId);
        return ResponseEntity.ok(ApiResponse.ok(transactions));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}
