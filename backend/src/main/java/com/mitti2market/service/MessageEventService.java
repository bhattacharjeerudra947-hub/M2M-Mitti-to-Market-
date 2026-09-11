package com.mitti2market.service;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Real-time message push via Server-Sent Events.
 * Keeps one SseEmitter per open browser tab per user; whenever a message
 * is saved, it is pushed to both the sender and the receiver so messages
 * appear on screen instantly instead of waiting for the next poll.
 */
@Service
public class MessageEventService {

    private static final long TIMEOUT_MS = 30 * 60 * 1000L; // 30 minutes

    private final Map<Long, List<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();

    /** Register a new SSE connection for a user. */
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        List<SseEmitter> userEmitters = emittersByUser.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>());
        userEmitters.add(emitter);

        Runnable remove = () -> {
            userEmitters.remove(emitter);
            if (userEmitters.isEmpty()) emittersByUser.remove(userId);
        };
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> remove.run());

        // Send an initial comment to open the stream
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException ignored) {
            remove.run();
        }
        return emitter;
    }

    /** Push a message event to a user's open tabs. */
    public void publish(Long userId, Map<String, Object> payload) {
        List<SseEmitter> userEmitters = emittersByUser.get(userId);
        if (userEmitters == null || userEmitters.isEmpty()) return;

        for (SseEmitter emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event().name("message").data(payload));
            } catch (IOException | IllegalStateException e) {
                userEmitters.remove(emitter);
            }
        }
        if (userEmitters.isEmpty()) emittersByUser.remove(userId);
    }

    /** Push a notification event to a user's open tabs for instant alerts / toasts. */
    public void publishNotification(Long userId, Map<String, Object> payload) {
        List<SseEmitter> userEmitters = emittersByUser.get(userId);
        if (userEmitters == null || userEmitters.isEmpty()) return;

        for (SseEmitter emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(payload));
            } catch (IOException | IllegalStateException e) {
                userEmitters.remove(emitter);
            }
        }
        if (userEmitters.isEmpty()) emittersByUser.remove(userId);
    }
}