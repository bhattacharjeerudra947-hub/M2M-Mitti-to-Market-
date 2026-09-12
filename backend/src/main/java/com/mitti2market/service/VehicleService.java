package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.TransportVehicle;
import com.mitti2market.model.TransportVehicle.AvailabilityStatus;
import com.mitti2market.model.TransportVehicle.VehicleType;
import com.mitti2market.repository.TransportVehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Manages Mitti2Market platform-owned transport inventory.
 * NOT a live driver/fleet system — represents platform logistics availability.
 */
@Service
@RequiredArgsConstructor
public class VehicleService {

    private final TransportVehicleRepository vehicleRepo;

    // ── Query ─────────────────────────────────────────────────────────────

    public List<Map<String, Object>> getAllVehicles() {
        return vehicleRepo.findByActiveTrueOrderByVehicleNumber()
                .stream().map(this::toMap).toList();
    }

    /**
     * Returns eligible and ineligible vehicles for a deal.
     * Eligible  = AVAILABLE + capacityKg >= cargoKg.
     * Ineligible = AVAILABLE but capacity is too small (shown so user understands).
     */
    public Map<String, Object> getVehiclesForDeal(double cargoKg, double distanceKm) {
        List<TransportVehicle> allAvailable = vehicleRepo.findAllAvailable();

        List<Map<String, Object>> eligible = allAvailable.stream()
                .filter(v -> v.getCapacityKg() >= cargoKg)
                .map(v -> toMapWithCost(v, distanceKm))
                .toList();

        List<Map<String, Object>> ineligible = allAvailable.stream()
                .filter(v -> v.getCapacityKg() < cargoKg)
                .map(v -> {
                    Map<String, Object> m = toMap(v);
                    m.put("eligible", false);
                    m.put("rejectionReason",
                            "Capacity " + v.getCapacityKg().intValue() + " kg is insufficient for cargo " + (int) cargoKg + " kg");
                    return m;
                })
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("eligible", eligible);
        result.put("ineligible", ineligible);
        result.put("cargoKg", cargoKg);
        result.put("distanceKm", distanceKm);
        result.put("hasEligible", !eligible.isEmpty());
        result.put("note",
                "Platform Logistics Availability — not live fleet data. "
                + "Estimated costs are calculated using configured per-km rates.");
        return result;
    }

    // ── Admin CRUD ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> createVehicle(Map<String, Object> body) {
        String vehicleNumber = (String) body.get("vehicleNumber");
        if (vehicleNumber == null || vehicleNumber.isBlank()) {
            throw new BadRequestException("vehicleNumber is required");
        }
        if (vehicleRepo.existsByVehicleNumber(vehicleNumber)) {
            throw new BadRequestException("Vehicle number already exists: " + vehicleNumber);
        }

        VehicleType type;
        try {
            type = VehicleType.valueOf(String.valueOf(body.get("vehicleType")).toUpperCase());
        } catch (Exception e) {
            type = VehicleType.TRUCK;
        }

        double capacityKg = body.get("capacityKg") != null
                ? Double.parseDouble(body.get("capacityKg").toString()) : 2500.0;

        TransportVehicle v = TransportVehicle.builder()
                .vehicleNumber(vehicleNumber)
                .vehicleLabel(body.get("vehicleLabel") != null
                        ? (String) body.get("vehicleLabel")
                        : type.label() + " – " + vehicleNumber)
                .vehicleType(type)
                .capacityKg(capacityKg)
                .currentArea(body.get("currentArea") != null ? (String) body.get("currentArea") : null)
                .currentState(body.get("currentState") != null ? (String) body.get("currentState") : null)
                .availabilityStatus(AvailabilityStatus.AVAILABLE)
                .costPerKm(body.get("costPerKm") != null ? Double.parseDouble(body.get("costPerKm").toString()) : 25.0)
                .baseCostRupees(body.get("baseCostRupees") != null ? Double.parseDouble(body.get("baseCostRupees").toString()) : 500.0)
                .loadingChargeRupees(body.get("loadingChargeRupees") != null ? Double.parseDouble(body.get("loadingChargeRupees").toString()) : 400.0)
                .notes(body.get("notes") != null ? (String) body.get("notes") : null)
                .build();

        return toMap(vehicleRepo.save(v));
    }

    @Transactional
    public Map<String, Object> updateVehicle(Long id, Map<String, Object> body) {
        TransportVehicle v = vehicleRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", "id", id));

        if (body.containsKey("availabilityStatus")) {
            try {
                v.setAvailabilityStatus(AvailabilityStatus.valueOf(
                        body.get("availabilityStatus").toString().toUpperCase()));
            } catch (Exception ignored) {}
        }
        if (body.containsKey("currentArea"))  v.setCurrentArea((String) body.get("currentArea"));
        if (body.containsKey("currentState")) v.setCurrentState((String) body.get("currentState"));
        if (body.containsKey("costPerKm"))    v.setCostPerKm(Double.parseDouble(body.get("costPerKm").toString()));
        if (body.containsKey("notes"))        v.setNotes((String) body.get("notes"));
        if (body.containsKey("active"))       v.setActive(Boolean.parseBoolean(body.get("active").toString()));
        if (body.containsKey("availableFrom")) {
            try { v.setAvailableFrom(LocalDateTime.parse((String) body.get("availableFrom"))); } catch (Exception ignored) {}
        }

        return toMap(vehicleRepo.save(v));
    }

    @Transactional
    public void markAssigned(Long vehicleId) {
        vehicleRepo.findById(vehicleId).ifPresent(v -> {
            v.setAvailabilityStatus(AvailabilityStatus.ASSIGNED);
            vehicleRepo.save(v);
        });
    }

    @Transactional
    public void markAvailable(Long vehicleId) {
        vehicleRepo.findById(vehicleId).ifPresent(v -> {
            if (v.getAvailabilityStatus() == AvailabilityStatus.ASSIGNED) {
                v.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
                vehicleRepo.save(v);
            }
        });
    }

    public TransportVehicle getById(Long id) {
        return vehicleRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle", "id", id));
    }

    // ── Mapping ───────────────────────────────────────────────────────────

    public Map<String, Object> toMap(TransportVehicle v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId());
        m.put("vehicleNumber", v.getVehicleNumber());
        m.put("vehicleLabel", v.getVehicleLabel() != null
                ? v.getVehicleLabel()
                : v.getVehicleType().label() + " – " + v.getVehicleNumber());
        m.put("vehicleType", v.getVehicleType().name());
        m.put("vehicleTypeLabel", v.getVehicleType().label());
        m.put("capacityKg", v.getCapacityKg());
        m.put("currentArea", v.getCurrentArea());
        m.put("currentState", v.getCurrentState());
        m.put("availabilityStatus", v.getAvailabilityStatus().name());
        m.put("availableFrom", v.getAvailableFrom());
        m.put("costPerKm", v.getCostPerKm());
        m.put("baseCostRupees", v.getBaseCostRupees());
        m.put("loadingChargeRupees", v.getLoadingChargeRupees());
        m.put("eligible", true);
        m.put("active", v.getActive());
        m.put("notes", v.getNotes());
        m.put("createdAt", v.getCreatedAt());
        return m;
    }

    public Map<String, Object> toMapWithCost(TransportVehicle v, double distanceKm) {
        Map<String, Object> m = toMap(v);
        double estimatedCost = v.estimateCost(distanceKm);
        m.put("estimatedCostRupees", estimatedCost);
        m.put("costBreakdown", Map.of(
                "base", v.getBaseCostRupees(),
                "perKmCharge", Math.round(distanceKm * v.getCostPerKm() * 100.0) / 100.0,
                "loading", v.getLoadingChargeRupees(),
                "total", estimatedCost,
                "note", "Estimated transport cost — actual price may vary"
        ));
        return m;
    }
}
