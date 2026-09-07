package com.mitti2market.controller;

import com.mitti2market.service.AiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "http://localhost:5173")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/ask")
    public ResponseEntity<?> ask(
            @RequestBody Map<String, Object> request) {

        String question =
                request.get("question") != null
                        ? request.get("question").toString()
                        : null;

        String language =
                request.get("language") != null
                        ? request.get("language").toString()
                        : "en";

        String sessionId =
                request.get("sessionId") != null
                        ? request.get("sessionId").toString()
                        : null;

        Double latitude = null;
        Double longitude = null;

        if (request.get("latitude") != null) {
            try {
                latitude = Double.valueOf(
                        request.get("latitude").toString()
                );
            } catch (NumberFormatException ignored) {
                latitude = null;
            }
        }

        if (request.get("longitude") != null) {
            try {
                longitude = Double.valueOf(
                        request.get("longitude").toString()
                );
            } catch (NumberFormatException ignored) {
                longitude = null;
            }
        }

        if (question == null || question.trim().isEmpty()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "error",
                                    "Question cannot be empty"
                            )
                    );
        }

        if (sessionId == null || sessionId.isBlank()) {
            sessionId = UUID.randomUUID().toString();
        }

        String answer =
                aiService.askAgricultureAI(
                        question,
                        language,
                        sessionId,
                        latitude,
                        longitude
                );

        return ResponseEntity.ok(
                Map.of(
                        "answer", answer,
                        "sessionId", sessionId
                )
        );
    }

    @DeleteMapping("/memory/{sessionId}")
    public ResponseEntity<?> clearConversation(
            @PathVariable String sessionId) {

        aiService.clearConversation(sessionId);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Conversation cleared"
                )
        );
    }
}