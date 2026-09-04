package com.mitti2market.repository;

import com.mitti2market.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Get all messages in a conversation, ordered by time */
    List<Message> findByConversationIdOrderByCreatedAtAsc(String conversationId);

    /** Get all conversations for a user (the latest message in each) */
    @Query("SELECT m FROM Message m WHERE m.sender.id = :userId OR m.receiver.id = :userId " +
           "ORDER BY m.createdAt DESC")
    List<Message> findConversationsForUser(@Param("userId") Long userId);

    /** Get conversation between two specific users about a specific produce (or null produce) */
    @Query("SELECT m FROM Message m WHERE " +
           "((m.sender.id = :user1 AND m.receiver.id = :user2) OR " +
           "(m.sender.id = :user2 AND m.receiver.id = :user1)) " +
           "AND (:produceId IS NULL OR m.produce.id = :produceId) " +
           "ORDER BY m.createdAt ASC")
    List<Message> findConversationBetween(@Param("user1") Long user1, @Param("user2") Long user2, @Param("produceId") Long produceId);

    /** Count unread messages for a user */
    @Query("SELECT COUNT(m) FROM Message m WHERE m.receiver.id = :userId AND m.read = false")
    long countUnread(@Param("userId") Long userId);

    /** Count unread messages from a specific sender */
    @Query("SELECT COUNT(m) FROM Message m WHERE m.receiver.id = :userId AND m.sender.id = :senderId AND m.read = false")
    long countUnreadFromSender(@Param("userId") Long userId, @Param("senderId") Long senderId);

    /** Mark all messages from a sender as read */
    @Modifying
    @Transactional
    @Query("UPDATE Message m SET m.read = true WHERE m.receiver.id = :userId AND m.sender.id = :senderId AND m.read = false")
    void markAsRead(@Param("userId") Long userId, @Param("senderId") Long senderId);
}
