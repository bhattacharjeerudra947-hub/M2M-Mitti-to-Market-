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
    private final GoogleMapsService googleMapsService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final VehicleService vehicleService;
    private final com.mitti2market.repository.TransportVehicleRepository vehicleRepo;

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

        int qty = logistics.getDeal().getQuantity() != null ? logistics.getDeal().getQuantity() : 0;

        // If Google Maps is configured, fetch alternatives and score them
        if (googleMapsService.isConfigured()) {
            try {
                com.mitti2market.dto.LatLng orig = com.mitti2market.dto.LatLng.of(fromLat, fromLng);
                com.mitti2market.dto.LatLng dest = com.mitti2market.dto.LatLng.of(toLat, toLng);
                List<com.mitti2market.dto.RouteCandidate> candidates = googleMapsService.getRoutes(orig, dest);
                if (candidates != null && !candidates.isEmpty()) {
                    String origSrc = logistics.getPickupLocationSource() != null ? logistics.getPickupLocationSource().name() : "REGISTERED";
                    String destSrc = logistics.getDeliveryLocationSource() != null ? logistics.getDeliveryLocationSource().name() : "REGISTERED";
                    com.mitti2market.dto.OptimalRouteResult opt = routeOptimizer.scoreAndSelect(
                            candidates, orig, dest, origSrc, destSrc, (double) qty);

                    com.mitti2market.dto.RouteCandidate best = opt.getSelectedRoute();
                    logistics.setRouteDistanceKm(best.getDistanceKm());
                    logistics.setRouteDurationMinutes(best.getDurationMinutes());
                    logistics.setRouteEstimatedCost(opt.getEstimatedCostRupees());
                    logistics.setRouteProvider("google_maps");
                    logistics.setRouteSummary(best.getSummary() != null ? best.getSummary() : (best.getDistanceKm() + " km"));
                    logistics.setRouteCaveat("Google Maps live road route");
                    logistics.setRoutePolylineEncoded(best.getPolylineEncoded());
                    logistics.setRouteSelectionReason(opt.getWhySelected());
                    logistics.setRouteSelectionType(opt.getSelectionType());
                    try {
                        logistics.setAlternativeRoutesJson(objectMapper.writeValueAsString(candidates));
                    } catch (Exception ex) {
                        // Ignore JSON serialization issue
                    }
                    logistics.setRouteComputedAt(LocalDateTime.now());
                    return;
                }
            } catch (Exception e) {
                // Fall through to fallback routeService
            }
        }

        RouteEstimate est = routeService.estimateRoute(fromLat, fromLng, toLat, toLng);
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
     * Calculate route alternatives between two locations with explainable scoring.
     */
    public com.mitti2market.dto.OptimalRouteResult calculateRoute(com.mitti2market.dto.RouteRequest req) {
        if (req.getOrigin() == null || req.getDestination() == null) {
            throw new BadRequestException("Origin and Destination coordinates are required");
        }

        double fromLat = req.getOrigin().getLatitude();
        double fromLng = req.getOrigin().getLongitude();
        double toLat = req.getDestination().getLatitude();
        double toLng = req.getDestination().getLongitude();

        Double cargoKg = req.getQuantityKg();
        if (cargoKg == null && req.getDealId() != null) {
            dealRepo.findById(req.getDealId()).ifPresent(d -> {
                // Cargo quantity from deal
            });
            Deal d = dealRepo.findById(req.getDealId()).orElse(null);
            if (d != null && d.getQuantity() != null) {
                cargoKg = d.getQuantity().doubleValue();
            }
        }
        if (cargoKg == null) cargoKg = 0.0;

        if (googleMapsService.isConfigured()) {
            try {
                List<com.mitti2market.dto.RouteCandidate> candidates = googleMapsService.getRoutes(req.getOrigin(), req.getDestination());
                if (candidates != null && !candidates.isEmpty()) {
                    return routeOptimizer.scoreAndSelect(
                            candidates,
                            req.getOrigin(),
                            req.getDestination(),
                            req.getOriginSource(),
                            req.getDestinationSource(),
                            cargoKg
                    );
                }
            } catch (Exception e) {
                // Fall back to offline route estimation
            }
        }

        // Fallback using RouteService
        RouteEstimate est = routeService.estimateRoute(fromLat, fromLng, toLat, toLng);
        Map<String, Object> cost = costService.estimateCost(est, cargoKg);

        com.mitti2market.dto.RouteCandidate singleCandidate = com.mitti2market.dto.RouteCandidate.builder()
                .routeIndex(0)
                .distanceKm(est.getDistanceKm())
                .durationMinutes(est.getDurationMinutes())
                .summary(est.getSummary())
                .recommended(true)
                .score(1.0)
                .warnings(List.of())
                .build();

        return com.mitti2market.dto.OptimalRouteResult.builder()
                .selectedRoute(singleCandidate)
                .allRoutes(List.of(singleCandidate))
                .origin(req.getOrigin())
                .destination(req.getDestination())
                .whySelected("Direct route estimation based on configured road network assumptions.")
                .selectionType("SHORTEST")
                .originSource(req.getOriginSource())
                .destinationSource(req.getDestinationSource())
                .provider(est.getProvider())
                .estimatedCostRupees((Double) cost.get("total"))
                .costPerKg((Double) cost.get("costPerKg"))
                .quantityKg(cargoKg)
                .build();
    }

    /**
     * Save chosen logistics locations for a deal and recompute optimal route.
     * Both Farmer and Buyer see the updated identical route information.
     */
    @Transactional
    public Map<String, Object> setDealLocations(Long dealId, Long userId, com.mitti2market.dto.RouteRequest req) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));
        verifyDealAccess(deal, userId);

        Logistics.LocationSource origSrc = "LIVE".equalsIgnoreCase(req.getOriginSource())
                ? Logistics.LocationSource.LIVE : Logistics.LocationSource.REGISTERED;
        Logistics.LocationSource destSrc = "LIVE".equalsIgnoreCase(req.getDestinationSource())
                ? Logistics.LocationSource.LIVE : Logistics.LocationSource.REGISTERED;

        // Update deal location coordinates & addresses
        if (req.getOrigin() != null) {
            deal.setPickupLatitude(req.getOrigin().getLatitude());
            deal.setPickupLongitude(req.getOrigin().getLongitude());
        }
        if (req.getOriginAddress() != null && !req.getOriginAddress().isBlank()) {
            deal.setPickupLocation(req.getOriginAddress());
        }
        if (req.getDestination() != null) {
            deal.setDeliveryLatitude(req.getDestination().getLatitude());
            deal.setDeliveryLongitude(req.getDestination().getLongitude());
        }
        if (req.getDestinationAddress() != null && !req.getDestinationAddress().isBlank()) {
            deal.setDeliveryLocation(req.getDestinationAddress());
        }
        dealRepo.save(deal);

        // Find or build logistics record
        Optional<Logistics> optLogistics = logisticsRepo.findByDealId(dealId);
        Logistics logistics;
        if (optLogistics.isPresent()) {
            logistics = optLogistics.get();
        } else {
            String trackingId = "M2M-TRK-" + (trkCounter.incrementAndGet());
            logistics = Logistics.builder()
                    .trackingId(trackingId)
                    .deal(deal)
                    .type(LogisticsType.MITTI2MARKET)
                    .pickupLocation(deal.getPickupLocation())
                    .deliveryLocation(deal.getDeliveryLocation())
                    .status(LogisticsStatus.REQUESTED)
                    .build();
        }

        if (req.getOrigin() != null) {
            logistics.setPickupLatitude(req.getOrigin().getLatitude());
            logistics.setPickupLongitude(req.getOrigin().getLongitude());
        }
        if (req.getOriginAddress() != null && !req.getOriginAddress().isBlank()) {
            logistics.setPickupLocation(req.getOriginAddress());
        }
        if (req.getDestination() != null) {
            logistics.setDeliveryLatitude(req.getDestination().getLatitude());
            logistics.setDeliveryLongitude(req.getDestination().getLongitude());
        }
        if (req.getDestinationAddress() != null && !req.getDestinationAddress().isBlank()) {
            logistics.setDeliveryLocation(req.getDestinationAddress());
        }
        logistics.setPickupLocationSource(origSrc);
        logistics.setDeliveryLocationSource(destSrc);

        computeAndStoreRoute(logistics);
        logistics = logisticsRepo.save(logistics);

        addEvent(logistics, logistics.getStatus(),
                "Logistics locations updated: " + origSrc + " pickup → " + destSrc + " delivery",
                null);

        return getSharedRouteInfo(dealId, userId);
    }

    /**
     * Get shared route information for a deal.
     * Guarantees both Farmer and Buyer see identical route details, polyline, and cost.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getSharedRouteInfo(Long dealId, Long userId) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));
        verifyDealAccess(deal, userId);

        Optional<Logistics> optLogistics = logisticsRepo.findByDealId(dealId);
        Double fromLat = null;
        Double fromLng = null;
        Double toLat = null;
        Double toLng = null;
        String origSrc = "REGISTERED";
        String destSrc = "REGISTERED";

        if (optLogistics.isPresent()) {
            Logistics l = optLogistics.get();
            fromLat = l.getPickupLatitude();
            fromLng = l.getPickupLongitude();
            toLat = l.getDeliveryLatitude();
            toLng = l.getDeliveryLongitude();
            if (l.getPickupLocationSource() != null) origSrc = l.getPickupLocationSource().name();
            if (l.getDeliveryLocationSource() != null) destSrc = l.getDeliveryLocationSource().name();

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("dealId", deal.getId());
            result.put("dealNumber", deal.getDealId());
            result.put("logisticsId", l.getId());
            result.put("trackingId", l.getTrackingId());
            result.put("pickupLocation", l.getPickupLocation() != null ? l.getPickupLocation() : deal.getPickupLocation());
            result.put("deliveryLocation", l.getDeliveryLocation() != null ? l.getDeliveryLocation() : deal.getDeliveryLocation());
            result.put("pickupLatitude", fromLat);
            result.put("pickupLongitude", fromLng);
            result.put("deliveryLatitude", toLat);
            result.put("deliveryLongitude", toLng);
            result.put("pickupLocationSource", origSrc);
            result.put("deliveryLocationSource", destSrc);
            result.put("distanceKm", l.getRouteDistanceKm());
            result.put("durationMinutes", l.getRouteDurationMinutes());
            result.put("estimatedCost", l.getRouteEstimatedCost());
            result.put("provider", l.getRouteProvider() != null ? l.getRouteProvider() : "google_maps");
            result.put("summary", l.getRouteSummary());
            result.put("polylineEncoded", l.getRoutePolylineEncoded());
            result.put("selectionReason", l.getRouteSelectionReason());
            result.put("selectionType", l.getRouteSelectionType());
            result.put("computedAt", l.getRouteComputedAt());

            // Farmer & Buyer registered profiles for UI display
            result.put("farmerRegistered", Map.of(
                    "name", deal.getFarmer().getName(),
                    "location", deal.getFarmer().getLocation() != null ? deal.getFarmer().getLocation() : "",
                    "latitude", deal.getFarmer().getLatitude() != null ? deal.getFarmer().getLatitude() : 0.0,
                    "longitude", deal.getFarmer().getLongitude() != null ? deal.getFarmer().getLongitude() : 0.0
            ));
            result.put("buyerRegistered", Map.of(
                    "name", deal.getBuyer().getName(),
                    "location", deal.getBuyer().getLocation() != null ? deal.getBuyer().getLocation() : "",
                    "latitude", deal.getBuyer().getLatitude() != null ? deal.getBuyer().getLatitude() : 0.0,
                    "longitude", deal.getBuyer().getLongitude() != null ? deal.getBuyer().getLongitude() : 0.0
            ));

            if (l.getAlternativeRoutesJson() != null) {
                try {
                    result.put("alternativeRoutes", objectMapper.readValue(l.getAlternativeRoutesJson(), List.class));
                } catch (Exception ignored) {}
            }
            return result;
        }

        // If no logistics record yet, fall back to deal / user profiles
        fromLat = deal.getPickupLatitude() != null ? deal.getPickupLatitude() : deal.getFarmer().getLatitude();
        fromLng = deal.getPickupLongitude() != null ? deal.getPickupLongitude() : deal.getFarmer().getLongitude();
        toLat = deal.getDeliveryLatitude() != null ? deal.getDeliveryLatitude() : deal.getBuyer().getLatitude();
        toLng = deal.getDeliveryLongitude() != null ? deal.getDeliveryLongitude() : deal.getBuyer().getLongitude();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dealId", deal.getId());
        result.put("dealNumber", deal.getDealId());
        result.put("pickupLocation", deal.getPickupLocation());
        result.put("deliveryLocation", deal.getDeliveryLocation());
        result.put("pickupLatitude", fromLat);
        result.put("pickupLongitude", fromLng);
        result.put("deliveryLatitude", toLat);
        result.put("deliveryLongitude", toLng);
        result.put("pickupLocationSource", "REGISTERED");
        result.put("deliveryLocationSource", "REGISTERED");
        result.put("farmerRegistered", Map.of(
                "name", deal.getFarmer().getName(),
                "location", deal.getFarmer().getLocation() != null ? deal.getFarmer().getLocation() : "",
                "latitude", deal.getFarmer().getLatitude() != null ? deal.getFarmer().getLatitude() : 0.0,
                "longitude", deal.getFarmer().getLongitude() != null ? deal.getFarmer().getLongitude() : 0.0
        ));
        result.put("buyerRegistered", Map.of(
                "name", deal.getBuyer().getName(),
                "location", deal.getBuyer().getLocation() != null ? deal.getBuyer().getLocation() : "",
                "latitude", deal.getBuyer().getLatitude() != null ? deal.getBuyer().getLatitude() : 0.0,
                "longitude", deal.getBuyer().getLongitude() != null ? deal.getBuyer().getLongitude() : 0.0
        ));
        return result;
    }

    /**
     * Multi-stop route optimization — delegates to the nearest-neighbor
     * heuristic engine (capacity-aware).
     */
    public Map<String, Object> optimizeRoute(double[] origin, List<Map<String, Object>> stops, Double capacityKg) {
        return routeOptimizer.optimize(List.of(origin), stops, capacityKg);
    }

    /**
     * All logistics records where the user is the farmer or buyer —
     * uses an efficient JPA query instead of loading all records.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyLogistics(Long userId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Logistics l : logisticsRepo.findByUserId(userId)) {
            Deal d = l.getDeal();
            if (d == null || d.getFarmer() == null || d.getBuyer() == null) continue;

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
            m.put("assignedVehicleNumber", l.getAssignedVehicleNumber() != null ? l.getAssignedVehicleNumber() : "");
            m.put("assignedVehicleLabel", l.getAssignedVehicleLabel() != null ? l.getAssignedVehicleLabel() : "");
            m.put("createdAt", l.getCreatedAt());
            out.add(m);
        }
        return out;
    }

    /**
     * Get available platform vehicles for a deal — eligible (capacity ok) and ineligible (too small).
     * Includes estimated cost based on the deal's computed route distance.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getAvailableVehicles(Long dealId, Long userId) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));
        verifyDealAccess(deal, userId);

        double cargoKg = deal.getQuantity() != null ? deal.getQuantity().doubleValue() : 0.0;

        // Get route distance from logistics record or compute haversine fallback
        double distanceKm = 0.0;
        java.util.Optional<Logistics> optL = logisticsRepo.findByDealId(dealId);
        if (optL.isPresent() && optL.get().getRouteDistanceKm() != null) {
            distanceKm = optL.get().getRouteDistanceKm();
        } else {
            // Fallback: haversine from farmer to buyer
            Double fromLat = deal.getPickupLatitude() != null ? deal.getPickupLatitude() : deal.getFarmer().getLatitude();
            Double fromLng = deal.getPickupLongitude() != null ? deal.getPickupLongitude() : deal.getFarmer().getLongitude();
            Double toLat   = deal.getDeliveryLatitude() != null ? deal.getDeliveryLatitude() : deal.getBuyer().getLatitude();
            Double toLng   = deal.getDeliveryLongitude() != null ? deal.getDeliveryLongitude() : deal.getBuyer().getLongitude();
            if (fromLat != null && toLat != null) {
                distanceKm = RouteService.haversineKm(fromLat, fromLng, toLat, toLng);
            }
        }

        Map<String, Object> result = vehicleService.getVehiclesForDeal(cargoKg, distanceKm);
        result.put("dealId", dealId);
        result.put("dealNumber", deal.getDealId());
        result.put("cropName", deal.getCropName());
        return result;
    }

    /**
     * Assign a Mitti2Market platform vehicle to a deal logistics record.
     * Atomically marks the vehicle ASSIGNED to prevent double-assignment.
     */
    @Transactional
    public Map<String, Object> assignVehicle(Long dealId, Long vehicleId, Long userId) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("Deal", "id", dealId));
        verifyDealAccess(deal, userId);

        if (deal.getStatus() == Deal.DealStatus.COMPLETED || deal.getStatus() == Deal.DealStatus.CANCELLED) {
            throw new BadRequestException("Cannot assign vehicle to a completed or cancelled deal");
        }

        com.mitti2market.model.TransportVehicle vehicle = vehicleRepo.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", "id", vehicleId));

        if (vehicle.getAvailabilityStatus() != com.mitti2market.model.TransportVehicle.AvailabilityStatus.AVAILABLE) {
            throw new BadRequestException("Vehicle " + vehicle.getVehicleNumber() + " is not currently available");
        }

        double cargoKg = deal.getQuantity() != null ? deal.getQuantity().doubleValue() : 0.0;
        if (vehicle.getCapacityKg() < cargoKg) {
            throw new BadRequestException(
                    "Vehicle capacity (" + vehicle.getCapacityKg().intValue() + " kg) is insufficient for cargo ("
                    + (int) cargoKg + " kg)");
        }

        // Get or create logistics record
        Logistics logistics = logisticsRepo.findByDealId(dealId).orElseGet(() -> {
            String trkId = "M2M-TRK-" + (trkCounter.incrementAndGet());
            Logistics l = Logistics.builder()
                    .trackingId(trkId)
                    .deal(deal)
                    .type(LogisticsType.MITTI2MARKET)
                    .pickupLocation(deal.getPickupLocation())
                    .deliveryLocation(deal.getDeliveryLocation())
                    .pickupLatitude(deal.getPickupLatitude() != null ? deal.getPickupLatitude() : deal.getFarmer().getLatitude())
                    .pickupLongitude(deal.getPickupLongitude() != null ? deal.getPickupLongitude() : deal.getFarmer().getLongitude())
                    .deliveryLatitude(deal.getDeliveryLatitude() != null ? deal.getDeliveryLatitude() : deal.getBuyer().getLatitude())
                    .deliveryLongitude(deal.getDeliveryLongitude() != null ? deal.getDeliveryLongitude() : deal.getBuyer().getLongitude())
                    .status(LogisticsStatus.REQUESTED)
                    .build();
            computeAndStoreRoute(l);
            return logisticsRepo.save(l);
        });

        // Atomically mark vehicle ASSIGNED
        vehicleService.markAssigned(vehicleId);

        // Update logistics with vehicle info
        logistics.setAssignedVehicleId(vehicleId);
        logistics.setAssignedVehicleNumber(vehicle.getVehicleNumber());
        logistics.setAssignedVehicleLabel(vehicle.getVehicleLabel() != null
                ? vehicle.getVehicleLabel()
                : vehicle.getVehicleType().label() + " – " + vehicle.getVehicleNumber());
        logistics.setVehicleNumber(vehicle.getVehicleNumber());
        logistics.setVehicleType(vehicle.getVehicleType().label());
        logistics.setStatus(LogisticsStatus.ASSIGNED);
        logistics = logisticsRepo.save(logistics);

        // Transition deal status
        String actorRole = userId.equals(deal.getFarmer().getId()) ? "FARMER" : "BUYER";
        stateMachine.transition(deal.getId(), Deal.DealStatus.LOGISTICS_ASSIGNED, userId, actorRole,
                "Platform vehicle assigned: " + vehicle.getVehicleNumber(), null);

        addEvent(logistics, LogisticsStatus.ASSIGNED,
                "Platform vehicle assigned: " + vehicle.getVehicleLabel() + " (" + vehicle.getVehicleNumber() + ")",
                null);

        // Notify the other party
        Long otherUserId = userId.equals(deal.getFarmer().getId()) ? deal.getBuyer().getId() : deal.getFarmer().getId();
        notificationService.createNotification(otherUserId, Notification.NotificationType.LOGISTICS_UPDATE,
                "Vehicle Assigned",
                "Mitti2Market vehicle " + vehicle.getVehicleNumber() + " has been assigned for deal " + deal.getDealId());

        // Return vehicle + route summary
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("logisticsId", logistics.getId());
        result.put("trackingId", logistics.getTrackingId());
        result.put("assignedVehicleId", vehicleId);
        result.put("assignedVehicleNumber", vehicle.getVehicleNumber());
        result.put("assignedVehicleLabel", logistics.getAssignedVehicleLabel());
        result.put("vehicleType", vehicle.getVehicleType().label());
        result.put("capacityKg", vehicle.getCapacityKg());
        result.put("status", logistics.getStatus().name());
        result.put("routeDistanceKm", logistics.getRouteDistanceKm());
        result.put("estimatedCostRupees", logistics.getRouteDistanceKm() != null
                ? vehicle.estimateCost(logistics.getRouteDistanceKm()) : null);
        return result;
    }

    /**
     * Admin: all logistics records in reverse chronological order.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllLogisticsForAdmin() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Logistics l : logisticsRepo.findAllByOrderByCreatedAtDesc()) {
            Deal d = l.getDeal();
            if (d == null) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", l.getId());
            m.put("trackingId", l.getTrackingId());
            m.put("type", l.getType() != null ? l.getType().name() : "OWN");
            m.put("status", l.getStatus() != null ? l.getStatus().name() : "REQUESTED");
            m.put("dealId", d.getId());
            m.put("dealNumber", d.getDealId());
            m.put("farmerName", d.getFarmer() != null ? d.getFarmer().getName() : "");
            m.put("buyerName", d.getBuyer() != null ? d.getBuyer().getName() : "");
            m.put("cropName", d.getCropName());
            m.put("quantityKg", d.getQuantity());
            m.put("pickupLocation", l.getPickupLocation());
            m.put("deliveryLocation", l.getDeliveryLocation());
            m.put("routeDistanceKm", l.getRouteDistanceKm());
            m.put("routeEstimatedCost", l.getRouteEstimatedCost());
            m.put("vehicleNumber", l.getVehicleNumber());
            m.put("assignedVehicleNumber", l.getAssignedVehicleNumber());
            m.put("assignedVehicleLabel", l.getAssignedVehicleLabel());
            m.put("scheduledPickup", l.getScheduledPickup());
            m.put("expectedDelivery", l.getExpectedDelivery());
            m.put("actualDelivery", l.getActualDelivery());
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
