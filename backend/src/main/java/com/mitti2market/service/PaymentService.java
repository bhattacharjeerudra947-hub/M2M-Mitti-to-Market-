package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.Deal;
import com.mitti2market.model.Notification;
import com.mitti2market.model.PaymentTransaction;
import com.mitti2market.model.User;
import com.mitti2market.repository.DealRepository;
import com.mitti2market.repository.PaymentTransactionRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentTransactionRepository paymentRepo;
    private final DealRepository dealRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    @Transactional
    public PaymentTransaction createDemoPayment(Long dealId, Long payerId, Double amount, String paymentMethod) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));
        User payer = userRepo.findById(payerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", payerId));

        double expectedAmount = (deal.getQuantity() != null && deal.getAgreedPrice() != null)
                ? (deal.getQuantity() * deal.getAgreedPrice()) : (deal.getTotalAmount() != null ? deal.getTotalAmount() : 0.0);

        if (amount == null) {
            amount = expectedAmount;
        } else if (Math.abs(amount - expectedAmount) > 0.01) {
            throw new BadRequestException("Payment amount mismatch. Expected: Rs." + expectedAmount + ", provided: Rs." + amount);
        }

        String txnId = "M2M-DEMO-TXN-" + String.format("%06d", ThreadLocalRandom.current().nextInt(100000, 999999));

        PaymentTransaction transaction = PaymentTransaction.builder()
                .transactionId(txnId)
                .deal(deal)
                .payer(payer)
                .amount(amount)
                .paymentMethod(paymentMethod != null ? paymentMethod : "UPI")
                .status(PaymentTransaction.PaymentStatus.PENDING)
                .isDemo(true)
                .gatewayReference("RAZORPAY_DEMO_SANDBOX")
                .notes("Demo Sandbox Payment. No real currency deducted.")
                .build();

        return paymentRepo.save(transaction);
    }

    @Transactional
    public PaymentTransaction confirmDemoPayment(String transactionId) {
        PaymentTransaction txn = paymentRepo.findByTransactionId(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment transaction not found: " + transactionId));

        txn.setStatus(PaymentTransaction.PaymentStatus.SUCCESS);
        txn = paymentRepo.save(txn);

        Deal deal = txn.getDeal();
        deal.setPaymentStatus("PAID_ESCROW");
        dealRepo.save(deal);

        if (deal.getFarmer() != null) {
            notificationService.createNotification(
                    deal.getFarmer().getId(),
                    Notification.NotificationType.PAYMENT_ESCROWED,
                    "Payment Deposited in Escrow",
                    "Buyer deposited Rs." + txn.getAmount() + " into Mitti2Market Escrow for Deal " + deal.getDealId() + " (Demo Txn: " + txn.getTransactionId() + ").",
                    deal.getId(),
                    "DEAL"
            );
        }
        if (deal.getBuyer() != null) {
            notificationService.createNotification(
                    deal.getBuyer().getId(),
                    Notification.NotificationType.PAYMENT_ESCROWED,
                    "Payment Successful (Demo)",
                    "Your payment of Rs." + txn.getAmount() + " for Deal " + deal.getDealId() + " is confirmed in escrow (Ref: " + txn.getTransactionId() + ").",
                    deal.getId(),
                    "DEAL"
            );
        }

        log.info("Demo payment {} confirmed for deal {}", transactionId, deal.getDealId());
        return txn;
    }

    public List<PaymentTransaction> getTransactionsForDeal(Long dealId) {
        return paymentRepo.findByDealIdOrderByCreatedAtDesc(dealId);
    }
}
