package com.mitti2market.service;

import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.Message;
import com.mitti2market.model.Produce;
import com.mitti2market.model.User;
import com.mitti2market.repository.MessageRepository;
import com.mitti2market.repository.ProduceRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messages;
    private final UserRepository users;
    private final ProduceRepository produceRepository;

    /** Send a message from sender to receiver, optionally about a produce */
    public Message sendMessage(Long senderId, Long receiverId, String content, Long produceId) {
        User sender = users.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", senderId));
        User receiver = users.findById(receiverId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", receiverId));

        Produce produce = null;
        if (produceId != null) {
            produce = produceRepository.findById(produceId).orElse(null);
        }

        // Generate consistent conversation ID regardless of who messages first
        String conversationId = generateConversationId(senderId, receiverId, produceId);

        Message msg = Message.builder()
                .conversationId(conversationId)
                .sender(sender)
                .receiver(receiver)
                .produce(produce)
                .content(content)
                .read(false)
                .build();

        return messages.save(msg);
    }

    /** Get all messages in a conversation */
    public List<Message> getConversation(String conversationId) {
        return messages.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    /** Get conversation between two users about a produce */
    public List<Message> getConversationBetween(Long user1, Long user2, Long produceId) {
        return messages.findConversationBetween(user1, user2, produceId);
    }

    /** Get all unique conversations for a user, with last message and other user info */
    public List<Map<String, Object>> getConversationsList(Long userId) {
        List<Message> allMessages = messages.findConversationsForUser(userId);

        // Group by conversation ID, keep the latest message
        Map<String, Message> latestByConversation = new LinkedHashMap<>();
        for (Message m : allMessages) {
            latestByConversation.putIfAbsent(m.getConversationId(), m);
        }

        // Build conversation list
        return latestByConversation.entrySet().stream().map(entry -> {
            Message lastMsg = entry.getValue();
            User otherUser = lastMsg.getSender().getId().equals(userId)
                    ? lastMsg.getReceiver() : lastMsg.getSender();

            long unreadCount = messages.countUnreadFromSender(userId, otherUser.getId());

            Map<String, Object> conv = new HashMap<>();
            conv.put("conversationId", entry.getKey());
            conv.put("otherUserId", otherUser.getId());
            conv.put("otherUserName", otherUser.getName());
            conv.put("otherUserRole", otherUser.getRole().name());
            conv.put("lastMessage", lastMsg.getContent());
            conv.put("lastMessageTime", lastMsg.getCreatedAt());
            conv.put("unreadCount", unreadCount);
            if (lastMsg.getProduce() != null) {
                conv.put("produceId", lastMsg.getProduce().getId());
                conv.put("produceName", lastMsg.getProduce().getName());
            }
            return conv;
        }).collect(Collectors.toList());
    }

    /** Mark all messages in a conversation as read */
    public void markAsRead(Long userId, Long otherUserId) {
        messages.markAsRead(userId, otherUserId);
    }

    /** Get unread message count for a user */
    public long getUnreadCount(Long userId) {
        return messages.countUnread(userId);
    }

    /** Get or create a conversation ID between two users about a produce */
    public String getOrCreateConversation(Long user1, Long user2, Long produceId) {
        return generateConversationId(user1, user2, produceId);
    }

    /** Generate a consistent conversation ID */
    private String generateConversationId(Long user1, Long user2, Long produceId) {
        Long minId = Math.min(user1, user2);
        Long maxId = Math.max(user1, user2);
        String producePart = produceId != null ? "-p" + produceId : "";
        return "conv-" + minId + "-" + maxId + producePart;
    }
}
