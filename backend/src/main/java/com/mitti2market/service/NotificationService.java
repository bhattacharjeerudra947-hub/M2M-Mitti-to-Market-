package com.mitti2market.service;

import com.mitti2market.model.Notification;
import com.mitti2market.model.User;
import com.mitti2market.repository.NotificationRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
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

    /**
     * Get active notifications for user.
     * Automatically erases previously seen/read notifications so they do not linger.
     */
    public List<Map<String, Object>> getForUser(Long userId) {
        try {
            notifications.deleteAllSeenByUserId(userId);
        } catch (Exception e) {
            log.warn("Could not auto-erase seen notifications: {}", e.getMessage());
        }

        return notifications.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId).stream()
                .map(n -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", n.getId());
                    map.put("type", n.getType().name());
                    map.put("title", n.getTitle());
                    map.put("body", n.getBody());
                    map.put("referenceId", n.getReferenceId());
                    map.put("referenceType", n.getReferenceType());
                    map.put("metadata", n.getMetadata());
                    map.put("read", Boolean.TRUE.equals(n.getIsRead()));
                    map.put("createdAt", n.getCreatedAt());
                    return map;
                }).toList();
    }

    public long getUnreadCount(Long userId) {
        return notifications.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Mark all notifications as read / clear them from user menu.
     * Automatically erases all notifications for the user.
     */
    public void markAllRead(Long userId) {
        try {
            notifications.deleteAllByUserId(userId);
        } catch (Exception e) {
            log.warn("Could not erase all notifications: {}", e.getMessage());
        }
    }

    /**
     * When a single notification is seen/read, automatically erase it from database.
     */
    public void markAsRead(Long notificationId) {
        notifications.findById(notificationId).ifPresent(n -> {
            try {
                notifications.delete(n);
            } catch (Exception e) {
                n.setIsRead(true);
                notifications.save(n);
            }
        });
    }

    /**
     * Explicit delete of a specific notification belonging to the user.
     */
    public void deleteNotification(Long id, Long userId) {
        try {
            notifications.deleteByIdAndUserId(id, userId);
        } catch (Exception e) {
            log.warn("Could not delete notification {}: {}", id, e.getMessage());
        }
    }

    /**
     * Explicit cleanup of all seen notifications for the user.
     */
    public void deleteSeenNotifications(Long userId) {
        try {
            notifications.deleteAllSeenByUserId(userId);
        } catch (Exception e) {
            log.warn("Could not delete seen notifications: {}", e.getMessage());
        }
    }
}
