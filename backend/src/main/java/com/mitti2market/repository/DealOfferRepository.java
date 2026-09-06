package com.mitti2market.repository;

import com.mitti2market.model.DealOffer;
import com.mitti2market.model.DealOffer.OfferStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DealOfferRepository extends JpaRepository<DealOffer, Long> {

    /** All offers in a conversation, newest first */
    List<DealOffer> findByConversationIdOrderByCreatedAtDesc(String conversationId);

    /** Pending offers received by a user */
    List<DealOffer> findByReceiverIdAndStatusOrderByCreatedAtDesc(Long receiverId, OfferStatus status);

    /** Offers sent by a user */
    List<DealOffer> findBySenderIdOrderByCreatedAtDesc(Long senderId);
}