package com.mitti2market.service;

import com.mitti2market.model.Notification;
import com.mitti2market.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notifications;

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
