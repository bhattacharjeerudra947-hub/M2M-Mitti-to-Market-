package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.model.BuyerInterest.InterestStatus;
import com.mitti2market.model.Notification.NotificationType;
import com.mitti2market.repository.BuyerInterestRepository;
import com.mitti2market.repository.NotificationRepository;
import com.mitti2market.repository.ProduceRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class BuyerInterestService {

    private final BuyerInterestRepository interests;
    private final ProduceRepository produceRepository;
    private final UserRepository users;
    private final MessageService messageService;
    private final NotificationRepository notifications;

    /**
     * Buyer expresses interest in a farmer's produce listing.
     */
    public BuyerInterest expressInterest(Long buyerId, Long produceId, Double offeredPrice,
                                          Integer offeredQuantity, String message) {
        User buyer = users.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", buyerId));
        Produce produce = produceRepository.findById(produceId)
                .orElseThrow(() -> new ResourceNotFoundException("Produce", "id", produceId));

        // Check if buyer already expressed interest
        Optional<BuyerInterest> existing = interests.findByBuyerIdAndProduceId(buyerId, produceId);
        if (existing.isPresent()) {
            throw new BadRequestException("You have already expressed interest in this produce");
        }

        BuyerInterest interest = BuyerInterest.builder()
                .buyer(buyer)
                .farmer(produce.getFarmer())
                .produce(produce)
                .offeredPrice(offeredPrice)
                .offeredQuantity(offeredQuantity)
                .message(message)
                .status(InterestStatus.PENDING)
                .build();

        interest = interests.save(interest);

        // Notify the farmer
        notifications.save(Notification.builder()
                .user(produce.getFarmer())
                .type(NotificationType.BUYER_INTEREST)
                .title("New Interest in " + produce.getName())
                .body(buyer.getName() + " is interested in buying " +
                      (offeredQuantity != null ? offeredQuantity : produce.getQuantity()) + " " + produce.getUnit() +
                      " of " + produce.getName() +
                      (offeredPrice != null ? " at ₹" + offeredPrice + "/" + produce.getUnit() : ""))
                .referenceId(interest.getId())
                .referenceType("INTEREST")
                .build());

        return interest;
    }

    /**
     * Farmer accepts a buyer's interest → creates conversation automatically.
     */
    @Transactional
    public BuyerInterest acceptInterest(Long interestId, Long farmerId) {
        BuyerInterest interest = interests.findById(interestId)
                .orElseThrow(() -> new ResourceNotFoundException("Interest", "id", interestId));

        // Verify farmer owns this interest
        if (!interest.getFarmer().getId().equals(farmerId)) {
            throw new BadRequestException("You can only accept interests on your own produce");
        }

        if (interest.getStatus() != InterestStatus.PENDING) {
            throw new BadRequestException("This interest has already been " + interest.getStatus().name().toLowerCase());
        }

        // Create conversation between farmer and buyer
        String conversationId = messageService.getOrCreateConversation(
                farmerId, interest.getBuyer().getId(), interest.getProduce().getId());

        interest.setStatus(InterestStatus.ACCEPTED);
        interest.setConversationId(conversationId);
        interest = interests.save(interest);

        // Send system message to start the conversation
        messageService.sendMessage(farmerId, interest.getBuyer().getId(),
                "Hi! I've accepted your interest in my " + interest.getProduce().getName() +
                ". Let's discuss the details.", interest.getProduce().getId());

        // Notify the buyer
        notifications.save(Notification.builder()
                .user(interest.getBuyer())
                .type(NotificationType.INTEREST_ACCEPTED)
                .title("Interest Accepted!")
                .body(interest.getFarmer().getName() + " accepted your interest in " +
                      interest.getProduce().getName() + ". Start chatting to finalize the deal!")
                .referenceId(interest.getId())
                .referenceType("INTEREST")
                .build());

        return interest;
    }

    /**
     * Farmer rejects a buyer's interest.
     */
    public BuyerInterest rejectInterest(Long interestId, Long farmerId) {
        BuyerInterest interest = interests.findById(interestId)
                .orElseThrow(() -> new ResourceNotFoundException("Interest", "id", interestId));

        if (!interest.getFarmer().getId().equals(farmerId)) {
            throw new BadRequestException("You can only reject interests on your own produce");
        }

        if (interest.getStatus() != InterestStatus.PENDING) {
            throw new BadRequestException("This interest has already been " + interest.getStatus().name().toLowerCase());
        }

        interest.setStatus(InterestStatus.REJECTED);
        interest = interests.save(interest);

        // Notify the buyer
        notifications.save(Notification.builder()
                .user(interest.getBuyer())
                .type(NotificationType.INTEREST_REJECTED)
                .title("Interest Not Accepted")
                .body(interest.getFarmer().getName() + " could not accept your interest in " +
                      interest.getProduce().getName() + ".")
                .referenceId(interest.getId())
                .referenceType("INTEREST")
                .build());

        return interest;
    }

    /**
     * Get all interests for a farmer's produce.
     */
    public List<Map<String, Object>> getFarmerInterests(Long farmerId) {
        List<BuyerInterest> list = interests.findByFarmerIdOrderByCreatedAtDesc(farmerId);
        return list.stream().map(this::toResponse).toList();
    }

    /**
     * Get pending interests for a farmer.
     */
    public List<Map<String, Object>> getFarmerPendingInterests(Long farmerId) {
        List<BuyerInterest> list = interests.findByFarmerIdAndStatusOrderByCreatedAtDesc(farmerId, InterestStatus.PENDING);
        return list.stream().map(this::toResponse).toList();
    }

    /**
     * Get interests by a buyer.
     */
    public List<Map<String, Object>> getBuyerInterests(Long buyerId) {
        List<BuyerInterest> list = interests.findByBuyerIdOrderByCreatedAtDesc(buyerId);
        return list.stream().map(this::toResponse).toList();
    }

    /**
     * Get pending interest count for a farmer.
     */
    public long getPendingCount(Long farmerId) {
        return interests.countByFarmerIdAndStatus(farmerId, InterestStatus.PENDING);
    }

    private Map<String, Object> toResponse(BuyerInterest interest) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", interest.getId());
        resp.put("buyerId", interest.getBuyer().getId());
        resp.put("buyerName", interest.getBuyer().getName());
        resp.put("buyerEmail", interest.getBuyer().getEmail());
        resp.put("farmerId", interest.getFarmer().getId());
        resp.put("farmerName", interest.getFarmer().getName());
        resp.put("produceId", interest.getProduce().getId());
        resp.put("produceName", interest.getProduce().getName());
        resp.put("produceCategory", interest.getProduce().getCategory());
        resp.put("produceQuantity", interest.getProduce().getQuantity());
        resp.put("produceUnit", interest.getProduce().getUnit());
        resp.put("producePrice", interest.getProduce().getPricePerUnit());
        resp.put("produceLocation", interest.getProduce().getLocation());
        resp.put("produceImageUrl", interest.getProduce().getImageUrl());
        resp.put("offeredPrice", interest.getOfferedPrice());
        resp.put("offeredQuantity", interest.getOfferedQuantity());
        resp.put("message", interest.getMessage());
        resp.put("status", interest.getStatus().name());
        resp.put("conversationId", interest.getConversationId());
        resp.put("createdAt", interest.getCreatedAt());
        return resp;
    }
}
