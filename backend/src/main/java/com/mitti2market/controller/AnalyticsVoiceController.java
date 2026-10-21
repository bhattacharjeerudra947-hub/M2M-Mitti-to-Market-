package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.service.AnalyticsVoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AnalyticsVoiceController {

    private final AnalyticsVoiceService voiceService;

    @PostMapping("/voice-query")
    public ResponseEntity<ApiResponse<Map<String, Object>>> processVoiceQuery(
            @RequestBody Map<String, Object> body) {

        String query = (String) body.getOrDefault("query", "");
        String language = (String) body.getOrDefault("language", "en");
        Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : 1L;
        String role = (String) body.getOrDefault("role", "FARMER");

        Map<String, Object> response = voiceService.processVoiceQuery(query, language, userId, role);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
