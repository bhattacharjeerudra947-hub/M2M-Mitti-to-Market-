package com.mitti2market.service;

import com.mitti2market.model.Notification;
import com.mitti2market.model.Produce;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.repository.ProduceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Background scheduler to manage produce shelf life and automatic expiration.
 * - Marks items whose expiryDate has passed as EXPIRED
 * - Automatically dispatches warning notifications 3 days before shelf-life expires
 * - Historical deals on the produce remain intact
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProduceExpiryScheduler {

    private final ProduceRepository produceRepository;
    private final NotificationService notificationService;
    private final MatchingService matchingService;

    private static final List<ProduceStatus> ACTIVE_STATUSES = List.of(
            ProduceStatus.AVAILABLE,
            ProduceStatus.LOW_STOCK,
            ProduceStatus.PARTIALLY_SOLD
    );

    /**
     * Run every hour to check for expired listings and send 3-day advance warnings.
     */
    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void processProduceExpiry() {
        LocalDate today = LocalDate.now();
        log.info("[ProduceExpiryScheduler] Checking produce shelf life for date: {}", today);

        // 1. Expire produce whose expiry date has passed
        List<Produce> expiredProduce = produceRepository.findByStatusInAndExpiryDateBefore(ACTIVE_STATUSES, today);
        for (Produce p : expiredProduce) {
            p.setStatus(ProduceStatus.EXPIRED);
            produceRepository.save(p);
            matchingService.handleProduceStatusChange(p);

            log.info("[ProduceExpiryScheduler] Produce ID {} ({}) marked EXPIRED", p.getId(), p.getName());

            if (p.getFarmer() != null) {
                notificationService.createNotification(
                        p.getFarmer().getId(),
                        Notification.NotificationType.SYSTEM_ALERT,
                        "Produce Shelf Life Expired",
                        "Your listing for " + p.getName() + " has reached its shelf life (" +
                                p.getExpiryDate() + ") and is now marked Expired. Active buyers can no longer purchase this batch.",
                        p.getId(),
                        "PRODUCE"
                );
            }
        }

        // 2. Advance warning: produce expiring within next 3 days
        LocalDate threeDaysFromNow = today.plusDays(3);
        List<Produce> expiringSoon = produceRepository.findByStatusInAndExpiryDateBetweenAndExpiryWarningSentFalse(
                ACTIVE_STATUSES, today, threeDaysFromNow);

        for (Produce p : expiringSoon) {
            p.setExpiryWarningSent(true);
            produceRepository.save(p);

            if (p.getFarmer() != null) {
                notificationService.createNotification(
                        p.getFarmer().getId(),
                        Notification.NotificationType.SYSTEM_ALERT,
                        "Shelf Life Alert: " + p.getName(),
                        "Your listing for " + p.getName() + " will reach its shelf life on " +
                                p.getExpiryDate() + ". Consider adjusting the price or locking a deal soon!",
                        p.getId(),
                        "PRODUCE"
                );
            }
        }
    }
}
