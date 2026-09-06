package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.model.DealOffer.OfferStatus;
import com.mitti2market.repository.DealOfferRepository;
import com.mitti2market.repository.UserRepository;
import com.mitti2market.repository.ProduceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Structured negotiation — offers with price + quantity that the other
 * party can Accept / Counter / Reject. Accepted offers create a Deal
 * that flows into the existing Deal Lock → Logistics pipeline.
 */
@Service
@RequiredArgsConstructor
public class DealOfferService {

    private final DealOfferRepository offerRepository;
    private final UserRepository users;
    private final ProduceRepository produceRepo;
    private final DealService dealService;
    private final MessageService messageService;
    private final NotificationService notificationService;
    private final DealStateMachineService stateMachine;

    /** Create a new offer in a conversation. */
    @Transactional
    public DealOffer createOffer(Long senderId, String conversationId, Map<String, Object> body) {
        User sender = users.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", senderId));
        Long receiverId = Long.valueOf(body.get("receiverId").toString());
        User receiver = users.findById(receiverId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", receiverId));

        double price = Double.parseDouble(body.get("price").toString());
        int quantity = Integer.parseInt(body.get("quantity").toString());
        if (price <= 0) throw new BadRequestException("Price must be greater than zero");
        if (quantity <= 0) throw new BadRequestException("Quantity must be greater than zero");

        Long produceId = body.get("produceId") != null ? Long.valueOf(body.get("produceId").toString()) : null;
        Produce produce = produceId != null ? produceRepo.findById(produceId).orElse(null) : null;
        String cropName = (String) body.getOrDefault("cropName",
                produce != null ? produce.getName() : "Produce");
        String unit = (String) body.getOrDefault("unit", produce != null ? produce.getUnit() : "kg");
        String note = (String) body.getOrDefault("note", "");
        LocalDateTime validUntil = body.get("validUntil") != null
                ? LocalDateTime.parse(body.get("validUntil").toString()) : null;

        DealOffer offer = DealOffer.builder()
                .conversationId(conversationId)
                .sender(sender)
                .receiver(receiver)
                .produce(produce)
                .cropName(cropName)
                .price(price)
                .quantity(quantity)
                .unit(unit)
                .note(note)
                .validUntil(validUntil)
                .status(OfferStatus.PENDING)
                .build();
        offer = offerRepository.save(offer);

        // System message in chat so both parties see the structured offer
        messageService.sendMessage(senderId, receiverId,
                buildOfferMessage(offer), produceId);

        notificationService.createNotification(receiverId, Notification.NotificationType.NEW_MESSAGE,
                "New Offer from " + sender.getName(),
                String.format("%s offers ₹%.2f/%s for %d %s of %s",
                        sender.getName(), price, unit, quantity, unit, cropName));

        // Audit trail (recorded against the active deal if one exists)
        Long activeDealId = dealService.findActiveDealIdByConversation(conversationId);
        if (activeDealId != null) {
            stateMachine.recordEvent(activeDealId, "OFFER_CREATED", senderId,
                    sender.getRole() == User.Role.FARMER ? "FARMER" : "BUYER",
                    sender.getName() + " submitted an offer: " + quantity + " " + unit + " of " + cropName +
                            " @ ₹" + price + "/" + unit, null);
        }

        return offer;
    }

    /** Counter an existing offer with new terms. */
    @Transactional
    public DealOffer counterOffer(Long userId, Long offerId, Map<String, Object> body) {
        DealOffer parent = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer", "id", offerId));
        verifyParticipant(parent, userId);

        if (parent.getStatus() != OfferStatus.PENDING) {
            throw new BadRequestException("This offer is no longer pending");
        }

        // Mark parent as countered
        parent.setStatus(OfferStatus.COUNTERED);
        parent.setRespondedAt(LocalDateTime.now());
        offerRepository.save(parent);

        double price = Double.parseDouble(body.get("price").toString());
        int quantity = Integer.parseInt(body.get("quantity").toString());
        if (price <= 0) throw new BadRequestException("Price must be greater than zero");
        if (quantity <= 0) throw new BadRequestException("Quantity must be greater than zero");

        User sender = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        DealOffer counter = DealOffer.builder()
                .conversationId(parent.getConversationId())
                .sender(sender)
                .receiver(parent.getSender())
                .produce(parent.getProduce())
                .cropName(parent.getCropName())
                .price(price)
                .quantity(quantity)
                .unit(parent.getUnit())
                .note((String) body.getOrDefault("note", "Counter-offer"))
                .parentOfferId(parent.getId())
                .status(OfferStatus.PENDING)
                .build();
        counter = offerRepository.save(counter);

        messageService.sendMessage(userId, parent.getSender().getId(),
                "🔄 Counter-offer: ₹" + price + "/" + parent.getUnit() + " for " + quantity + " " + parent.getUnit(),
                parent.getProduce() != null ? parent.getProduce().getId() : null);

        notificationService.createNotification(parent.getSender().getId(), Notification.NotificationType.NEW_MESSAGE,
                "Counter-offer from " + sender.getName(),
                String.format("New terms: ₹%.2f/%s for %d %s", price, parent.getUnit(), quantity, parent.getUnit()));

        Long activeDealId = dealService.findActiveDealIdByConversation(parent.getConversationId());
        if (activeDealId != null) {
            stateMachine.recordEvent(activeDealId, "OFFER_COUNTERED", userId,
                    sender.getRole() == User.Role.FARMER ? "FARMER" : "BUYER",
                    sender.getName() + " countered with ₹" + price + "/" + parent.getUnit() +
                            " for " + quantity + " " + parent.getUnit(), null);
        }

        return counter;
    }

    /** Accept a pending offer → creates a deal in LOCK_PENDING. */
    @Transactional
    public DealOffer acceptOffer(Long userId, Long offerId) {
        DealOffer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer", "id", offerId));
        verifyParticipant(offer, userId);

        if (offer.getStatus() != OfferStatus.PENDING) {
            throw new BadRequestException("This offer is no longer pending");
        }

        offer.setStatus(OfferStatus.ACCEPTED);
        offer.setRespondedAt(LocalDateTime.now());
        offer = offerRepository.save(offer);

        // If there is an active (non-completed, non-cancelled) deal in this conversation,
        // accepting this offer AMENDS the existing deal's terms instead of creating a new deal.
        Long activeDealId = dealService.findActiveDealIdByConversation(offer.getConversationId());
        if (activeDealId != null) {
            dealService.applyAmendment(activeDealId, offer.getCropName(), offer.getQuantity(),
                    offer.getUnit(), offer.getPrice());
            offer.setAmendmentOfDealId(activeDealId);
            offer.setDealId(activeDealId);
            offerRepository.save(offer);
            return offer;
        }

        // No active deal — create a new deal via the existing deal lock flow
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("farmerId", offer.getProduce() != null ? offer.getProduce().getFarmer().getId()
                : (offer.getSender().getRole() == User.Role.FARMER ? offer.getSender().getId() : offer.getReceiver().getId()));
        details.put("buyerId", offer.getSender().getRole() == User.Role.BUSINESS ? offer.getSender().getId() : offer.getReceiver().getId());
        details.put("produceId", offer.getProduce() != null ? offer.getProduce().getId() : null);
        details.put("cropName", offer.getCropName());
        details.put("quantity", offer.getQuantity());
        details.put("unit", offer.getUnit());
        details.put("agreedPrice", offer.getPrice());

        Deal deal = dealService.initiateDealLock(offer.getSender().getId(), offer.getConversationId(), details);
        offer.setDealId(deal.getId());
        offerRepository.save(offer);

        // Audit trail
        stateMachine.recordEvent(deal.getId(), "OFFER_ACCEPTED", userId,
                offer.getReceiver().getRole() == User.Role.FARMER ? "FARMER" : "BUYER",
                "Offer of " + offer.getQuantity() + " " + offer.getUnit() + " of " + offer.getCropName() +
                        " @ ₹" + offer.getPrice() + "/" + offer.getUnit() + " was accepted", null);

        // The accepting party already agrees — auto-confirm them
        dealService.confirmDeal(deal.getId(), userId);

        return offer;
    }

    /** Reject a pending offer. */
    @Transactional
    public DealOffer rejectOffer(Long userId, Long offerId) {
        DealOffer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer", "id", offerId));
        verifyParticipant(offer, userId);

        if (offer.getStatus() != OfferStatus.PENDING) {
            throw new BadRequestException("This offer is no longer pending");
        }

        offer.setStatus(OfferStatus.REJECTED);
        offer.setRespondedAt(LocalDateTime.now());
        offerRepository.save(offer);

        messageService.sendMessage(userId, offer.getSender().getId(),
                "❌ Offer rejected" + (offer.getCropName() != null ? " for " + offer.getCropName() : ""),
                offer.getProduce() != null ? offer.getProduce().getId() : null);

        Long activeDealId = dealService.findActiveDealIdByConversation(offer.getConversationId());
        if (activeDealId != null) {
            stateMachine.recordEvent(activeDealId, "OFFER_REJECTED", userId,
                    offer.getReceiver().getRole() == User.Role.FARMER ? "FARMER" : "BUYER",
                    "Offer of " + offer.getQuantity() + " " + offer.getUnit() + " @ ₹" + offer.getPrice() +
                            "/" + offer.getUnit() + " was rejected", null);
        }

        return offer;
    }

    /** List all offers in a conversation. */
    public List<Map<String, Object>> getConversationOffers(String conversationId) {
        return offerRepository.findByConversationIdOrderByCreatedAtDesc(conversationId)
                .stream().map(this::toResponse).toList();
    }

    /** Pending offers received by a user. */
    public List<Map<String, Object>> getPendingOffersForUser(Long userId) {
        return offerRepository.findByReceiverIdAndStatusOrderByCreatedAtDesc(userId, OfferStatus.PENDING)
                .stream().map(this::toResponse).toList();
    }

    private void verifyParticipant(DealOffer offer, Long userId) {
        if (!offer.getSender().getId().equals(userId) && !offer.getReceiver().getId().equals(userId)) {
            throw new BadRequestException("You are not part of this offer");
        }
    }

    private String buildOfferMessage(DealOffer offer) {
        double total = offer.getPrice() * offer.getQuantity();
        return String.format("🤝 OFFER%n%s%nPrice: ₹%.2f/%s%nQuantity: %d %s%nTotal: ₹%,.2f%s%s",
                offer.getCropName(), offer.getPrice(), offer.getUnit(),
                offer.getQuantity(), offer.getUnit(), total,
                offer.getNote() != null && !offer.getNote().isBlank() ? "\nNote: " + offer.getNote() : "",
                offer.getValidUntil() != null ? "\nValid until: " + offer.getValidUntil().toLocalDate() : "");
    }

    /** Public safe response for a single offer — never exposes User entities. */
    public Map<String, Object> toResponse(DealOffer offer) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", offer.getId());
        map.put("conversationId", offer.getConversationId());
        map.put("senderId", offer.getSender().getId());
        map.put("senderName", offer.getSender().getName());
        map.put("receiverId", offer.getReceiver().getId());
        map.put("receiverName", offer.getReceiver().getName());
        map.put("cropName", offer.getCropName());
        map.put("price", offer.getPrice());
        map.put("quantity", offer.getQuantity());
        map.put("unit", offer.getUnit());
        map.put("total", offer.getPrice() * offer.getQuantity());
        map.put("note", offer.getNote());
        map.put("validUntil", offer.getValidUntil());
        map.put("parentOfferId", offer.getParentOfferId());
        map.put("status", offer.getStatus().name());
        map.put("dealId", offer.getDealId());
        map.put("createdAt", offer.getCreatedAt());
        return map;
    }
}