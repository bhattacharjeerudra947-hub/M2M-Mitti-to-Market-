package com.mitti2market.service;

import com.mitti2market.dto.RouteEstimate;
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
    private final DealStateMachineService stateMachine;
    private final RouteService routeService;
    private final LogisticsCostService costService;
    private final DealCompletionService dealCompletionService;
    private final RouteOptimizationService routeOptimizer;

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
                .pickupLatitude(deal.getPickupLatitude())
                .pickupLongitude(deal.getPickupLongitude())
                .deliveryLatitude(deal.getDeliveryLatitude())
                .deliveryLongitude(deal.getDeliveryLongitude())
                .status(LogisticsStatus.REQUESTED)
                .build();

        // Compute the route + cost estimate once at selection time so the
        // workspace can show distance / ETA / cost without extra lookups.
        computeAndStoreRoute(logistics);

        logistics = logisticsRepo.save(logistics);

        deal = stateMachine.transition(deal.getId(), DealStatus.LOGISTICS_PENDING, userId,
                userId.equals(deal.getFarmer().getId()) ? "FARMER" : "BUYER",
                "Logistics selected: " + (type == LogisticsType.OWN ? "Own Logistics" : "Mitti2Market Logistics"), null);

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
        if (details.containsKey("vehicleNumber")) logistics.setVehicleNumber((String) details.get("vehicleNumber"));
        if (details.containsKey("vehicleType")) logistics.setVehicleType((String) details.get("vehicleType"));
        if (details.containsKey("contactPerson")) logistics.setContactPerson((String) details.get("contactPerson"));
        if (details.containsKey("contactPhone")) logistics.setContactPhone((String) details.get("contactPhone"));
        if (details.containsKey("specialHandling")) logistics.setSpecialHandling((String) details.get("specialHandling"));
        if (details.containsKey("packagingRequirements")) logistics.setPackagingRequirements((String) details.get("packagingRequirements"));
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
        DealStatus dealTarget = switch (newStatus) {
            case ASSIGNED -> DealStatus.LOGISTICS_ASSIGNED;
            case PICKUP_SCHEDULED -> DealStatus.PICKUP_SCHEDULED;
            case PICKED_UP -> {
                logistics.setActualPickup(LocalDateTime.now());
                yield DealStatus.PICKED_UP;
            }
            case IN_TRANSIT -> DealStatus.IN_TRANSIT;
            case OUT_FOR_DELIVERY -> DealStatus.OUT_FOR_DELIVERY;
            case DELIVERED -> {
                logistics.setActualDelivery(LocalDateTime.now());
                yield DealStatus.DELIVERED;
            }
            default -> null;
        };
        if (dealTarget != null) {
            String actorRole = userId.equals(deal.getFarmer().getId()) ? "FARMER" : "BUYER";
            deal = stateMachine.transition(deal.getId(), dealTarget, userId, actorRole,
                    description != null ? description : "Logistics status: " + newStatus,
                    location != null ? "location=" + location : null);
        }

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

    // ──────── Driver Tracking Session ────────

    /**
     * Current route summary: pickup → delivery distance / duration / cost.
     * Falls back to the stored selection-time estimate when coordinates are
     * missing; otherwise computes a fresh estimate from the route engine.
     */
    public Map<String, Object> getRouteSummary(Long logisticsId, Long userId) {
        Logistics logistics = findAndVerify(logisticsId, userId);

        Double fromLat = logistics.getPickupLatitude();
        Double fromLng = logistics.getPickupLongitude();
        Double toLat = logistics.getDeliveryLatitude();
        Double toLng = logistics.getDeliveryLongitude();

        if (toLat == null || toLng == null) {
            // No coordinates — fall back to the stored summary from selection time
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("distanceKm", logistics.getRouteDistanceKm());
            m.put("durationMinutes", logistics.getRouteDurationMinutes());
            m.put("summary", logistics.getRouteSummary());
            m.put("caveat", logistics.getRouteCaveat());
            m.put("provider", logistics.getRouteProvider());
            m.put("estimatedCost", logistics.getRouteEstimatedCost());
            m.put("eta", null);
            return m;
        }

        if (fromLat == null || fromLng == null) {
            // No explicit pickup coordinates — fall back to the farmer's location
            fromLat = logistics.getDeal().getFarmer().getLatitude();
            fromLng = logistics.getDeal().getFarmer().getLongitude();
        }

        RouteEstimate est = routeService.estimateRoute(fromLat, fromLng, toLat, toLng);

        // Cost estimate for the remaining leg (cargo already loaded)
        int qty = logistics.getDeal().getQuantity() != null ? logistics.getDeal().getQuantity() : 0;
        Map<String, Object> cost = costService.estimateCost(est, qty);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("distanceKm", est.getDistanceKm());
        m.put("durationMinutes", est.getDurationMinutes());
        m.put("summary", est.getSummary());
        m.put("eta", est.getEta());
        m.put("provider", est.getProvider());
        m.put("caveat", est.getCaveat());
        m.put("estimatedCost", cost.get("total"));
        m.put("costPerKg", cost.get("costPerKg"));
        m.put("fromLat", fromLat);
        m.put("fromLng", fromLng);
        m.put("toLat", toLat);
        m.put("toLng", toLng);

        // Alternative route — a direct-route assumption (straight-line × 1.15)
        // so the user can see whether a flatter routing would be cheaper.
        double altKm = RouteService.haversineKm(fromLat, fromLng, toLat, toLng) * 1.15;
        double altCost = (altKm / 12.0) * 100.0
                + Math.max(300, 1200.0 * Math.min(1.0, (altKm / 40.0) / 8.0))
                + altKm * 1.5 + qty * 0.25;
        double savings = Math.max(0.0, ((Double) cost.get("total")) - altCost);

        Map<String, Object> alt = new LinkedHashMap<>();
        alt.put("distanceKm", round2(altKm));
        alt.put("durationMinutes", round1(altKm / 40.0 * 60.0));
        alt.put("estimatedCost", round2(altCost));
        alt.put("savings", round2(savings));
        alt.put("label", "Alternative route estimate (direct-route assumption)");
        m.put("alternative", alt);
        return m;
    }

    /** Recompute + persist the pickup → delivery route and cost estimate. */
    private void computeAndStoreRoute(Logistics logistics) {
        Double fromLat = logistics.getPickupLatitude();
        Double fromLng = logistics.getPickupLongitude();
        Double toLat = logistics.getDeliveryLatitude();
        Double toLng = logistics.getDeliveryLongitude();

        if (fromLat == null) fromLat = logistics.getDeal().getFarmer().getLatitude();
        if (fromLng == null) fromLng = logistics.getDeal().getFarmer().getLongitude();
        if (toLat == null) toLat = logistics.getDeal().getBuyer().getLatitude();
        if (toLng == null) toLng = logistics.getDeal().getBuyer().getLongitude();

        if (fromLat == null || toLat == null) return; // no coordinates yet — route later

        RouteEstimate est = routeService.estimateRoute(fromLat, fromLng, toLat, toLng);
        int qty = logistics.getDeal().getQuantity() != null ? logistics.getDeal().getQuantity() : 0;
        Map<String, Object> cost = costService.estimateCost(est, qty);

        logistics.setRouteDistanceKm(est.getDistanceKm());
        logistics.setRouteDurationMinutes(est.getDurationMinutes());
        logistics.setRouteEstimatedCost((Double) cost.get("total"));
        logistics.setRouteProvider(est.getProvider());
        logistics.setRouteSummary(est.getSummary());
        logistics.setRouteCaveat(est.getCaveat());
        logistics.setRouteComputedAt(LocalDateTime.now());
    }

    /**
     * Multi-stop route optimization — delegates to the nearest-neighbor
     * heuristic engine (capacity-aware).
     */
    public Map<String, Object> optimizeRoute(double[] origin, List<Map<String, Object>> stops, Double capacityKg) {
        return routeOptimizer.optimize(List.of(origin), stops, capacityKg);
    }

    /**
     * All logistics records where the user is the farmer or buyer of the
     * underlying deal — powers the Farmer/Business logistics pages.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyLogistics(Long userId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Logistics l : logisticsRepo.findAll()) {
            Deal d = l.getDeal();
            if (d == null || d.getFarmer() == null || d.getBuyer() == null) continue;
            if (!d.getFarmer().getId().equals(userId) && !d.getBuyer().getId().equals(userId)) continue;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", l.getId());
            m.put("trackingId", l.getTrackingId());
            m.put("type", l.getType() != null ? l.getType().name() : "OWN");
            m.put("status", l.getStatus() != null ? l.getStatus().name() : "REQUESTED");
            m.put("dealId", d.getId());
            m.put("dealNumber", d.getDealId());
            m.put("produceName", d.getProduce() != null ? d.getProduce().getName() : "");
            m.put("quantityKg", d.getQuantity());
            m.put("pickupLocation", l.getPickupLocation() != null ? l.getPickupLocation() : "");
            m.put("deliveryLocation", l.getDeliveryLocation() != null ? l.getDeliveryLocation() : "");
            m.put("scheduledPickup", l.getScheduledPickup());
            m.put("expectedDelivery", l.getExpectedDelivery());
            m.put("actualDelivery", l.getActualDelivery());
            m.put("routeDistanceKm", l.getRouteDistanceKm());
            m.put("routeEstimatedCost", l.getRouteEstimatedCost());
            m.put("vehicleNumber", l.getVehicleNumber() != null ? l.getVehicleNumber() : "");
            m.put("transporterName", l.getTransporterName() != null ? l.getTransporterName() : "");
            m.put("createdAt", l.getCreatedAt());
            out.add(m);
        }
        return out;
    }

    /**
     * Fetch + verify a logistics record — the user must be a deal party.
     */
private Logistics findAndVerify(Long logisticsId, Long userId) {
        Logistics logistics = logisticsRepo.findById(logisticsId)
                .orElseThrow(() -> new ResourceNotFoundException("Logistics", "id", logisticsId));
        boolean isParty = logistics.getDeal().getFarmer().getId().equals(userId)
                || logistics.getDeal().getBuyer().getId().equals(userId);
        if (!isParty) {
            throw new BadRequestException("You are not part of this deal");
        }
        return logistics;
    }

    private Double num(Object v) {
        if (v == null) return null;
        try { return Double.valueOf(v.toString()); } catch (Exception e) { return null; }
    }

    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }
    private double round1(double v) { return Math.round(v * 10.0) / 10.0; }

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

        // Complete the deal via the state machine — the completion service
        // finalizes produce + requirement lifecycle in the same transaction.
        deal = stateMachine.transition(dealId, DealStatus.COMPLETED, userId, "BUYER",
                "Buyer confirmed delivery — deal completed", null);
        dealCompletionService.completeDeal(dealId);

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

    private void addEvent(Logistics logistics, Logistics.LogisticsStatus status, String description,
                          Double latitude, Double longitude) {
        eventRepo.save(LogisticsEvent.builder()
                .logistics(logistics)
                .status(status)
                .description(description)
                .latitude(latitude)
                .longitude(longitude)
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
