package com.mitti2market.service;

import com.mitti2market.model.Notification;
import com.mitti2market.model.User;
import com.mitti2market.repository.NotificationRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final MessageEventService messageEventService;

    public void createNotification(Long userId, Notification.NotificationType type, String title, String body) {
        createNotification(userId, type, title, body, null, null, null);
    }

    public void createNotification(Long userId, Notification.NotificationType type, String title, String body, Long referenceId, String referenceType) {
        createNotification(userId, type, title, body, referenceId, referenceType, null);
    }

    public Notification createNotification(Long userId, Notification.NotificationType type, String title, String body, Long referenceId, String referenceType, String metadata) {
        User user = users.findById(userId).orElse(null);
        if (user == null) return null;

        Notification notif = notifications.save(Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .metadata(metadata)
                .build());

        // Instant SSE push for real-time popups/toasts
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", notif.getId());
        payload.put("type", notif.getType().name());
        payload.put("title", notif.getTitle());
        payload.put("body", notif.getBody());
        payload.put("referenceId", notif.getReferenceId());
        payload.put("referenceType", notif.getReferenceType());
        payload.put("metadata", notif.getMetadata());
        payload.put("createdAt", notif.getCreatedAt());

        messageEventService.publishNotification(userId, payload);

        return notif;
    }

    public List<Map<String, Object>> getForUser(Long userId) {
        return notifications.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(n -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", n.getId());
                    map.put("type", n.getType().name());
                    map.put("title", n.getTitle());
                    map.put("body", n.getBody());
                    map.put("referenceId", n.getReferenceId());
                    map.put("referenceType", n.getReferenceType());
                    map.put("metadata", n.getMetadata());
                    map.put("read", n.getIsRead());
                    map.put("createdAt", n.getCreatedAt());
                    return map;
                }).toList();
    }

    public long getUnreadCount(Long userId) {
        return notifications.countByUserIdAndIsReadFalse(userId);
    }

    public void markAllRead(Long userId) {
        notifications.markAllAsRead(userId);
    }
}
