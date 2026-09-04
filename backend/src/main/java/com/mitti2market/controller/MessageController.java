package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.model.Message;
import com.mitti2market.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;
    private final TokenService tokens;

    public MessageController(MessageService messageService, TokenService tokens) {
        this.messageService = messageService;
        this.tokens = tokens;
    }

    /** Send a message */
    @PostMapping
    public ResponseEntity<?> sendMessage(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        Long receiverId = Long.valueOf(body.get("receiverId").toString());
        String content = (String) body.get("content");
        Long produceId = body.containsKey("produceId") && body.get("produceId") != null
                ? Long.valueOf(body.get("produceId").toString()) : null;

        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Message content is required"));
        }

        Message msg = messageService.sendMessage(userId, receiverId, content.trim(), produceId);

        return ResponseEntity.ok(ApiResponse.ok("Message sent", Map.of(
                "id", msg.getId(),
                "conversationId", msg.getConversationId(),
                "content", msg.getContent(),
                "createdAt", msg.getCreatedAt()
        )));
    }

    /** Get messages in a conversation */
    @GetMapping("/{conversationId}")
    public ResponseEntity<?> getConversation(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String conversationId) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Message> messages = messageService.getConversation(conversationId);

        // Mark as read
        if (!messages.isEmpty()) {
            Message lastMsg = messages.get(messages.size() - 1);
            if (!lastMsg.getSender().getId().equals(userId)) {
                messageService.markAsRead(userId, lastMsg.getSender().getId());
            }
        }

        List<Map<String, Object>> msgList = messages.stream().map(m -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", m.getId());
            map.put("senderId", m.getSender().getId());
            map.put("senderName", m.getSender().getName());
            map.put("content", m.getContent());
            map.put("createdAt", m.getCreatedAt());
            map.put("read", m.getRead());
            return map;
        }).toList();

        return ResponseEntity.ok(ApiResponse.ok(msgList));
    }

    /** Get conversation between two users about a specific produce */
    @GetMapping("/between/{user1}/{user2}")
    public ResponseEntity<?> getConversationBetween(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long user1,
            @PathVariable Long user2,
            @RequestParam(required = false) Long produceId) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Message> msgs = messageService.getConversationBetween(user1, user2, produceId);

        List<Map<String, Object>> msgList = msgs.stream().map(m -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", m.getId());
            map.put("senderId", m.getSender().getId());
            map.put("senderName", m.getSender().getName());
            map.put("content", m.getContent());
            map.put("createdAt", m.getCreatedAt());
            map.put("read", m.getRead());
            return map;
        }).toList();

        return ResponseEntity.ok(ApiResponse.ok(msgList));
    }

    /** Get all conversations for the current user */
    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<Map<String, Object>> conversations = messageService.getConversationsList(userId);
        return ResponseEntity.ok(ApiResponse.ok(conversations));
    }

    /** Get unread message count */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        long count = messageService.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("unreadCount", count)));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}
