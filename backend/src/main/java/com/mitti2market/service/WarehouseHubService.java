package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.WarehouseHub;
import com.mitti2market.repository.WarehouseHubRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class WarehouseHubService {

    private final WarehouseHubRepository hubRepo;
    private final NotificationService notificationService;

    private final AtomicLong hubCounter = new AtomicLong(100);

    @Transactional(readOnly = true)
    public List<WarehouseHub> getAllHubs() {
        return hubRepo.findAll();
    }

    @Transactional(readOnly = true)
    public List<WarehouseHub> getActiveHubs() {
        return hubRepo.findByOperatingStatus(WarehouseHub.HubStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public WarehouseHub getHubById(Long id) {
        return hubRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseHub", "id", id));
    }

    @Transactional(readOnly = true)
    public WarehouseHub getHubByCode(String code) {
        return hubRepo.findByHubCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseHub", "code", code));
    }

    @Transactional
    public WarehouseHub createHub(WarehouseHub hub) {
        if (hub.getHubCode() == null || hub.getHubCode().isBlank()) {
            String prefix = hub.getLocation() != null && hub.getLocation().length() >= 3
                    ? hub.getLocation().substring(0, 3).toUpperCase() : "HUB";
            hub.setHubCode("M2M-HUB-" + prefix + "-" + hubCounter.incrementAndGet());
        }
        if (hub.getTotalCapacityKg() == null || hub.getTotalCapacityKg() <= 0) {
            throw new BadRequestException("Total capacity in kg must be greater than zero");
        }
        if (hub.getOccupiedCapacityKg() == null) hub.setOccupiedCapacityKg(0.0);
        if (hub.getReservedCapacityKg() == null) hub.setReservedCapacityKg(0.0);
        hub.recalculateAvailable();

        return hubRepo.save(hub);
    }

    @Transactional
    public WarehouseHub updateHub(Long id, WarehouseHub update) {
        WarehouseHub existing = getHubById(id);

        if (update.getName() != null) existing.setName(update.getName());
        if (update.getPartnerName() != null) existing.setPartnerName(update.getPartnerName());
        if (update.getContactPerson() != null) existing.setContactPerson(update.getContactPerson());
        if (update.getContactPhone() != null) existing.setContactPhone(update.getContactPhone());
        if (update.getContactEmail() != null) existing.setContactEmail(update.getContactEmail());
        if (update.getLocation() != null) existing.setLocation(update.getLocation());
        if (update.getAddress() != null) existing.setAddress(update.getAddress());
        if (update.getDistrict() != null) existing.setDistrict(update.getDistrict());
        if (update.getState() != null) existing.setState(update.getState());
        if (update.getPincode() != null) existing.setPincode(update.getPincode());
        if (update.getLatitude() != null) existing.setLatitude(update.getLatitude());
        if (update.getLongitude() != null) existing.setLongitude(update.getLongitude());
        if (update.getStorageType() != null) existing.setStorageType(update.getStorageType());
        if (update.getSupportedCrops() != null) existing.setSupportedCrops(update.getSupportedCrops());
        if (update.getHandlingFeePerKg() != null) existing.setHandlingFeePerKg(update.getHandlingFeePerKg());
        if (update.getStorageRatePerDayPerKg() != null) existing.setStorageRatePerDayPerKg(update.getStorageRatePerDayPerKg());

        if (update.getTotalCapacityKg() != null) {
            double currentCommitted = existing.getOccupiedCapacityKg() + existing.getReservedCapacityKg();
            if (update.getTotalCapacityKg() < currentCommitted) {
                throw new BadRequestException("Cannot reduce total capacity below currently committed stock (" + currentCommitted + " kg)");
            }
            existing.setTotalCapacityKg(update.getTotalCapacityKg());
        }

        if (update.getOperatingStatus() != null) {
            if (update.getOperatingStatus() == WarehouseHub.HubStatus.INACTIVE && existing.getOccupiedCapacityKg() > 0) {
                throw new BadRequestException("Cannot deactivate hub with active stored inventory (" + existing.getOccupiedCapacityKg() + " kg)");
            }
            existing.setOperatingStatus(update.getOperatingStatus());
        }

        existing.recalculateAvailable();
        return hubRepo.save(existing);
    }

    /**
     * Concurrency-safe capacity reservation for an incoming or staging shipment.
     */
    @Transactional
    public WarehouseHub reserveCapacity(Long hubId, double quantityKg) {
        if (quantityKg <= 0) throw new BadRequestException("Reservation quantity must be positive");

        WarehouseHub hub = hubRepo.findByIdWithLock(hubId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseHub", "id", hubId));

        if (hub.getOperatingStatus() != WarehouseHub.HubStatus.ACTIVE) {
            throw new BadRequestException("Hub " + hub.getName() + " is currently " + hub.getOperatingStatus());
        }

        hub.recalculateAvailable();
        if (hub.getAvailableCapacityKg() < quantityKg) {
            throw new BadRequestException("Insufficient capacity at " + hub.getName()
                    + ": requested " + (int) quantityKg + " kg, available " + (int) (double) hub.getAvailableCapacityKg() + " kg");
        }

        hub.setReservedCapacityKg(hub.getReservedCapacityKg() + quantityKg);
        hub.recalculateAvailable();
        return hubRepo.save(hub);
    }

    /**
     * Release previously reserved capacity without committing to occupied.
     */
    @Transactional
    public WarehouseHub releaseCapacity(Long hubId, double quantityKg) {
        WarehouseHub hub = hubRepo.findByIdWithLock(hubId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseHub", "id", hubId));

        double newReserved = Math.max(0.0, hub.getReservedCapacityKg() - quantityKg);
        hub.setReservedCapacityKg(newReserved);
        hub.recalculateAvailable();
        return hubRepo.save(hub);
    }

    /**
     * Transition reserved capacity to occupied when physical lot arrives at hub.
     */
    @Transactional
    public WarehouseHub recordInboundOccupied(Long hubId, double actualReceivedKg, double previouslyReservedKg) {
        WarehouseHub hub = hubRepo.findByIdWithLock(hubId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseHub", "id", hubId));

        double newReserved = Math.max(0.0, hub.getReservedCapacityKg() - previouslyReservedKg);
        hub.setReservedCapacityKg(newReserved);
        hub.setOccupiedCapacityKg(hub.getOccupiedCapacityKg() + actualReceivedKg);
        hub.recalculateAvailable();

        if (hub.getAvailableCapacityKg() < hub.getTotalCapacityKg() * 0.10) {
            // Low capacity alert
            hub.setOperatingStatus(hub.getAvailableCapacityKg() <= 0 ? WarehouseHub.HubStatus.FULL : WarehouseHub.HubStatus.ACTIVE);
        }

        return hubRepo.save(hub);
    }

    /**
     * Deduct occupied stock when lot is dispatched out from hub.
     */
    @Transactional
    public WarehouseHub recordOutboundDispatched(Long hubId, double dispatchedKg) {
        WarehouseHub hub = hubRepo.findByIdWithLock(hubId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseHub", "id", hubId));

        hub.setOccupiedCapacityKg(Math.max(0.0, hub.getOccupiedCapacityKg() - dispatchedKg));
        hub.recalculateAvailable();
        if (hub.getOperatingStatus() == WarehouseHub.HubStatus.FULL && hub.getAvailableCapacityKg() > 0) {
            hub.setOperatingStatus(WarehouseHub.HubStatus.ACTIVE);
        }

        return hubRepo.save(hub);
    }

    /**
     * Finds suitable hubs near a coordinate, filtered by crop compatibility & available capacity.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> findSuitableHubs(double lat, double lng, String crop, double quantityKg) {
        List<WarehouseHub> allActive = hubRepo.findByOperatingStatus(WarehouseHub.HubStatus.ACTIVE);
        List<Map<String, Object>> candidateList = new ArrayList<>();

        for (WarehouseHub hub : allActive) {
            hub.recalculateAvailable();
            boolean cropSupported = hub.supportsCrop(crop);
            boolean capacityFits = hub.getAvailableCapacityKg() >= quantityKg;

            double distanceKm = RouteService.haversineKm(lat, lng, hub.getLatitude(), hub.getLongitude());

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", hub.getId());
            entry.put("hubCode", hub.getHubCode());
            entry.put("name", hub.getName());
            entry.put("partnerName", hub.getPartnerName());
            entry.put("location", hub.getLocation());
            entry.put("address", hub.getAddress());
            entry.put("latitude", hub.getLatitude());
            entry.put("longitude", hub.getLongitude());
            entry.put("distanceKm", Math.round(distanceKm * 10.0) / 10.0);
            entry.put("storageType", hub.getStorageType().name());
            entry.put("totalCapacityKg", hub.getTotalCapacityKg());
            entry.put("availableCapacityKg", hub.getAvailableCapacityKg());
            entry.put("occupiedCapacityKg", hub.getOccupiedCapacityKg());
            entry.put("reservedCapacityKg", hub.getReservedCapacityKg());
            entry.put("cropSupported", cropSupported);
            entry.put("capacityFits", capacityFits);
            entry.put("eligible", cropSupported && capacityFits);
            entry.put("handlingFeeEstimate", Math.round(quantityKg * (hub.getHandlingFeePerKg() != null ? hub.getHandlingFeePerKg() : 0.50)));

            candidateList.add(entry);
        }

        // Sort: eligible first, then by shortest distance
        candidateList.sort((a, b) -> {
            boolean aEligible = (boolean) a.get("eligible");
            boolean bEligible = (boolean) b.get("eligible");
            if (aEligible != bEligible) return aEligible ? -1 : 1;
            return Double.compare((Double) a.get("distanceKm"), (Double) b.get("distanceKm"));
        });

        return candidateList;
    }
}
