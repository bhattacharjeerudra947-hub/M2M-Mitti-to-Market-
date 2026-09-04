package com.mitti2market.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Month;
import java.util.*;

/**
 * AI Market Intelligence Service.
 *
 * Analyzes:
 * 1. Seasonal demand patterns (which crops are in-demand this month)
 * 2. Supply levels (how much is available in the market)
 * 3. Regional price variations (different cities pay different prices)
 * 4. Trend analysis (is the price going up or down)
 * 5. Transportation cost estimates
 *
 * This is a rule-based system designed for a hackathon.
 * In production, this would connect to real market APIs (Mandi data, Agmarknet, etc.)
 */
@Service
public class MarketDataService {

    // ═══════════════════════════════════════════════════════════════
    // CROP DATABASE — realistic market data for Indian crops
    // ═══════════════════════════════════════════════════════════════

    private static final Map<String, CropMarketData> CROP_DATABASE = Map.ofEntries(
        // VEGETABLES
        Map.entry("tomato", new CropMarketData("Tomato", "Vegetables",
            18.0, 45.0, 28.0,            // minPrice, maxPrice, avgPrice
            0.7, 0.5,                     // demandScore(0-1), supplyScore(0-1)
            "HIGH", "MEDIUM", "Increasing",
            List.of("Mumbai", "Pune", "Nashik", "Delhi"),
            Map.of("Mumbai", 31.0, "Pune", 28.0, "Nashik", 26.0, "Delhi", 30.0),
            List.of("Peak summer demand from restaurants", "Limited supply from open-field farming",
                    "Export demand from Middle East increasing", "Local mandi prices rising"))),

        Map.entry("onion", new CropMarketData("Onion", "Vegetables",
            12.0, 35.0, 22.0,
            0.6, 0.7,
            "MEDIUM", "HIGH", "Stable",
            List.of("Nashik", "Pune", "Mumbai", "Indore"),
            Map.of("Nashik", 20.0, "Pune", 22.0, "Mumbai", 25.0, "Indore", 19.0),
            List.of("Nashik is India's largest onion hub", "Export ban may increase domestic supply",
                    "Rabi crop harvest just completed", "Storage costs adding to base price"))),

        Map.entry("potato", new CropMarketData("Potato", "Vegetables",
            10.0, 28.0, 18.0,
            0.5, 0.6,
            "MEDIUM", "MEDIUM", "Stable",
            List.of("Agra", "Pune", "Lucknow", "Indore"),
            Map.of("Agra", 15.0, "Pune", 19.0, "Lucknow", 16.0, "Indore", 17.0),
            List.of("Steady year-round demand", "Cold storage keeping supply stable",
                    "Processing industry demand from PepsiCo, Lay's", "Monsoon may affect upcoming supply"))),

        Map.entry("green chili", new CropMarketData("Green Chili", "Vegetables",
            25.0, 80.0, 42.0,
            0.8, 0.3,
            "HIGH", "LOW", "Increasing",
            List.of("Guntur", "Indore", "Nashik", "Karnal"),
            Map.of("Guntur", 45.0, "Indore", 40.0, "Nashik", 38.0, "Karnal", 42.0),
            List.of(" spice processing demand surging", "Low supply due to pest attacks in key regions",
                    "Export demand from Southeast Asia", "Off-season premium applies"))),

        Map.entry("cauliflower", new CropMarketData("Cauliflower", "Vegetables",
            15.0, 40.0, 25.0,
            0.4, 0.6,
            "MEDIUM", "MEDIUM", "Decreasing",
            List.of("Nashik", "Pune", "Delhi", "Lucknow"),
            Map.of("Nashik", 24.0, "Pune", 26.0, "Delhi", 28.0, "Lucknow", 22.0),
            List.of("Winter crop — peak season ending", "Supply likely to drop in summer",
                    "Current trend is decreasing as season winds down", "Consider holding for better prices"))),

        // FRUITS
        Map.entry("mango", new CropMarketData("Mango", "Fruits",
            30.0, 200.0, 80.0,
            0.9, 0.4,
            "HIGH", "LOW", "Increasing",
            List.of("Ratnagiri", "Junagadh", "Lucknow", "Hyderabad"),
            Map.of("Ratnagiri", 120.0, "Junagadh", 90.0, "Lucknow", 70.0, "Hyderabad", 75.0),
            List.of("Alphonso season starting — premium prices expected", "Export demand from UAE and UK",
                    "Domestic festival season driving demand", "Limited early-season supply"))),

        Map.entry("grapes", new CropMarketData("Grapes", "Fruits",
            25.0, 90.0, 55.0,
            0.5, 0.6,
            "MEDIUM", "MEDIUM", "Decreasing",
            List.of("Nashik", "Pune", "Bangalore", "Hyderabad"),
            Map.of("Nashik", 50.0, "Pune", 55.0, "Bangalore", 60.0, "Hyderabad", 52.0),
            List.of("Season ending — supply decreasing", "Export quality commanding premium",
                    "Table grapes demand stable", "Processing grapes have lower margins"))),

        Map.entry("banana", new CropMarketData("Banana", "Fruits",
            8.0, 30.0, 16.0,
            0.6, 0.8,
            "MEDIUM", "HIGH", "Stable",
            List.of("Jalgaon", "Tiruchirappalli", "Andhra", "Maharashtra"),
            Map.of("Jalgaon", 14.0, "Tiruchirappalli", 15.0, "Andhra", 13.0, "Maharashtra", 16.0),
            List.of("Year-round availability keeps prices stable", "Jalgaon is India's banana capital",
                    "Ripe banana demand from retailers steady", "Export to Middle East ongoing"))),

        // GRAINS
        Map.entry("rice", new CropMarketData("Rice", "Grains",
            20.0, 55.0, 32.0,
            0.7, 0.7,
            "HIGH", "HIGH", "Stable",
            List.of("Karnal", "Hapur", "Kolkata", "Hyderabad"),
            Map.of("Karnal", 30.0, "Hapur", 28.0, "Kolkata", 35.0, "Hyderabad", 33.0),
            List.of("Government MSP provides price floor", "Basmati commands premium in export markets",
                    "Bulk buyer demand from food processing units", "Kharif season stocks available"))),

        Map.entry("wheat", new CropMarketData("Wheat", "Grains",
            18.0, 30.0, 22.0,
            0.6, 0.8,
            "MEDIUM", "HIGH", "Stable",
            List.of("Indore", "Karnal", "Ludhiana", "Jaipur"),
            Map.of("Indore", 21.0, "Karnal", 23.0, "Ludhiana", 22.0, "Jaipur", 20.0),
            List.of("Rabi harvest just completed — ample supply", "Government procurement at MSP active",
                    "Flour mills seeking bulk orders", "Storage quality is key factor"))),

        Map.entry("jowar", new CropMarketData("Jowar", "Grains",
            15.0, 35.0, 24.0,
            0.4, 0.5,
            "MEDIUM", "MEDIUM", "Increasing",
            List.of("Solapur", "Sangli", "Nashik", "Bidar"),
            Map.of("Solapur", 22.0, "Sangli", 23.0, "Nashik", 25.0, "Bidar", 21.0),
            List.of("Health food trend increasing demand", "Gluten-free market growing",
                    "Poultry industry also a major buyer", "Limited processing infrastructure"))),

        // PULSES
        Map.entry("tur dal", new CropMarketData("Tur Dal", "Pulses",
            60.0, 120.0, 85.0,
            0.8, 0.4,
            "HIGH", "LOW", "Increasing",
            List.of("Latur", "Jalna", "Davangere", "Bidar"),
            Map.of("Latur", 82.0, "Jalna", 85.0, "Davangere", 88.0, "Bidar", 80.0),
            List.of("Import dependency keeping domestic prices firm", "Protein-rich diet trend boosting demand",
                    "Rabi crop supply tight", "Government import duty protecting local farmers"))),

        Map.entry("moong dal", new CropMarketData("Moong Dal", "Pulses",
            55.0, 110.0, 75.0,
            0.7, 0.5,
            "HIGH", "MEDIUM", "Stable",
            List.of("Indore", "Jaipur", "Latur", "Rajkot"),
            Map.of("Indore", 72.0, "Jaipur", 70.0, "Latur", 78.0, "Rajkot", 68.0),
            List.of("Year-round demand from dal mills", "Summer demand for moong dal water",
                    "Kharif crop expected to ease prices", "Organic moong commands 30% premium"))),

        // SPICES
        Map.entry("turmeric", new CropMarketData("Turmeric", "Spices",
            80.0, 200.0, 130.0,
            0.7, 0.5,
            "HIGH", "MEDIUM", "Increasing",
            List.of("Erode", "Sangli", "Nizamabad", "Salem"),
            Map.of("Erode", 140.0, "Sangli", 125.0, "Nizamabad", 135.0, "Salem", 130.0),
            List.of("Medicinal use driving global demand", "Finger turmeric commands premium",
                    "Export quality fetching 40% more", "Curcumin content is key quality indicator"))),

        Map.entry("chilli", new CropMarketData("Chilli", "Spices",
            60.0, 180.0, 100.0,
            0.8, 0.4,
            "HIGH", "LOW", "Increasing",
            List.of("Guntur", "Byadgi", "Khammam", "Warangal"),
            Map.of("Guntur", 110.0, "Byadgi", 95.0, "Khammam", 100.0, "Warangal", 90.0),
            List.of("Export demand from China and Southeast Asia", "Capsaicin content determines price",
                    "Dried chilli has longer shelf life premium", "New crop supply limited until October")))
    );

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get market analysis and AI price suggestion for a crop.
     * @param cropName the crop name (case-insensitive)
     * @param location the farmer's location (optional, for regional pricing)
     * @param farmerDesiredPrice what the farmer wants to charge (0 if not set)
     * @return market analysis with AI suggested price range
     */
    public Map<String, Object> getMarketAnalysis(String cropName, String location, double farmerDesiredPrice) {
        CropMarketData data = findCropData(cropName);
        if (data == null) {
            return getDefaultAnalysis(cropName, farmerDesiredPrice);
        }

        // Apply seasonal adjustments based on current month
        Month currentMonth = LocalDate.now().getMonth();
        double seasonalFactor = getSeasonalFactor(data.category, currentMonth);

        // Apply regional pricing
        double regionalPrice = data.avgPrice;
        String matchedRegion = "National Average";
        if (location != null && !location.isBlank()) {
            for (var entry : data.regionalPrices.entrySet()) {
                if (location.toLowerCase().contains(entry.getKey().toLowerCase())) {
                    regionalPrice = entry.getValue();
                    matchedRegion = entry.getKey();
                    break;
                }
            }
        }

        // AI suggests optimal price considering demand, supply, season, and region
        double aiOptimalPrice = computeOptimalPrice(data, regionalPrice, seasonalFactor);
        double aiMinPrice = Math.round(aiOptimalPrice * 0.92 * 100.0) / 100.0;
        double aiMaxPrice = Math.round(aiOptimalPrice * 1.08 * 100.0) / 100.0;

        // If farmer has a desired price, show how it compares to AI suggestion
        String priceAdvice = "";
        if (farmerDesiredPrice > 0) {
            if (farmerDesiredPrice < aiMinPrice) {
                priceAdvice = "Your price (₹" + farmerDesiredPrice + ") is below the AI minimum (₹" + aiMinPrice + "). Consider increasing to at least ₹" + aiMinPrice + " for fair returns.";
            } else if (farmerDesiredPrice > aiMaxPrice) {
                priceAdvice = "Your price (₹" + farmerDesiredPrice + ") is above the AI maximum (₹" + aiMaxPrice + "). Buyers may find this expensive. Consider reducing to ₹" + aiMaxPrice + " or below.";
            } else {
                priceAdvice = "Your price (₹" + farmerDesiredPrice + ") is within the AI recommended range. Good pricing!";
            }
        }

        // Build reasons list
        List<Map<String, String>> reasons = new ArrayList<>();
        if ("HIGH".equals(data.demandLevel)) {
            reasons.add(Map.of("text", "High market demand — buyers are actively seeking " + data.name, "impact", "positive"));
        } else if ("LOW".equals(data.demandLevel)) {
            reasons.add(Map.of("text", "Low market demand — consider waiting or finding niche buyers", "impact", "negative"));
        } else {
            reasons.add(Map.of("text", "Moderate demand — standard market conditions for " + data.name, "impact", "neutral"));
        }

        if ("LOW".equals(data.supplyLevel)) {
            reasons.add(Map.of("text", "Low supply in market — favorable for higher prices", "impact", "positive"));
        } else if ("HIGH".equals(data.supplyLevel)) {
            reasons.add(Map.of("text", "High supply — prices may be under pressure", "impact", "negative"));
        }

        if ("Increasing".equals(data.trend)) {
            reasons.add(Map.of("text", "Prices trending upward over the last few weeks", "impact", "positive"));
        } else if ("Decreasing".equals(data.trend)) {
            reasons.add(Map.of("text", "Prices trending downward — act fast or hold stock", "impact", "negative"));
        }

        if (seasonalFactor > 1.05) {
            reasons.add(Map.of("text", "Peak season demand is boosting prices by ~" + Math.round((seasonalFactor - 1) * 100) + "%", "impact", "positive"));
        } else if (seasonalFactor < 0.95) {
            reasons.add(Map.of("text", "Off-season — prices are ~" + Math.round((1 - seasonalFactor) * 100) + "% below peak", "impact", "negative"));
        }

        reasons.addAll(data.reasons.stream()
            .map(r -> Map.of("text", r, "impact", "neutral"))
            .toList());

        // Build response
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("cropName", data.name);
        result.put("category", data.category);
        result.put("marketMinPrice", data.minPrice);
        result.put("marketMaxPrice", data.maxPrice);
        result.put("marketAvgPrice", data.avgPrice);
        result.put("regionalPrice", regionalPrice);
        result.put("matchedRegion", matchedRegion);
        result.put("demandLevel", data.demandLevel);
        result.put("supplyLevel", data.supplyLevel);
        result.put("trend", data.trend);
        result.put("seasonalFactor", seasonalFactor);
        result.put("aiSuggestedMinPrice", aiMinPrice);
        result.put("aiSuggestedMaxPrice", aiMaxPrice);
        result.put("aiOptimalPrice", aiOptimalPrice);
        result.put("reasons", reasons);
        result.put("regionalPrices", data.regionalPrices);
        if (!priceAdvice.isEmpty()) {
            result.put("priceAdvice", priceAdvice);
        }

        return result;
    }

    /**
     * Get AI price suggestion when creating/updating produce.
     * Returns the optimal price the farmer should list at.
     */
    public double getAiSuggestedPrice(String cropName, String location, double farmerDesiredPrice) {
        CropMarketData data = findCropData(cropName);
        if (data == null) {
            // No data — just do ±10% of desired price
            return farmerDesiredPrice > 0 ? farmerDesiredPrice : 0;
        }

        Month currentMonth = LocalDate.now().getMonth();
        double seasonalFactor = getSeasonalFactor(data.category, currentMonth);

        double regionalPrice = data.avgPrice;
        if (location != null && !location.isBlank()) {
            for (var entry : data.regionalPrices.entrySet()) {
                if (location.toLowerCase().contains(entry.getKey().toLowerCase())) {
                    regionalPrice = entry.getValue();
                    break;
                }
            }
        }

        double aiOptimal = computeOptimalPrice(data, regionalPrice, seasonalFactor);

        // If farmer wants a specific price, nudge towards AI suggestion
        if (farmerDesiredPrice > 0) {
            // Blend: 60% AI suggestion + 40% farmer's desired price
            return Math.round((aiOptimal * 0.6 + farmerDesiredPrice * 0.4) * 100.0) / 100.0;
        }

        return Math.round(aiOptimal * 100.0) / 100.0;
    }

    /**
     * Get list of all supported crops for the price advisor.
     */
    public List<Map<String, Object>> getAllCropPrices() {
        List<Map<String, Object>> crops = new ArrayList<>();
        Month currentMonth = LocalDate.now().getMonth();

        for (var entry : CROP_DATABASE.entrySet()) {
            CropMarketData data = entry.getValue();
            double seasonalFactor = getSeasonalFactor(data.category, currentMonth);
            double aiPrice = computeOptimalPrice(data, data.avgPrice, seasonalFactor);

            Map<String, Object> crop = new LinkedHashMap<>();
            crop.put("name", data.name);
            crop.put("category", data.category);
            crop.put("marketAvgPrice", data.avgPrice);
            crop.put("marketMinPrice", data.minPrice);
            crop.put("marketMaxPrice", data.maxPrice);
            crop.put("demandLevel", data.demandLevel);
            crop.put("supplyLevel", data.supplyLevel);
            crop.put("trend", data.trend);
            crop.put("aiSuggestedMinPrice", Math.round(aiPrice * 0.92 * 100.0) / 100.0);
            crop.put("aiSuggestedMaxPrice", Math.round(aiPrice * 1.08 * 100.0) / 100.0);
            crop.put("aiOptimalPrice", Math.round(aiPrice * 100.0) / 100.0);
            crops.add(crop);
        }

        return crops;
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════

    private CropMarketData findCropData(String cropName) {
        if (cropName == null) return null;
        String normalized = cropName.toLowerCase().trim();

        // Direct match
        CropMarketData direct = CROP_DATABASE.get(normalized);
        if (direct != null) return direct;

        // Partial match
        for (var entry : CROP_DATABASE.entrySet()) {
            if (normalized.contains(entry.getKey()) || entry.getKey().contains(normalized)) {
                return entry.getValue();
            }
        }

        // Category-based fallback
        for (var entry : CROP_DATABASE.entrySet()) {
            if (entry.getValue().category.toLowerCase().contains(normalized)) {
                return entry.getValue();
            }
        }

        return null;
    }

    /**
     * Compute the AI-optimal price based on demand, supply, region, and season.
     */
    private double computeOptimalPrice(CropMarketData data, double regionalPrice, double seasonalFactor) {
        double basePrice = regionalPrice;

        // Adjust for demand/supply dynamics
        // High demand + low supply = push price up
        // Low demand + high supply = push price down
        double demandSupplyFactor = 1.0 + (data.demandScore - data.supplyScore) * 0.15;

        // Apply seasonal factor
        double adjustedPrice = basePrice * demandSupplyFactor * seasonalFactor;

        // Clamp to market range (±20% of min/max)
        adjustedPrice = Math.max(data.minPrice * 0.9, Math.min(data.maxPrice * 1.1, adjustedPrice));

        return Math.round(adjustedPrice * 100.0) / 100.0;
    }

    /**
     * Seasonal demand multiplier based on crop category and current month.
     */
    private double getSeasonalFactor(String category, Month month) {
        int m = month.getValue();

        return switch (category.toLowerCase()) {
            case "vegetables" -> {
                // Summer (Mar-Jun): high demand for tomatoes, onions
                // Winter (Oct-Feb): high demand for cauliflower, potatoes
                if (m >= 3 && m <= 6) yield 1.12;  // Summer peak
                if (m >= 10 || m <= 2) yield 1.05;  // Winter peak
                yield 0.95;  // Monsoon dip
            }
            case "fruits" -> {
                // Mango season (Apr-Jul), Grape season (Nov-Feb)
                if (m >= 4 && m <= 7) yield 1.20;  // Mango peak
                if (m >= 11 || m <= 2) yield 1.10;  // Grape/citrus peak
                yield 0.90;
            }
            case "grains" -> {
                // Relatively stable year-round
                if (m >= 10 && m <= 1) yield 1.05;  // Post-harvest premium
                if (m >= 4 && m <= 7) yield 1.08;  // Pre-monsoon stocking
                yield 1.0;
            }
            case "spices" -> {
                // Post-monsoon (Oct-Dec) is harvest season — prices dip
                // Summer (Mar-May) — prices rise
                if (m >= 3 && m <= 6) yield 1.15;
                if (m >= 10 && m <= 12) yield 0.92;
                yield 1.0;
            }
            case "pulses" -> {
                // High demand year-round, slight dip post-harvest
                if (m >= 3 && m <= 6) yield 1.10;  // Summer demand
                if (m >= 10 && m <= 11) yield 0.95;  // Post-rabi harvest
                yield 1.02;
            }
            default -> 1.0;
        };
    }

    private Map<String, Object> getDefaultAnalysis(String cropName, double farmerDesiredPrice) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("cropName", cropName);
        result.put("category", "Unknown");
        result.put("demandLevel", "UNKNOWN");
        result.put("supplyLevel", "UNKNOWN");
        result.put("trend", "Unknown");
        result.put("aiSuggestedMinPrice", farmerDesiredPrice > 0 ? farmerDesiredPrice * 0.9 : 0);
        result.put("aiSuggestedMaxPrice", farmerDesiredPrice > 0 ? farmerDesiredPrice * 1.1 : 0);
        result.put("aiOptimalPrice", farmerDesiredPrice);
        result.put("reasons", List.of(Map.of("text", "No market data available for " + cropName + ". Using your desired price as base.", "impact", "neutral")));
        result.put("regionalPrices", Map.of());
        return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════

    private record CropMarketData(
        String name,
        String category,
        double minPrice,
        double maxPrice,
        double avgPrice,
        double demandScore,
        double supplyScore,
        String demandLevel,
        String supplyLevel,
        String trend,
        List<String> regions,
        Map<String, Double> regionalPrices,
        List<String> reasons
    ) {}
}
