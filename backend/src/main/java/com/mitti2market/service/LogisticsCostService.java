package com.mitti2market.service;

import com.mitti2market.dto.RouteEstimate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Transport cost estimation for a route + cargo.
 *
 * ALL figures are ESTIMATES computed from configurable assumptions —
 * fuel price, mileage, driver cost, tolls. They are clearly labelled
 * as estimates, never presented as exact quotes.
 */
@Service
public class LogisticsCostService {

    private final double fuelPricePerLitre;
    private final double vehicleMileageKmpl;
    private final double driverCostPerDay;
    private final double tollPerKm;
    private final double handlingPerKg;
    private final double platformFeeRate;

    public LogisticsCostService(
            @Value("${cost.fuel-price-per-litre:100}") double fuelPricePerLitre,
            @Value("${cost.vehicle-mileage-kmpl:12}") double vehicleMileageKmpl,
            @Value("${cost.driver-cost-per-day:1200}") double driverCostPerDay,
            @Value("${cost.toll-per-km:1.5}") double tollPerKm,
            @Value("${cost.handling-per-kg:0.25}") double handlingPerKg,
            @Value("${cost.platform-fee-rate:0.005}") double platformFeeRate) {
        this.fuelPricePerLitre = fuelPricePerLitre;
        this.vehicleMileageKmpl = vehicleMileageKmpl;
        this.driverCostPerDay = driverCostPerDay;
        this.tollPerKm = tollPerKm;
        this.handlingPerKg = handlingPerKg;
        this.platformFeeRate = platformFeeRate;
    }

    /** Full cost breakdown for a route carrying `quantityKg` of cargo. */
    public Map<String, Object> estimateCost(RouteEstimate route, double quantityKg) {
        double distanceKm = route.getDistanceKm();
        double hours = route.getDurationMinutes() / 60.0;

        double fuelCost = (distanceKm / vehicleMileageKmpl) * fuelPricePerLitre;
        double driverCost = Math.max(driverCostPerDay * Math.min(1.0, hours / 8.0), driverCostPerDay * 0.25);
        double tollCost = distanceKm * tollPerKm;
        double handlingCost = quantityKg * handlingPerKg;
        double total = fuelCost + driverCost + tollCost + handlingCost;
        double costPerKg = quantityKg > 0 ? total / quantityKg : 0.0;

        Map<String, Object> breakdown = new LinkedHashMap<>();
        breakdown.put("fuel", round2(fuelCost));
        breakdown.put("driver", round2(driverCost));
        breakdown.put("tolls", round2(tollCost));
        breakdown.put("handling", round2(handlingCost));
        breakdown.put("total", round2(total));
        breakdown.put("costPerKg", round2(costPerKg));
        breakdown.put("assumptions", Map.of(
                "fuelPricePerLitre", fuelPricePerLitre,
                "mileageKmpl", vehicleMileageKmpl,
                "driverCostPerDay", driverCostPerDay,
                "tollPerKm", tollPerKm,
                "handlingPerKg", handlingPerKg
        ));
        breakdown.put("label", "Estimated using configured assumptions.");
        return breakdown;
    }

    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }
}