package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.model.Deal.DealStatus;
import com.mitti2market.model.Logistics.LogisticsStatus;
import com.mitti2market.model.Logistics.LogisticsType;
import com.mitti2market.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class LogisticsService {

    private final LogisticsRepository logisticsRepo;
    private final LogisticsEventRepository eventRepo;
    private final DealRepository dealRepo;
    private final DeliveryConfirmationRepository deliveryRepo;
    private final UserRepository users;
    private final MessageService messageService;
    private final NotificationService notificationService;

    private final AtomicLong trkCounter = new AtomicLong(100000);

    @jakarta.annotation.PostConstruct
    void initCounter() {
        // Start counter above any existing tracking IDs in the database
        logisticsRepo.findAll().stream()
                .map(Logistics::getTrackingId)
                .filter(id -> id != null && id.startsWith("M2M-TRK-"))
                .map(id -> {
                    try { return Long.parseLong(id.replace("M2M-TRK-", "")); } catch (Exception e) { return 0L; }
                })
                .max(Long::compareTo)
                .ifPresent(max -> trkCounter.set(Math.max(trkCounter.get(), max + 1)));
    }

    /**
     * Select logistics type for a locked deal.
     */
    @Transactional
    public Logistics selectLogistics(Long dealId, Long userId, LogisticsType type) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));

        verifyDealAccess(deal, userId);

        if (deal.getStatus() != DealStatus.LOCKED) {
            throw new BadRequestException("Deal must be locked before selecting logistics");
        }

        // Check if logistics already exists
        Optional<Logistics> existing = logisticsRepo.findByDealId(dealId);
        if (existing.isPresent()) {
            throw new BadRequestException("Logistics already selected for this deal");
        }

        String trackingId = "M2M-TRK-" + (trkCounter.incrementAndGet());

        Logistics logistics = Logistics.builder()
                .trackingId(trackingId)
                .deal(deal)
                .type(type)
                .pickupLocation(deal.getPickupLocation())
                .deliveryLocation(deal.getDeliveryLocation())
                .status(type == LogisticsType.OWN ? LogisticsStatus.REQUESTED : LogisticsStatus.REQUESTED)
                .build();

        logistics = logisticsRepo.save(logistics);

        deal.setStatus(DealStatus.LOGISTICS_PENDING);
        dealRepo.save(deal);

        addEvent(logistics, LogisticsStatus.REQUESTED, "Logistics type selected: " + type, null);

        String typeName = type == LogisticsType.OWN ? "Own Logistics" : "Mitti2Market Logistics";
        messageService.sendMessage(deal.getFarmer().getId(), deal.getBuyer().getId(),
                "🚚 Logistics Selected\nType: " + typeName + "\nTracking ID: " + trackingId +
                (type == LogisticsType.OWN ? "\n\nPlease provide transporter details." : "\n\nMitti2Market will assign a transporter."),
                deal.getProduce() != null ? deal.getProduce().getId() : null);

        Long otherUserId = userId.equals(deal.getFarmer().getId()) ? deal.getBuyer().getId() : deal.getFarmer().getId();
        User user = users.findById(userId).orElseThrow();
        notificationService.createNotification(otherUserId, Notification.NotificationType.LOGISTICS_SELECTED,
                "Logistics Selected", user.getName() + " selected " + typeName + " for deal " + deal.getDealId());

        return logistics;
    }

    /**
     * Update logistics details (transporter info for OWN logistics).
     */
    @Transactional
    public Logistics updateLogisticsDetails(Long logisticsId, Long userId, Map<String, Object> details) {
        Logistics logistics = logisticsRepo.findById(logisticsId)
                .orElseThrow(() -> new ResourceNotFoundException("Logistics", "id", logisticsId));

        verifyDealAccess(logistics.getDeal(), userId);

        if (details.containsKey("transporterName")) logistics.setTransporterName((String) details.get("transporterName"));
        if (details.containsKey("driverName")) logistics.setDriverName((String) details.get("driverName"));
        if (details.containsKey("driverPhone")) logistics.setDriverPhone((String) details.get("driverPhone"));
        if (details.containsKey("vehicleNumber")) logistics.setVehicleNumber((String) details.get("vehicleNumber"));
        if (details.containsKey("vehicleType")) logistics.setVehicleType((String) details.get("vehicleType"));
        if (details.containsKey("contactPerson")) logistics.setContactPerson((String) details.get("contactPerson"));
        if (details.containsKey("contactPhone")) logistics.setContactPhone((String) details.get("contactPhone"));
        if (details.containsKey("specialHandling")) logistics.setSpecialHandling((String) details.get("specialHandling"));
        if (details.containsKey("packagingRequirements")) logistics.setPackagingRequirements((String) details.get("packagingRequirements"));
        if (details.containsKey("trackingUrl")) logistics.setTrackingUrl((String) details.get("trackingUrl"));
        if (details.containsKey("scheduledPickup")) {
            logistics.setScheduledPickup(LocalDateTime.parse((String) details.get("scheduledPickup")));
        }
        if (details.containsKey("expectedDelivery")) {
            logistics.setExpectedDelivery(LocalDateTime.parse((String) details.get("expectedDelivery")));
        }

        logistics = logisticsRepo.save(logistics);

        messageService.sendMessage(logistics.getDeal().getFarmer().getId(), logistics.getDeal().getBuyer().getId(),
                "📋 Logistics details updated\nTracking ID: " + logistics.getTrackingId(),
                logistics.getDeal().getProduce() != null ? logistics.getDeal().getProduce().getId() : null);

        return logistics;
    }

    /**
     * Update logistics status (for tracking progression).
     */
    @Transactional
    public Logistics updateStatus(Long logisticsId, Long userId, LogisticsStatus newStatus, String location, String description) {
        Logistics logistics = logisticsRepo.findById(logisticsId)
                .orElseThrow(() -> new ResourceNotFoundException("Logistics", "id", logisticsId));

        verifyDealAccess(logistics.getDeal(), userId);

        LogisticsStatus currentStatus = logistics.getStatus();
        validateStatusTransition(currentStatus, newStatus);

        logistics.setStatus(newStatus);

        Deal deal = logistics.getDeal();
        switch (newStatus) {
            case ASSIGNED -> deal.setStatus(DealStatus.LOGISTICS_ASSIGNED);
            case PICKUP_SCHEDULED -> deal.setStatus(DealStatus.PICKUP_SCHEDULED);
            case PICKED_UP -> {
                deal.setStatus(DealStatus.PICKED_UP);
                logistics.setActualPickup(LocalDateTime.now());
            }
            case IN_TRANSIT -> deal.setStatus(DealStatus.IN_TRANSIT);
            case OUT_FOR_DELIVERY -> deal.setStatus(DealStatus.OUT_FOR_DELIVERY);
            case DELIVERED -> {
                deal.setStatus(DealStatus.DELIVERED);
                logistics.setActualDelivery(LocalDateTime.now());
            }
        }
        dealRepo.save(deal);

        logistics = logisticsRepo.save(logistics);
        addEvent(logistics, newStatus, description, location);

        String emoji = getStatusEmoji(newStatus);
        messageService.sendMessage(deal.getFarmer().getId(), deal.getBuyer().getId(),
                emoji + " " + (description != null ? description : "Status updated: " + newStatus) +
                (location != null ? "\n📍 " + location : "") +
                "\n🕐 " + LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM, hh:mm a")),
                deal.getProduce() != null ? deal.getProduce().getId() : null);

        Long otherUserId = userId.equals(deal.getFarmer().getId()) ? deal.getBuyer().getId() : deal.getFarmer().getId();
        User user = users.findById(userId).orElseThrow();
        notificationService.createNotification(otherUserId, Notification.NotificationType.LOGISTICS_UPDATE,
                "Logistics Update", emoji + " " + deal.getDealId() + ": " + newStatus);

        return logistics;
    }

    /**
     * Update location for live tracking.
     */
    @Transactional
    public void updateLocation(Long logisticsId, Double latitude, Double longitude) {
        Logistics logistics = logisticsRepo.findById(logisticsId)
                .orElseThrow(() -> new ResourceNotFoundException("Logistics", "id", logisticsId));

        logistics.setCurrentLatitude(latitude);
        logistics.setCurrentLongitude(longitude);
        logistics.setLastLocationUpdate(LocalDateTime.now());
        logisticsRepo.save(logistics);
    }

    /**
     * Confirm delivery (buyer confirms receipt).
     */
    @Transactional
    public DeliveryConfirmation confirmDelivery(Long dealId, Long userId, Map<String, Object> details) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));

        if (!deal.getBuyer().getId().equals(userId)) {
            throw new BadRequestException("Only the buyer can confirm delivery");
        }

        if (deal.getStatus() != DealStatus.DELIVERED && deal.getStatus() != DealStatus.OUT_FOR_DELIVERY) {
            throw new BadRequestException("Product has not been delivered yet");
        }

        Optional<DeliveryConfirmation> existing = deliveryRepo.findByDealId(dealId);
        if (existing.isPresent() && existing.get().getConfirmed()) {
            throw new BadRequestException("Delivery already confirmed");
        }

        User buyer = users.findById(userId).orElseThrow();

        DeliveryConfirmation confirmation = DeliveryConfirmation.builder()
                .deal(deal)
                .confirmedBy(buyer)
                .confirmed(true)
                .receivedQuantity(details.get("receivedQuantity") != null ? Integer.valueOf(details.get("receivedQuantity").toString()) : null)
                .qualityNotes((String) details.get("qualityNotes"))
                .confirmedAt(LocalDateTime.now())
                .build();

        confirmation = deliveryRepo.save(confirmation);

        // Complete the deal
        deal.setStatus(DealStatus.COMPLETED);
        deal.setCompletedAt(LocalDateTime.now());
        dealRepo.save(deal);

        // Update logistics
        logisticsRepo.findByDealId(dealId).ifPresent(l -> {
            l.setStatus(LogisticsStatus.DELIVERED);
            logisticsRepo.save(l);
        });

        messageService.sendMessage(deal.getFarmer().getId(), deal.getBuyer().getId(),
                "✅ Delivery Confirmed!\nDeal " + deal.getDealId() + " completed.\nThank you for using Mitti2Market!",
                deal.getProduce() != null ? deal.getProduce().getId() : null);

        notificationService.createNotification(deal.getFarmer().getId(), Notification.NotificationType.DELIVERY_CONFIRMED,
                "Deal Completed!", "Deal " + deal.getDealId() + " has been successfully delivered and confirmed!");

        return confirmation;
    }

    /**
     * Get logistics for a deal.
     */
    public Logistics getLogisticsForDeal(Long dealId) {
        return logisticsRepo.findByDealId(dealId)
                .orElse(null);
    }

    /**
     * Get logistics by tracking ID.
     */
    public Logistics getLogisticsByTracking(String trackingId) {
        return logisticsRepo.findByTrackingId(trackingId)
                .orElseThrow(() -> new ResourceNotFoundException("Logistics", "trackingId", trackingId));
    }

    /**
     * Get timeline events for a logistics record.
     */
    public List<LogisticsEvent> getTimeline(Long logisticsId) {
        return eventRepo.findByLogisticsIdOrderByTimestampDesc(logisticsId);
    }

    private void addEvent(Logistics logistics, Logistics.LogisticsStatus status, String description, String location) {
        eventRepo.save(LogisticsEvent.builder()
                .logistics(logistics)
                .status(status)
                .description(description)
                .location(location)
                .build());
    }

    private void verifyDealAccess(Deal deal, Long userId) {
        if (!deal.getFarmer().getId().equals(userId) && !deal.getBuyer().getId().equals(userId)) {
            throw new BadRequestException("You are not part of this deal");
        }
    }

    private void validateStatusTransition(LogisticsStatus from, LogisticsStatus to) {
        boolean valid = switch (from) {
            case REQUESTED -> to == LogisticsStatus.ASSIGNED || to == LogisticsStatus.PICKUP_SCHEDULED;
            case ASSIGNED -> to == LogisticsStatus.PICKUP_SCHEDULED;
            case PICKUP_SCHEDULED -> to == LogisticsStatus.PICKED_UP;
            case PICKED_UP -> to == LogisticsStatus.IN_TRANSIT;
            case IN_TRANSIT -> to == LogisticsStatus.OUT_FOR_DELIVERY;
            case OUT_FOR_DELIVERY -> to == LogisticsStatus.DELIVERED;
            case DELIVERED -> false;
        };
        if (!valid) {
            throw new BadRequestException("Cannot transition from " + from + " to " + to);
        }
    }

    private String getStatusEmoji(LogisticsStatus status) {
        return switch (status) {
            case REQUESTED -> "📋";
            case ASSIGNED -> "👨‍✈️";
            case PICKUP_SCHEDULED -> "📅";
            case PICKED_UP -> "📦";
            case IN_TRANSIT -> "🚚";
            case OUT_FOR_DELIVERY -> "🏪";
            case DELIVERED -> "✅";
        };
    }
}
