package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.model.Deal.DealStatus;
import com.mitti2market.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
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
    private final DealStateMachineService stateMachine;
    private final BuyerRequirementService requirementService;
    private final BuyerRequirementRepository requirements;

    private static final AtomicLong DEAL_COUNTER = new AtomicLong(10000);

    /**
     * Seed the deal ID counter from the highest existing deal number on startup,
     * so restarts never generate duplicate deal IDs.
     */
    @PostConstruct
    public void initCounter() {
        try {
            long max = deals.findMaxDealSequence();
            if (max > 10000) {
                DEAL_COUNTER.set(max);
            }
        } catch (Exception e) {
            // Table may not exist on first run — ignore
        }
    }

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
        Integer quantity = Integer.valueOf(details.get("quantity").toString());
        Double agreedPrice = Double.valueOf(details.get("agreedPrice").toString());
        String pickupLocation = (String) details.getOrDefault("pickupLocation", "");
        String deliveryLocation = (String) details.getOrDefault("deliveryLocation", "");
        String conditions = (String) details.getOrDefault("conditions", "");

        // Optional exact coordinates — default to the parties' saved user locations
        // when the frontend does not supply them (privacy: only the deal parties
        // ever see these; marketplace listings stay approximate).
        Double pickupLat = num(details.get("pickupLatitude"));
        Double pickupLng = num(details.get("pickupLongitude"));
        Double deliveryLat = num(details.get("deliveryLatitude"));
        Double deliveryLng = num(details.get("deliveryLongitude"));

        User farmer = users.findById(farmerId).orElseThrow(() -> new ResourceNotFoundException("Farmer", "id", farmerId));
        User buyer = users.findById(buyerId).orElseThrow(() -> new ResourceNotFoundException("Buyer", "id", buyerId));

        if (pickupLat == null) pickupLat = farmer.getLatitude();
        if (pickupLng == null) pickupLng = farmer.getLongitude();
        if (deliveryLat == null) deliveryLat = buyer.getLatitude();
        if (deliveryLng == null) deliveryLng = buyer.getLongitude();
        Produce produce = produceId != null ? produceRepo.findById(produceId).orElse(null) : null;

        // Optional link to the buyer requirement this deal fulfils
        BuyerRequirement requirement = null;
        if (details.get("buyerRequirementId") != null) {
            Long reqId = Long.valueOf(details.get("buyerRequirementId").toString());
            requirement = requirements.findById(reqId)
                    .orElseThrow(() -> new ResourceNotFoundException("Requirement", "id", reqId));
            if (requirement.getBuyer() == null || !requirement.getBuyer().getId().equals(buyerId)) {
                throw new BadRequestException("This requirement belongs to a different buyer");
            }
        }

        // When the deal is tied to a real listing, the listing is the source of truth:
        // derive the crop name + unit from it so the display name and the reserved
        // stock can never mismatch (e.g. typing "cabbage" in a Tomato-listing chat).
        String cropName;
        String unit;
        if (produce != null) {
            cropName = produce.getName();
            unit = produce.getUnit();
        } else {
            cropName = (String) details.getOrDefault("cropName", "Produce");
            unit = (String) details.getOrDefault("unit", "kg");
        }

        // Fail fast: never create a deal that can't be locked because the
        // listing no longer has enough stock. The full reservation still
        // happens atomically at lock time in reserveQuantity().
        if (produce != null && quantity > produce.getQuantity()) {
            throw new BadRequestException("Only " + produce.getQuantity() + " " + produce.getUnit() +
                    " remains available for " + produce.getName() + ". Deal quantity is " + quantity + " " + unit);
        }

        String dealIdStr = "M2M-" + LocalDateTime.now().getYear() + "-" + (DEAL_COUNTER.incrementAndGet());

        Deal deal = Deal.builder()
                .dealId(dealIdStr)
                .farmer(farmer)
                .buyer(buyer)
                .produce(produce)
                .buyerRequirement(requirement)
                .cropName(cropName)
                .quantity(quantity)
                .unit(unit)
                .agreedPrice(agreedPrice)
                .totalAmount(quantity * agreedPrice)
                .pickupLocation(pickupLocation)
                .deliveryLocation(deliveryLocation)
                .pickupLatitude(pickupLat)
                .pickupLongitude(pickupLng)
                .deliveryLatitude(deliveryLat)
                .deliveryLongitude(deliveryLng)
                .conditions(conditions)
                .status(DealStatus.LOCK_PENDING)
                .conversationId(conversationId)
                .build();

        deal = deals.save(deal);

        // Create confirmations for both parties
        confirmations.save(DealConfirmation.builder().deal(deal).user(farmer).confirmed(false).build());
        confirmations.save(DealConfirmation.builder().deal(deal).user(buyer).confirmed(false).build());

        // Audit trail
        stateMachine.recordEvent(deal.getId(), "DEAL_CREATED", user.getId(),
                user.getId().equals(farmerId) ? "FARMER" : "BUYER",
                user.getName() + " initiated a deal for " + quantity + " " + unit + " of " + cropName +
                        " @ ₹" + agreedPrice + "/" + unit, null);

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

        // Audit trail for this confirmation
        String actorRole = userId.equals(deal.getFarmer().getId()) ? "FARMER" : "BUYER";
        stateMachine.recordEvent(dealId, actorRole + "_CONFIRMED", userId, actorRole,
                actorRole.charAt(0) + actorRole.substring(1).toLowerCase() + " confirmed the final agreement", null);

        // Check if both parties confirmed
        long confirmedCount = confirmations.countByDealIdAndConfirmedTrue(dealId);
        if (confirmedCount >= 2) {
            // Both confirmed → reserve quantity and lock the deal
            reserveQuantity(deal);
            requirementService.reserveForDeal(deal);

            deal = stateMachine.transition(dealId, DealStatus.LOCKED, userId, actorRole,
                    "Deal locked — both parties confirmed the agreement", null);

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
     * Reserve (deduct) the deal quantity from the produce listing.
     * Prevents overselling when multiple buyers try to lock the same produce.
     * The locked deal keeps its own snapshot of terms.
     */
    private synchronized void reserveQuantity(Deal deal) {
        if (deal.getProduce() == null || deal.getQuantity() == null) return;

        Produce produce = deal.getProduce();
        if (produce.getQuantity() < deal.getQuantity()) {
            throw new BadRequestException("Only " + produce.getQuantity() + " " + deal.getUnit() +
                    " remains available for " + produce.getName() + ". Deal quantity is " + deal.getQuantity() + " " + deal.getUnit());
        }

        int remaining = produce.getQuantity() - deal.getQuantity();
        int reserved = (produce.getReservedQuantity() != null ? produce.getReservedQuantity() : 0) + deal.getQuantity();
        produce.setQuantity(remaining);
        produce.setReservedQuantity(reserved);

        if (remaining == 0) {
            produce.setStatus(Produce.ProduceStatus.SOLD_OUT);
        } else if (remaining < 50) {
            produce.setStatus(Produce.ProduceStatus.LOW_STOCK);
        } else {
            produce.setStatus(Produce.ProduceStatus.PARTIALLY_SOLD);
        }
        produceRepo.save(produce);

        stateMachine.recordEvent(deal.getId(), "QUANTITY_RESERVED", null, "SYSTEM",
                "Reserved " + deal.getQuantity() + " " + deal.getUnit() + " of " + produce.getName() +
                        " (" + remaining + " " + deal.getUnit() + " remaining)", null);
    }

    /**
     * Restore the reserved quantity when a locked (or later) deal is cancelled.
     */
    private void restoreQuantity(Deal deal) {
        if (deal.getProduce() == null || deal.getQuantity() == null) return;
        if (deal.getStatus() == DealStatus.LOCK_PENDING || deal.getStatus() == DealStatus.NEGOTIATING) return;

        Produce produce = deal.getProduce();
        int restored = produce.getQuantity() + deal.getQuantity();
        int reserved = Math.max(0, (produce.getReservedQuantity() != null ? produce.getReservedQuantity() : 0) - deal.getQuantity());
        produce.setQuantity(restored);
        produce.setReservedQuantity(reserved);

        // Re-derive status from the restored stock level
        if (produce.getStatus() != Produce.ProduceStatus.ADMIN_REMOVED
                && produce.getStatus() != Produce.ProduceStatus.REMOVED) {
            int listed = produce.getListedQuantity() != null ? produce.getListedQuantity() : restored;
            produce.setStatus(restored >= listed ? Produce.ProduceStatus.AVAILABLE
                    : restored < 50 ? Produce.ProduceStatus.LOW_STOCK : Produce.ProduceStatus.PARTIALLY_SOLD);
        }
        produceRepo.save(produce);
    }

    /**
     * Finalize sold quantity when deal reaches COMPLETED status.
     */
    public void finalizeSoldQuantity(Deal deal) {
        if (deal == null) return;
        if (deal.getProduce() != null && deal.getQuantity() != null) {
            Produce produce = deal.getProduce();
            int sold = (produce.getSoldQuantity() != null ? produce.getSoldQuantity() : 0) + deal.getQuantity();
            int reserved = Math.max(0, (produce.getReservedQuantity() != null ? produce.getReservedQuantity() : 0) - deal.getQuantity());
            produce.setSoldQuantity(sold);
            produce.setReservedQuantity(reserved);
            if (produce.getQuantity() <= 0) {
                produce.setStatus(Produce.ProduceStatus.SOLD_OUT);
            }
            produceRepo.save(produce);
        }
    }

    /**
     * Amend the terms of an existing (possibly locked) deal.
     * Only called through the structured-offer flow — the change is
     * recorded, notified to both parties, and the amendment counter is bumped.
     * Locked terms are never changed silently.
     */
    @Transactional
    public Deal applyAmendment(Long dealId, String cropName, Integer quantity, String unit, Double agreedPrice) {
        Deal deal = deals.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));

        if (deal.getStatus() == DealStatus.COMPLETED || deal.getStatus() == DealStatus.CANCELLED) {
            throw new BadRequestException("Cannot amend a " + deal.getStatus().name().toLowerCase() + " deal");
        }

        String oldTerms = deal.getQuantity() + " " + deal.getUnit() + " @ ₹" + deal.getAgreedPrice() + "/" + deal.getUnit();

        // If the locked deal's quantity changed, adjust the reserved quantity on the produce listing
        if (deal.getProduce() != null && deal.getStatus() != DealStatus.LOCK_PENDING && quantity != null
                && !quantity.equals(deal.getQuantity())) {
            int delta = quantity - deal.getQuantity();
            Produce produce = deal.getProduce();
            if (delta > 0 && produce.getQuantity() < delta) {
                throw new BadRequestException("Only " + produce.getQuantity() + " " + deal.getUnit() +
                        " additional stock available. Cannot increase deal quantity to " + quantity + " " + deal.getUnit());
            }
            int remaining = produce.getQuantity() - delta;
            produce.setQuantity(remaining);
            produce.setStatus(remaining == 0 ? Produce.ProduceStatus.SOLD_OUT
                    : remaining < 50 ? Produce.ProduceStatus.LOW_STOCK : Produce.ProduceStatus.AVAILABLE);
            produceRepo.save(produce);
        }

        deal.setCropName(cropName != null ? cropName : deal.getCropName());
        deal.setQuantity(quantity);
        deal.setUnit(unit);
        deal.setAgreedPrice(agreedPrice);
        deal.setTotalAmount(quantity * agreedPrice);
        deal.setAmendedAt(LocalDateTime.now());
        deal.setAmendmentCount((deal.getAmendmentCount() == null ? 0 : deal.getAmendmentCount()) + 1);
        deals.save(deal);

        String newTerms = quantity + " " + unit + " @ ₹" + agreedPrice + "/" + unit;
        sendDealMessage(deal.getConversationId(), "✏️ Deal Amended (" + deal.getAmendmentCount() + ")\nDeal ID: " + deal.getDealId() +
                "\nTerms changed from: " + oldTerms +
                "\nNew terms: " + newTerms +
                "\nNew total: ₹" + String.format("%,.0f", deal.getTotalAmount()) +
                "\n\nLocked deal terms updated after mutual agreement.");

        notificationService.createNotification(deal.getFarmer().getId(), Notification.NotificationType.DEAL_LOCKED,
                "Deal Amended", "Deal " + deal.getDealId() + " terms updated to " + newTerms + " (total ₹" + String.format("%,.0f", deal.getTotalAmount()) + ")");
        notificationService.createNotification(deal.getBuyer().getId(), Notification.NotificationType.DEAL_LOCKED,
                "Deal Amended", "Deal " + deal.getDealId() + " terms updated to " + newTerms + " (total ₹" + String.format("%,.0f", deal.getTotalAmount()) + ")");

        stateMachine.recordEvent(dealId, "AMENDMENT_ACCEPTED", null, "SYSTEM",
                "Terms changed from " + oldTerms + " to " + newTerms + " after mutual agreement", null);

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

        // Restore reserved quantity if the deal had been locked
        restoreQuantity(deal);
        requirementService.releaseForDeal(deal);

        String actorRole = userId.equals(deal.getFarmer().getId()) ? "FARMER" : "BUYER";
        deal = stateMachine.transition(dealId, DealStatus.CANCELLED, userId, actorRole,
                "Deal cancelled", null);

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

    /** Return the id of an active deal for a conversation, or null. */
    public Long findActiveDealIdByConversation(String conversationId) {
        Deal active = getDealByConversation(conversationId);
        return active != null ? active.getId() : null;
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

    /** Parse a number from an untrusted request value, tolerating null/empty. */
    private Double num(Object v) {
        if (v == null) return null;
        try { return Double.valueOf(v.toString()); } catch (Exception e) { return null; }
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
        resp.put("pickupLatitude", deal.getPickupLatitude());
        resp.put("pickupLongitude", deal.getPickupLongitude());
        resp.put("deliveryLatitude", deal.getDeliveryLatitude());
        resp.put("deliveryLongitude", deal.getDeliveryLongitude());
        resp.put("conditions", deal.getConditions());
        resp.put("status", deal.getStatus().name());
        resp.put("conversationId", deal.getConversationId());
        resp.put("createdAt", deal.getCreatedAt());
        resp.put("lockedAt", deal.getLockedAt());
        resp.put("completedAt", deal.getCompletedAt());
        resp.put("amendedAt", deal.getAmendedAt());
        resp.put("amendmentCount", deal.getAmendmentCount());

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
