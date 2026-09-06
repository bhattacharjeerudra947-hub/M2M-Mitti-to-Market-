package com.mitti2market.service;

import com.mitti2market.dto.DealAnalysis;
import com.mitti2market.dto.RouteEstimate;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.BuyerInterest;
import com.mitti2market.model.Produce;
import com.mitti2market.model.User;
import com.mitti2market.repository.BuyerInterestRepository;
import com.mitti2market.repository.ProduceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Deal Intelligence Engine — the core differentiator of Mitti2Market.
 *
 * "Mitti2Market does not just find a buyer — it helps the farmer choose
 *  the deal that actually earns them the most."
 *
 * Key principle: HIGHEST OFFER ≠ HIGHEST NET REALIZATION.
 *
 * All cost figures are ESTIMATES based on configurable heuristics.
 * They are labelled as estimates, never presented as exact values.
 */
@Service
@RequiredArgsConstructor
public class DealIntelligenceService {

    private final BuyerInterestRepository interestRepository;
    private final ProduceRepository produceRepository;
    private final RouteService routeService;

    // ─── Configurable cost heuristics (₹) ─────────────────────────────
    /** Per-km per-kg transport cost — typical LTL trucking in India */
    private static final double COST_PER_KM_PER_KG = 0.04;
    /** Base loading/handling per kg */
    private static final double HANDLING_PER_KG = 0.25;
    /** Platform fee as a fraction of gross value */
    private static final double PLATFORM_FEE_RATE = 0.005;
    /** Default distance when location cannot be resolved (km) */
    private static final double DEFAULT_DISTANCE_KM = 50.0;

    // ─── Score weights (sum ≈ 100) ────────────────────────────────────
    private static final double W_PRICE = 35;
    private static final double W_LOGISTICS = 25;
    private static final double W_DISTANCE = 15;
    private static final double W_TRUST = 15;
    private static final double W_VERIFICATION = 10;

    /** Compare all buyer offers for a produce listing, ranked by best estimated net realization. */
    public List<DealAnalysis> analyzeProduce(Long produceId) {
        Produce produce = produceRepository.findById(produceId)
                .orElseThrow(() -> new ResourceNotFoundException("Produce not found: " + produceId));

        List<BuyerInterest> interests = interestRepository.findByProduceIdOrderByCreatedAtDesc(produceId)
                .stream()
                .filter(i -> i.getStatus() == BuyerInterest.InterestStatus.PENDING
                          || i.getStatus() == BuyerInterest.InterestStatus.ACCEPTED)
                .toList();

        if (interests.isEmpty()) return List.of();

        List<DealAnalysis> analyses = interests.stream()
                .map(i -> analyzeInterest(i, produce))
                .sorted(Comparator.comparingDouble(DealAnalysis::getNetPerUnit).reversed())
                .toList();

        // Assign ranks after sorting
        for (int i = 0; i < analyses.size(); i++) {
            analyses.get(i).setRecommendationRank(i + 1);
        }
        return analyses;
    }

    /** Get the single best deal recommendation for a produce listing. */
    public DealAnalysis recommendBestDeal(Long produceId) {
        List<DealAnalysis> ranked = analyzeProduce(produceId);
        if (ranked.isEmpty()) return null;
        return ranked.get(0);
    }

    /** Analyze all produce for a farmer and return the best deal for each active listing. */
    public List<DealAnalysis> analyzeFarmerProduce(Long farmerId) {
        List<Produce> produceList = produceRepository.findByFarmerId(farmerId);
        List<DealAnalysis> all = new ArrayList<>();
        for (Produce p : produceList) {
            DealAnalysis best = recommendBestDeal(p.getId());
            if (best != null) all.add(best);
        }
        return all;
    }

    // ─── Core analysis for a single interest ──────────────────────────
    private DealAnalysis analyzeInterest(BuyerInterest interest, Produce produce) {
        User buyer = interest.getBuyer();
        User farmer = produce.getFarmer();

        double offeredPrice = interest.getOfferedPrice() != null ? interest.getOfferedPrice() : produce.getPricePerUnit();
        int quantity = interest.getOfferedQuantity() != null ? interest.getOfferedQuantity() : produce.getQuantity();

        // 1. Distance + duration estimate (same route engine as logistics)
        RouteEstimate route = estimateRoute(farmer, buyer);
        double distanceKm = route.getDistanceKm();
        double durationMinutes = route.getDurationMinutes() != null ? route.getDurationMinutes() : 0.0;

        // 2. Cost estimates
        double logisticsCostPerUnit = distanceKm * COST_PER_KM_PER_KG + HANDLING_PER_KG;
        double logisticsCost = logisticsCostPerUnit * quantity;
        double grossValue = offeredPrice * quantity;
        double otherCosts = grossValue * PLATFORM_FEE_RATE + (0.10 * quantity); // platform fee + misc per-unit
        double netValue = grossValue - logisticsCost - otherCosts;
        double netPerUnit = quantity > 0 ? netValue / quantity : 0.0;

        // 3. Score breakdown (0–100 each)
        double priceScore = priceScore(offeredPrice, produce.getPricePerUnit());
        double logisticsScore = logisticsScore(logisticsCostPerUnit);
        double distanceScore = distanceScore(distanceKm);
        double trustScore = trustScore(buyer);
        double verificationScore = buyer.getVerified() != null && buyer.getVerified() ? 100 : 60;

        Map<String, Double> breakdown = new LinkedHashMap<>();
        breakdown.put("price", round(priceScore));
        breakdown.put("logistics", round(logisticsScore));
        breakdown.put("distance", round(distanceScore));
        breakdown.put("trust", round(trustScore));
        breakdown.put("verification", round(verificationScore));

        double dealScore = (W_PRICE * priceScore + W_LOGISTICS * logisticsScore
                + W_DISTANCE * distanceScore + W_TRUST * trustScore
                + W_VERIFICATION * verificationScore) / 100.0;

        // 4. Explainable reasons
        List<String> reasons = buildReasons(offeredPrice, produce.getPricePerUnit(), distanceKm,
                logisticsCostPerUnit, buyer);

        // 5. Warnings
        List<String> warnings = buildWarnings(buyer, offeredPrice, produce.getPricePerUnit(), distanceKm);

        double confidence = confidenceLevel(distanceKm, buyer);

        return DealAnalysis.builder()
                .interestId(interest.getId())
                .buyerId(buyer.getId())
                .buyerName(buyer.getName())
                .buyerOrganization(buyer.getOrganizationName())
                .buyerVerified(buyer.getVerified())
                .buyerRating(buyer.getRating())
                .quotedPrice(round2(offeredPrice))
                .quantity(quantity)
                .unit(produce.getUnit())
                .grossValue(round2(grossValue))
                .distanceKm(round2(distanceKm))
                .estimatedDurationMinutes(round1(durationMinutes))
                .routeProvider(route.getProvider())
                .routeCaveat(route.getCaveat())
                .logisticsCostPerUnit(round2(logisticsCostPerUnit))
                .logisticsCost(round2(logisticsCost))
                .otherCosts(round2(otherCosts))
                .netValue(round2(netValue))
                .netPerUnit(round2(netPerUnit))
                .dealScore(round(dealScore))
                .confidence(round(confidence))
                .reasons(reasons)
                .warnings(warnings)
                .scoreBreakdown(breakdown)
                .build();
    }

    // ─── Score helpers ────────────────────────────────────────────────
    private double priceScore(double offered, double asking) {
        if (asking <= 0) return 70;
        double ratio = offered / asking;
        if (ratio >= 1.0) return 100;
        if (ratio >= 0.95) return 92;
        if (ratio >= 0.9) return 82;
        if (ratio >= 0.8) return 68;
        return 50;
    }

    private double logisticsScore(double costPerUnit) {
        // Lower cost = higher score. ₹2/kg ≈ 80, ₹4/kg ≈ 60
        return Math.max(20, Math.min(100, 100 - (costPerUnit * 10)));
    }

    private double distanceScore(double km) {
        if (km <= 25) return 100;
        if (km <= 50) return 85;
        if (km <= 100) return 65;
        if (km <= 200) return 45;
        return 25;
    }

    private double trustScore(User buyer) {
        double rating = buyer.getRating() != null ? buyer.getRating() : 0.0;
        return Math.max(30, Math.min(100, rating * 20 + 40));
    }

    // ─── Explainable reasons ──────────────────────────────────────────
    private List<String> buildReasons(double offered, double asking, double distance,
                                      double logisticsCostPerUnit, User buyer) {
        List<String> reasons = new ArrayList<>();
        reasons.add(String.format("Quoted ₹%.2f/kg %s your asking price of ₹%.2f/kg",
                offered, offered >= asking ? "meets or exceeds" : "is below",
                asking));
        reasons.add(String.format("Estimated logistics of ₹%.2f/kg over ~%.0f km",
                logisticsCostPerUnit, distance));
        if (buyer.getVerified() != null && buyer.getVerified()) {
            reasons.add("Buyer is verified on Mitti2Market");
        }
        if (buyer.getRating() != null && buyer.getRating() > 3.5) {
            reasons.add(String.format("Buyer rating of %.1f/5 indicates reliability", buyer.getRating()));
        }
        return reasons;
    }

    private List<String> buildWarnings(User buyer, double offered, double asking, double distance) {
        List<String> warnings = new ArrayList<>();
        if (buyer.getVerified() == null || !buyer.getVerified()) {
            warnings.add("Buyer is not yet verified");
        }
        if (offered < asking * 0.85) {
            warnings.add(String.format("Offered price is %.0f%% below your asking price", 
                    (1 - offered / asking) * 100));
        }
        if (distance > 150) {
            warnings.add("Distance exceeds 150 km — verify logistics costs before committing");
        }
        return warnings;
    }

    private double confidenceLevel(double distance, User buyer) {
        double c = 90;
        if (distance > 100) c -= 15;
        if (buyer.getVerified() == null || !buyer.getVerified()) c -= 10;
        return Math.max(40, c);
    }

    // ─── Distance estimation ──────────────────────────────────────────
    /**
     * Estimates the road distance + duration between farmer and buyer.
     * Uses the shared RouteService (haversine × road factor fallback, or a
     * live routing provider when configured). Falls back to the city lookup
     * table when neither user has coordinates.
     */
    private RouteEstimate estimateRoute(User a, User b) {
        if (a.getLatitude() != null && a.getLongitude() != null
                && b.getLatitude() != null && b.getLongitude() != null) {
            return routeService.estimateRoute(a.getLatitude(), a.getLongitude(), b.getLatitude(), b.getLongitude());
        }
        String locA = normalizeLocation(a.getLocation());
        String locB = normalizeLocation(b.getLocation());
        double km = DEFAULT_DISTANCE_KM;
        if (locA != null && locB != null) {
            if (locA.equals(locB)) {
                km = 10.0; // same city — short local pickup
            } else {
                Double d = CITY_DISTANCES.get(locA + "|" + locB);
                if (d == null) d = CITY_DISTANCES.get(locB + "|" + locA);
                if (d != null) km = d;
            }
        }
        return RouteEstimate.builder()
                .distanceKm(km)
                .durationMinutes(km / 40.0 * 60.0)
                .provider("city-table")
                .caveat("Estimated from general location (no exact coordinates available).")
                .build();
    }

    private String normalizeLocation(String location) {
        if (location == null) return null;
        // "Pune, Maharashtra" → "PUNE"
        String city = location.split(",")[0].trim().toUpperCase();
        return CITY_ALIASES.getOrDefault(city, city);
    }

    private static final Map<String, String> CITY_ALIASES = Map.ofEntries(
            Map.entry("BENGALURU", "BANGALORE"),
            Map.entry("BENGALURU CITY", "BANGALORE"),
            Map.entry("NEW DELHI", "DELHI"),
            Map.entry("NCR", "DELHI"),
            Map.entry("KOLKATA", "CALCUTTA"),
            Map.entry("CHENNAI", "MADRAS"),
            Map.entry("THIRUVANANTHAPURAM", "TRIVANDRUM"),
            Map.entry("KOCHI", "COCHIN")
    );

    /** Approximate inter-city road distances in km (symmetric). */
    private static final Map<String, Double> CITY_DISTANCES = Map.ofEntries(
            Map.entry("PUNE|MUMBAI", 150.0),
            Map.entry("PUNE|NASHIK", 210.0),
            Map.entry("PUNE|BANGALORE", 840.0),
            Map.entry("PUNE|DELHI", 1470.0),
            Map.entry("PUNE|CALCUTTA", 1900.0),
            Map.entry("PUNE|HYDERABAD", 560.0),
            Map.entry("NASHIK|MUMBAI", 180.0),
            Map.entry("NASHIK|BANGALORE", 900.0),
            Map.entry("NASHIK|DELHI", 1240.0),
            Map.entry("MUMBAI|DELHI", 1400.0),
            Map.entry("MUMBAI|BANGALORE", 980.0),
            Map.entry("MUMBAI|HYDERABAD", 710.0),
            Map.entry("BANGALORE|HYDERABAD", 570.0),
            Map.entry("BANGALORE|CHENNAI", 350.0),
            Map.entry("DELHI|LUCKNOW", 500.0),
            Map.entry("DELHI|JAIPUR", 280.0),
            Map.entry("DELHI|CHANDIGARH", 250.0),
            Map.entry("DELHI|AGRA", 230.0),
            Map.entry("LUCKNOW|KANPUR", 90.0)
    );

    private double round(double v) { return Math.round(v * 10.0) / 10.0; }
    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }
    private double round1(double v) { return Math.round(v * 10.0) / 10.0; }
}