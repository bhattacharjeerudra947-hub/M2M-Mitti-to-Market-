package com.mitti2market.service;

import com.mitti2market.model.Deal;
import com.mitti2market.repository.DealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Central deal-completion coordinator.
 *
 * confirmDelivery (LogisticsService) delegates here so every completion
 * side-effect happens inside ONE transaction:
 *   deal → COMPLETED
 *   → produce sold/reserved quantities finalized (auto SOLD_OUT)
 *   → buyer requirement fulfilled quantities updated (auto FULFILLED)
 *
 * If any part fails, the whole completion rolls back.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DealCompletionService {

    private final DealRepository dealRepo;
    private final DealService dealService;
    private final BuyerRequirementService requirementService;
    private final NotificationService notificationService;
    private final com.mitti2market.repository.BuyerMatchRepository matchRepo;

    /**
     * Complete a deal and synchronize every downstream record.
     * The deal must already be in a state that allows COMPLETED.
     */
    @Transactional
    public Deal completeDeal(Long dealId) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("Deal not found: " + dealId));

        // 1. Finalize produce sold/reserved quantities (auto SOLD_OUT at 0)
        dealService.finalizeSoldQuantity(deal);

        // 2. Fulfil the linked buyer requirement (auto FULFILLED at 0 remaining)
        requirementService.fulfillForDeal(deal);

        // Update BuyerMatch status if linked
        if (deal.getProduce() != null && deal.getBuyerRequirement() != null) {
            matchRepo.findByProduceIdAndBuyerRequirementId(deal.getProduce().getId(), deal.getBuyerRequirement().getId())
                    .ifPresent(m -> {
                        m.setStatus(com.mitti2market.model.BuyerMatch.MatchStatus.COMPLETED);
                        matchRepo.save(m);
                    });
        }

        // 3. Send deal completed notifications to both parties
        if (deal.getFarmer() != null) {
            notificationService.createNotification(
                    deal.getFarmer().getId(),
                    com.mitti2market.model.Notification.NotificationType.DEAL_COMPLETED,
                    "Deal Completed",
                    "Deal " + deal.getDealId() + " has been completed! Please rate your transaction experience with the buyer.",
                    deal.getId(),
                    "DEAL"
            );
        }
        if (deal.getBuyer() != null) {
            notificationService.createNotification(
                    deal.getBuyer().getId(),
                    com.mitti2market.model.Notification.NotificationType.DEAL_COMPLETED,
                    "Deal Completed",
                    "Deal " + deal.getDealId() + " has been completed! Please rate your transaction experience with the farmer.",
                    deal.getId(),
                    "DEAL"
            );
        }

        log.info("Deal {} completed — inventory and requirement synchronized", deal.getDealId());
        return deal;
    }
}
