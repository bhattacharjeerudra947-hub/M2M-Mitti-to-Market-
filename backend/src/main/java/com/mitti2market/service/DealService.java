package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.model.Deal.DealStatus;
import com.mitti2market.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class DealService {

    private final DealRepository deals;
    private final DealConfirmationRepository confirmations;
    private final LogisticsRepository logisticsRepo;
    private final LogisticsEventRepository logisticsEvents;
    private final DeliveryConfirmationRepository deliveryRepo;
    private final UserRepository users;
    private final ProduceRepository produceRepo;
    private final MessageService messageService;
    private final NotificationService notificationService;

    private static final AtomicLong DEAL_COUNTER = new AtomicLong(10000);

    /**
     * Farmer or buyer initiates a deal lock request from chat.
     * Creates the deal in LOCK_PENDING status.
     */
    @Transactional
    public Deal initiateDealLock(Long userId, String conversationId, Map<String, Object> details) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Check if there's already an active (non-completed/cancelled) deal for this conversation
        Optional<Deal> existing = deals.findByConversationIdAndStatusNot(conversationId, DealStatus.COMPLETED);
        if (existing.isPresent() && existing.get().getStatus() != DealStatus.CANCELLED) {
            throw new BadRequestException("A deal is already active for this conversation");
        }

        Long farmerId = Long.valueOf(details.get("farmerId").toString());
        Long buyerId = Long.valueOf(details.get("buyerId").toString());
        Long produceId = details.get("produceId") != null ? Long.valueOf(details.get("produceId").toString()) : null;
        String cropName = (String) details.getOrDefault("cropName", "Produce");
        Integer quantity = Integer.valueOf(details.get("quantity").toString());
        String unit = (String) details.getOrDefault("unit", "kg");
        Double agreedPrice = Double.valueOf(details.get("agreedPrice").toString());
        String pickupLocation = (String) details.getOrDefault("pickupLocation", "");
        String deliveryLocation = (String) details.getOrDefault("deliveryLocation", "");
        String conditions = (String) details.getOrDefault("conditions", "");

        User farmer = users.findById(farmerId).orElseThrow(() -> new ResourceNotFoundException("Farmer", "id", farmerId));
        User buyer = users.findById(buyerId).orElseThrow(() -> new ResourceNotFoundException("Buyer", "id", buyerId));
        Produce produce = produceId != null ? produceRepo.findById(produceId).orElse(null) : null;

        String dealIdStr = "M2M-" + LocalDateTime.now().getYear() + "-" + (DEAL_COUNTER.incrementAndGet());

        Deal deal = Deal.builder()
                .dealId(dealIdStr)
                .farmer(farmer)
                .buyer(buyer)
                .produce(produce)
                .cropName(cropName)
                .quantity(quantity)
                .unit(unit)
                .agreedPrice(agreedPrice)
                .totalAmount(quantity * agreedPrice)
                .pickupLocation(pickupLocation)
                .deliveryLocation(deliveryLocation)
                .conditions(conditions)
                .status(DealStatus.LOCK_PENDING)
                .conversationId(conversationId)
                .build();

        deal = deals.save(deal);

        // Create confirmations for both parties
        confirmations.save(DealConfirmation.builder().deal(deal).user(farmer).confirmed(false).build());
        confirmations.save(DealConfirmation.builder().deal(deal).user(buyer).confirmed(false).build());

        // Send system message about deal lock request
        sendDealMessage(conversationId, "🔒 Deal Lock Requested\nDeal ID: " + dealIdStr + "\n" +
                quantity + " " + unit + " " + cropName + " @ ₹" + agreedPrice + "/" + unit +
                "\nTotal: ₹" + String.format("%,.0f", quantity * agreedPrice) +
                "\n\nBoth parties must confirm to lock the deal.");

        // Notify the other party
        Long otherUserId = userId.equals(farmerId) ? buyerId : farmerId;
        notificationService.createNotification(otherUserId, Notification.NotificationType.DEAL_LOCK_REQUESTED,
                "Deal Lock Requested", user.getName() + " wants to lock a deal for " + quantity + " " + unit + " of " + cropName + " at ₹" + agreedPrice + "/" + unit);

        return deal;
    }

    /**
     * User confirms a pending deal. When both confirm, deal becomes LOCKED.
     */
    @Transactional
    public Deal confirmDeal(Long dealId, Long userId) {
        Deal deal = deals.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));

        if (deal.getStatus() != DealStatus.LOCK_PENDING) {
            throw new BadRequestException("This deal is not in pending status");
        }

        // Verify user is part of this deal
        if (!deal.getFarmer().getId().equals(userId) && !deal.getBuyer().getId().equals(userId)) {
            throw new BadRequestException("You are not part of this deal");
        }

        Optional<DealConfirmation> confOpt = confirmations.findByDealIdAndUserId(dealId, userId);
        if (confOpt.isEmpty()) throw new BadRequestException("Confirmation record not found");
        if (confOpt.get().getConfirmed()) throw new BadRequestException("You have already confirmed");

        DealConfirmation conf = confOpt.get();
        conf.setConfirmed(true);
        conf.setConfirmedAt(LocalDateTime.now());
        confirmations.save(conf);

        // Check if both parties confirmed
        long confirmedCount = confirmations.countByDealIdAndConfirmedTrue(dealId);
        if (confirmedCount >= 2) {
            // Both confirmed → lock the deal
            deal.setStatus(DealStatus.LOCKED);
            deal.setLockedAt(LocalDateTime.now());
            deals.save(deal);

            sendDealMessage(deal.getConversationId(), "🔒 Deal Locked!\nDeal ID: " + deal.getDealId() +
                    "\n" + deal.getQuantity() + " " + deal.getUnit() + " " + deal.getCropName() +
                    " @ ₹" + deal.getAgreedPrice() + "/" + deal.getUnit() +
                    "\nTotal: ₹" + String.format("%,.0f", deal.getTotalAmount()) +
                    "\n\n✅ Both parties confirmed.\n\n🚚 Choose how this order will be transported:");

            notificationService.createNotification(deal.getFarmer().getId(), Notification.NotificationType.DEAL_LOCKED,
                    "Deal Locked!", "Deal " + deal.getDealId() + " has been locked. Choose logistics to proceed.");
            notificationService.createNotification(deal.getBuyer().getId(), Notification.NotificationType.DEAL_LOCKED,
                    "Deal Locked!", "Deal " + deal.getDealId() + " has been locked. Choose logistics to proceed.");
        } else {
            sendDealMessage(deal.getConversationId(), "⏳ " + (userId.equals(deal.getFarmer().getId()) ? "Farmer" : "Buyer") + " has confirmed the deal. Waiting for the other party to confirm.");
        }

        return deal;
    }

    /**
     * Cancel a deal.
     */
    @Transactional
    public Deal cancelDeal(Long dealId, Long userId) {
        Deal deal = deals.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));

        if (!deal.getFarmer().getId().equals(userId) && !deal.getBuyer().getId().equals(userId)) {
            throw new BadRequestException("You are not part of this deal");
        }

        if (deal.getStatus() == DealStatus.COMPLETED) {
            throw new BadRequestException("Cannot cancel a completed deal");
        }

        deal.setStatus(DealStatus.CANCELLED);
        deals.save(deal);

        sendDealMessage(deal.getConversationId(), "❌ Deal " + deal.getDealId() + " has been cancelled.");

        Long otherUserId = userId.equals(deal.getFarmer().getId()) ? deal.getBuyer().getId() : deal.getFarmer().getId();
        User user = users.findById(userId).orElseThrow();
        notificationService.createNotification(otherUserId, Notification.NotificationType.DEAL_CANCELLED,
                "Deal Cancelled", user.getName() + " cancelled deal " + deal.getDealId());

        return deal;
    }

    /**
     * Get deal details.
     */
    public Deal getDeal(Long dealId) {
        return deals.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));
    }

    public Deal getDealByConversation(String conversationId) {
        return deals.findByConversationId(conversationId)
                .stream()
                .filter(d -> d.getStatus() != DealStatus.CANCELLED && d.getStatus() != DealStatus.COMPLETED)
                .findFirst()
                .orElse(null);
    }

    public List<Deal> getFarmerDeals(Long farmerId) {
        return deals.findByFarmerIdOrderByCreatedAtDesc(farmerId);
    }

    public List<Deal> getBuyerDeals(Long buyerId) {
        return deals.findByBuyerIdOrderByCreatedAtDesc(buyerId);
    }

    public List<Deal> getAllDealsForUser(Long userId) {
        return deals.findAllByUserId(userId);
    }

    /**
     * Build a deal response map for the frontend.
     */
    public Map<String, Object> toDealResponse(Deal deal) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", deal.getId());
        resp.put("dealId", deal.getDealId());
        resp.put("farmerId", deal.getFarmer().getId());
        resp.put("farmerName", deal.getFarmer().getName());
        resp.put("buyerId", deal.getBuyer().getId());
        resp.put("buyerName", deal.getBuyer().getName());
        resp.put("cropName", deal.getCropName());
        resp.put("quantity", deal.getQuantity());
        resp.put("unit", deal.getUnit());
        resp.put("agreedPrice", deal.getAgreedPrice());
        resp.put("totalAmount", deal.getTotalAmount());
        resp.put("pickupLocation", deal.getPickupLocation());
        resp.put("deliveryLocation", deal.getDeliveryLocation());
        resp.put("conditions", deal.getConditions());
        resp.put("status", deal.getStatus().name());
        resp.put("conversationId", deal.getConversationId());
        resp.put("createdAt", deal.getCreatedAt());
        resp.put("lockedAt", deal.getLockedAt());
        resp.put("completedAt", deal.getCompletedAt());

        // Confirmation status
        List<DealConfirmation> confs = confirmations.findByDealId(deal.getId());
        resp.put("farmerConfirmed", confs.stream().anyMatch(c -> c.getUser().getId().equals(deal.getFarmer().getId()) && c.getConfirmed()));
        resp.put("buyerConfirmed", confs.stream().anyMatch(c -> c.getUser().getId().equals(deal.getBuyer().getId()) && c.getConfirmed()));

        // Logistics info if assigned
        logisticsRepo.findByDealId(deal.getId()).ifPresent(l -> {
            resp.put("logisticsType", l.getType().name());
            resp.put("logisticsStatus", l.getStatus().name());
            resp.put("trackingId", l.getTrackingId());
            resp.put("expectedDelivery", l.getExpectedDelivery());
        });

        return resp;
    }

    private void sendDealMessage(String conversationId, String content) {
        // Find the farmer and buyer from the deal to send system messages
        Deal deal = deals.findByConversationId(conversationId)
                .stream().findFirst().orElse(null);
        if (deal != null) {
            messageService.sendMessage(deal.getFarmer().getId(), deal.getBuyer().getId(), content, deal.getProduce() != null ? deal.getProduce().getId() : null);
        }
    }
}
