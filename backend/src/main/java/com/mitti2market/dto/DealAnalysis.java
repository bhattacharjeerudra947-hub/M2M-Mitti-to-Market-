package com.mitti2market.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Per-deal analysis returned by the Deal Intelligence engine.
 * All monetary values are ESTIMATES — never exact.
 */
@Data
@Builder
public class DealAnalysis {

    // Buyer info
    private Long interestId;
    private Long buyerId;
    private String buyerName;
    private String buyerOrganization;
    private Boolean buyerVerified;
    private Double buyerRating;

    // Offer details
    private Double quotedPrice;        // ₹ per unit
    private Integer quantity;          // units
    private String unit;
    private Double grossValue;         // quotedPrice × quantity

    // Distance & logistics
    private Double distanceKm;         // estimated
    private Double logisticsCostPerUnit; // ₹ per unit
    private Double logisticsCost;      // total ₹
    private Double otherCosts;         // platform fee + handling ₹

    // Net realization (the key metric)
    private Double netValue;           // gross − logistics − other
    private Double netPerUnit;         // netValue / quantity

    // Ranking
    private Integer recommendationRank; // 1 = best
    private Double dealScore;          // 0–100 composite
    private Double confidence;         // 0–100

    // Explainability
    private List<String> reasons;      // why this rank
    private List<String> warnings;     // caution flags

    // Extra context for the UI
    private Map<String, Double> scoreBreakdown; // e.g. price=85, logistics=70
}