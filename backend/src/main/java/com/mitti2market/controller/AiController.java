package com.mitti2market.controller;

import com.mitti2market.service.AiService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/ask")
    public ResponseEntity<?> ask(
            @RequestBody Map<String, Object> request) {

        String question = request.get("question") != null
                ? request.get("question").toString()
                : null;

        String language = request.get("language") != null
                ? request.get("language").toString()
                : "en";

        String sessionId = request.get("sessionId") != null
                ? request.get("sessionId").toString()
                : null;

        Double latitude = null;
        Double longitude = null;

        if (request.get("latitude") != null) {
            try {
                latitude = Double.valueOf(request.get("latitude").toString());
            } catch (NumberFormatException ignored) {}
        }

        if (request.get("longitude") != null) {
            try {
                longitude = Double.valueOf(request.get("longitude").toString());
            } catch (NumberFormatException ignored) {}
        }

        String district = request.get("district") != null
                ? request.get("district").toString().trim()
                : null;

        String state = request.get("state") != null
                ? request.get("state").toString().trim()
                : null;

        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Question cannot be empty"));
        }

        if (sessionId == null || sessionId.isBlank()) {
            sessionId = UUID.randomUUID().toString();
        }

        Map<String, Object> responseDetails = aiService.askAgricultureAIWithDetails(
                question,
                language,
                sessionId,
                district,
                state,
                latitude,
                longitude
        );

        return ResponseEntity.ok(responseDetails);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamAsk(
            @RequestParam String question,
            @RequestParam(required = false, defaultValue = "en") String language,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude) {

        String sid = (sessionId == null || sessionId.isBlank()) ? UUID.randomUUID().toString() : sessionId;

        return aiService.streamAgricultureAI(question, language, sid, district, state, latitude, longitude)
                .map(chunk -> ServerSentEvent.<String>builder()
                        .event("chunk")
                        .data(chunk)
                        .build())
                .concatWith(Flux.just(ServerSentEvent.<String>builder()
                        .event("complete")
                        .data(sid)
                        .build()));
    }

    @DeleteMapping("/memory/{sessionId}")
    public ResponseEntity<?> clearConversation(
            @PathVariable String sessionId) {

        aiService.clearConversation(sessionId);

        return ResponseEntity.ok(
                Map.of(
                        "message", "Conversation cleared",
                        "sessionId", sessionId
                )
        );
    }
}