package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.Deal;
import com.mitti2market.model.LogisticsIncident;
import com.mitti2market.model.Notification;
import com.mitti2market.model.User;
import com.mitti2market.repository.DealRepository;
import com.mitti2market.repository.LogisticsIncidentRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogisticsIncidentService {

    private final LogisticsIncidentRepository incidentRepo;
    private final DealRepository dealRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    @Transactional
    public LogisticsIncident reportIncident(Long dealId, Long reporterId,
                                            LogisticsIncident.IncidentType incidentType,
                                            String description, String photoUrls, Double estimatedLoss) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));
        User reporter = userRepo.findById(reporterId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", reporterId));

        String incNum = "INC-M2M-" + String.format("%06d", ThreadLocalRandom.current().nextInt(100000, 999999));

        LogisticsIncident incident = LogisticsIncident.builder()
                .incidentNumber(incNum)
                .deal(deal)
                .reportedBy(reporter)
                .incidentType(incidentType != null ? incidentType : LogisticsIncident.IncidentType.TRANSIT_DAMAGE)
                .description(description)
                .photoUrls(photoUrls)
                .estimatedLossAmount(estimatedLoss)
                .liabilityParty(LogisticsIncident.LiabilityParty.UNDETERMINED)
                .status(LogisticsIncident.IncidentStatus.REPORTED)
                .build();

        incident = incidentRepo.save(incident);

        Long counterpartyId = reporter.getId().equals(deal.getFarmer().getId())
                ? (deal.getBuyer() != null ? deal.getBuyer().getId() : null)
                : (deal.getFarmer() != null ? deal.getFarmer().getId() : null);

        if (counterpartyId != null) {
            notificationService.createNotification(
                    counterpartyId,
                    Notification.NotificationType.TRANSIT_INCIDENT_REPORTED,
                    "Transit Incident Reported",
                    "A transit incident (" + incident.getIncidentNumber() + ") was reported for Deal " + deal.getDealId() + ". Our team is reviewing evidence.",
                    deal.getId(),
                    "DEAL"
            );
        }

        log.info("Logistics incident {} reported for deal {}", incNum, deal.getDealId());
        return incident;
    }

    @Transactional
    public LogisticsIncident adjudicateLiability(Long incidentId, Long resolverId,
                                                 LogisticsIncident.LiabilityParty liabilityParty,
                                                 String financialAttributionNotes,
                                                 String resolutionSummary) {
        LogisticsIncident incident = incidentRepo.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", incidentId));
        User resolver = userRepo.findById(resolverId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", resolverId));

        if (liabilityParty == null) {
            throw new BadRequestException("Liability party must be determined");
        }

        incident.setLiabilityParty(liabilityParty);
        incident.setFinancialAttributionNotes(financialAttributionNotes);
        incident.setResolutionSummary(resolutionSummary);
        incident.setStatus(LogisticsIncident.IncidentStatus.RESOLVED);
        incident.setResolvedBy(resolver);
        incident.setResolvedAt(LocalDateTime.now());

        incident = incidentRepo.save(incident);

        Deal deal = incident.getDeal();
        String notice = "Liability determined for Incident " + incident.getIncidentNumber() + ": " + liabilityParty.name() + ". " +
                (financialAttributionNotes != null ? financialAttributionNotes : "");

        if (deal.getFarmer() != null) {
            notificationService.createNotification(deal.getFarmer().getId(), Notification.NotificationType.DISPUTE_RESOLVED,
                    "Incident Resolution & Liability", notice, deal.getId(), "DEAL");
        }
        if (deal.getBuyer() != null) {
            notificationService.createNotification(deal.getBuyer().getId(), Notification.NotificationType.DISPUTE_RESOLVED,
                    "Incident Resolution & Liability", notice, deal.getId(), "DEAL");
        }

        return incident;
    }

    public List<LogisticsIncident> getIncidentsForDeal(Long dealId) {
        return incidentRepo.findByDealIdOrderByCreatedAtDesc(dealId);
    }

    public List<LogisticsIncident> getAllIncidents() {
        return incidentRepo.findAll();
    }
}
