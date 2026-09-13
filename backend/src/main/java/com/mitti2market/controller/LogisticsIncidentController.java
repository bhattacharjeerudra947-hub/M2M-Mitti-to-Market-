package com.mitti2market.controller;

import com.mitti2market.config.TokenService;
import com.mitti2market.dto.ApiResponse;
import com.mitti2market.exception.BadRequestException;
import com.mitti2market.model.LogisticsIncident;
import com.mitti2market.service.LogisticsIncidentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logistics/incidents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LogisticsIncidentController {

    private final LogisticsIncidentService incidentService;
    private final TokenService tokens;

    @PostMapping
    public ResponseEntity<ApiResponse<LogisticsIncident>> reportIncident(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {

        Long userId = extractUserId(authHeader);
        if (userId == null) throw new BadRequestException("Authentication required");

        Long dealId = Long.valueOf(body.get("dealId").toString());
        String typeStr = body.get("incidentType") != null ? body.get("incidentType").toString() : "TRANSIT_DAMAGE";
        LogisticsIncident.IncidentType type;
        try {
            type = LogisticsIncident.IncidentType.valueOf(typeStr.toUpperCase());
        } catch (Exception e) {
            if ("DAMAGE".equalsIgnoreCase(typeStr)) type = LogisticsIncident.IncidentType.TRANSIT_DAMAGE;
            else if ("DELAY".equalsIgnoreCase(typeStr)) type = LogisticsIncident.IncidentType.TRANSIT_DELAY;
            else if ("BREAKDOWN".equalsIgnoreCase(typeStr)) type = LogisticsIncident.IncidentType.ACCIDENT;
            else if ("SPOILAGE".equalsIgnoreCase(typeStr)) type = LogisticsIncident.IncidentType.SPOILAGE;
            else type = LogisticsIncident.IncidentType.OTHER;
        }

        String description = (String) body.get("description");
        String location = (String) body.get("incidentLocation");
        if (location != null && !location.isBlank()) {
            description = "[Location: " + location.trim() + "] " + (description != null ? description : "");
        }

        String photoUrls = body.get("photoUrls") != null ? body.get("photoUrls").toString()
                : (body.get("evidenceUrl") != null ? body.get("evidenceUrl").toString() : null);
        Double estimatedLoss = body.get("estimatedLossAmount") != null ? Double.valueOf(body.get("estimatedLossAmount").toString()) : null;

        LogisticsIncident incident = incidentService.reportIncident(dealId, userId, type, description, photoUrls, estimatedLoss);
        return ResponseEntity.ok(ApiResponse.ok(incident));
    }

    @GetMapping("/deal/{dealId}")
    public ResponseEntity<ApiResponse<List<LogisticsIncident>>> getDealIncidents(
            @PathVariable Long dealId) {

        List<LogisticsIncident> list = incidentService.getIncidentsForDeal(dealId);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LogisticsIncident>>> getAllIncidents() {
        List<LogisticsIncident> list = incidentService.getAllIncidents();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PutMapping("/{incidentId}/liability")
    public ResponseEntity<ApiResponse<LogisticsIncident>> adjudicateLiability(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long incidentId,
            @RequestBody Map<String, Object> body) {

        Long userId = extractUserId(authHeader);
        if (userId == null) throw new BadRequestException("Authentication required");

        String liabilityStr = body.get("liabilityParty").toString();
        LogisticsIncident.LiabilityParty party = LogisticsIncident.LiabilityParty.valueOf(liabilityStr);
        String financialNotes = body.get("financialAttributionNotes") != null
                ? body.get("financialAttributionNotes").toString()
                : (body.get("lossAttributedTo") != null ? body.get("lossAttributedTo").toString() : null);
        String summary = body.get("resolutionSummary") != null
                ? body.get("resolutionSummary").toString()
                : (body.get("resolution") != null ? body.get("resolution").toString() : null);

        LogisticsIncident incident = incidentService.adjudicateLiability(incidentId, userId, party, financialNotes, summary);
        return ResponseEntity.ok(ApiResponse.ok(incident));
    }

    private Long extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        return tokens.validateAccessToken(authHeader.substring(7));
    }
}
