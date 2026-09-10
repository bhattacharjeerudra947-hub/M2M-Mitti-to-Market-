package com.mitti2market.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.StringJoiner;
import java.util.TreeMap;

/**
 * Serves crop price estimates from the Kaggle-trained model export
 * (ml/train_price_model.py → data/crop_price_model.json).
 *
 * Estimate source is ALWAYS disclosed:
 *   DATASET_MODEL  — stats learned from the Kaggle crop-price dataset
 *   LIVE_MANDI     — live data.gov.in mandi prices
 *   UNAVAILABLE    — no data; the API returns an explicit error, never fake numbers
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DatasetPriceService {

    private final ObjectMapper objectMapper;
    private final MandiPriceService mandiPriceService;

    private JsonNode model;
    private java.util.Set<String> cropIndex = new java.util.HashSet<>();

    @Value("${price.model.enabled:true}")
    private boolean modelEnabled;

    @PostConstruct
    void load() {
        if (!modelEnabled) {
            log.info("Dataset price model disabled via config");
            return;
        }
        try {
            model = objectMapper.readTree(new ClassPathResource("data/crop_price_model.json").getInputStream());
            model.get("crops").forEach(c -> cropIndex.add(c.asText().toLowerCase()));
            log.info("Loaded crop price model: {} crops, {} rows, trained {}",
                    model.get("crops").size(), model.get("rows").asLong(), model.get("trainedAt").asText());
        } catch (Exception e) {
            model = null;
            log.warn("Crop price model not found (run ml/train_price_model.py) — estimates fall back to live mandi API");
        }
    }

    /**
     * Price estimate for a crop/state/month.
     * Returns null fields when no data is available — the caller surfaces an
     * explicit "unavailable" state instead of fabricating a price.
     */
    public Map<String, Object> estimate(String cropName, String state, Integer month) {
        int m = (month != null && month >= 1 && month <= 12) ? month : LocalDate.now().getMonthValue();
        String crop = normalize(cropName);
        String st = normalize(state);

        String matchedCrop = matchCrop(crop);
        if (matchedCrop == null) {
            return unavailable(cropName, m, "Crop not present in dataset or live mandi data");
        }

        // 1. Dataset model — exact (crop, state, month)
        if (model != null) {
            JsonNode hit = lookup(matchedCrop, st, m);
            if (hit != null) {
                Map<String, Object> out = base("DATASET_MODEL", matchedCrop, state, m);
                out.put("medianPrice", hit.get("median").asDouble());
                out.put("rangeLow", hit.get("p25").asDouble());
                out.put("rangeHigh", hit.get("p75").asDouble());
                out.put("samples", hit.get("samples").asInt());
                out.put("explanation", "Historical-data-based estimate from the crop-price dataset for "
                        + matchedCrop + " in month " + m + ". AI-generated estimate — not a guaranteed market price.");
                return out;
            }
        }

        // 2. Live mandi API fallback (real government data, no fabrication)
        try {
            Map<String, Object> live = mandiPriceService.searchPrices(matchedCrop, titleCase(state), null, null);
            if (Boolean.TRUE.equals(live.get("success"))) {
                Object pricesObj = live.get("prices");
                if (pricesObj instanceof java.util.List<?> prices && !prices.isEmpty()) {
                    Object first = prices.get(0);
                    Double modal = first instanceof Map<?, ?> p ? asDouble(p.get("modal_price")) : null;
                    Double minP = first instanceof Map<?, ?> p ? asDouble(p.get("min_price")) : null;
                    Double maxP = first instanceof Map<?, ?> p ? asDouble(p.get("max_price")) : null;
                    if (modal != null && modal > 0) {
                        Map<String, Object> out = base("LIVE_MANDI", matchedCrop, state, m);
                        out.put("medianPrice", modal);
                        out.put("rangeLow", minP != null ? minP : modal * 0.9);
                        out.put("rangeHigh", maxP != null ? maxP : modal * 1.1);
                        out.put("samples", prices.size());
                        out.put("explanation", "Live estimate from government mandi (data.gov.in) prices for "
                                + matchedCrop + ". AI-generated estimate — not a guaranteed market price.");
                        return out;
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Live mandi fallback failed for {}: {}", matchedCrop, e.getMessage());
        }

        return unavailable(cropName, m, "No dataset or live mandi data available for this crop/location");
    }

    // ──────── helpers ────────

    private JsonNode lookup(String crop, String state, int month) {
        if (model == null) return null;
        JsonNode lookup = model.get("lookup");
        if (lookup == null) return null;

        if (state != null) {
            JsonNode hit = lookup.get(crop + "|" + state + "|" + month);
            if (hit != null) return hit;
        }
        // crop-level fallback for the month
        JsonNode hit = lookup.get(crop + "||" + month);
        if (hit == null) {
            hit = lookup.get(crop + "||"); // crop overall
        }
        return hit;
    }

    private String matchCrop(String crop) {
        if (crop == null || crop.isBlank()) return null;
        String c = normalize(crop);
        if (cropIndex.contains(c)) return c;
        // substring match against known crops
        for (String known : cropIndex) {
            if (c.contains(known) || known.contains(c)) return known;
        }
        return null;
    }

    private Map<String, Object> unavailable(String crop, int month, String reason) {
        Map<String, Object> out = base("UNAVAILABLE", crop, null, month);
        out.put("explanation", reason
                + ". Mitti2Market does not show fabricated prices — please check the crop name or try the live mandi search.");
        return out;
    }

    private Map<String, Object> base(String source, String crop, String state, int month) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("source", source);
        out.put("crop", crop);
        out.put("state", state);
        out.put("month", month);
        return out;
    }

    private String normalize(String s) {
        if (s == null) return null;
        StringJoiner never = new StringJoiner(""); // keep null-handling explicit
        String v = s.toLowerCase().trim();
        return v.isEmpty() ? null : v;
    }

    private Double asDouble(Object o) {
        if (o == null) return null;
        try { return Double.valueOf(o.toString()); } catch (NumberFormatException e) { return null; }
    }

    private String titleCase(String s) {
        if (s == null || s.isBlank()) return null;
        String[] parts = s.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
        }
        return sb.toString();
    }
}
