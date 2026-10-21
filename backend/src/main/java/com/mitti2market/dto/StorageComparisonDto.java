package com.mitti2market.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorageComparisonDto {

    private String cropName;
    private Double quantityKg;
    private BigDecimal currentMarketPrice;

    private ScenarioDetail immediateScenario;
    private ScenarioDetail storageScenario;

    private BigDecimal netProfitDifference;
    private BigDecimal netRealizationDifferencePerKg;

    private String recommendationCode; // STORAGE_RECOMMENDED, IMMEDIATE_SALE_RECOMMENDED, MARGINAL_DIFFERENCE, INSUFFICIENT_DATA
    private String recommendationHeadline;
    private String recommendationExplanation;
    private List<String> assumptions;
    private String dataCompleteness; // COMPLETE, PRODUCTION_COST_UNRECORDED, ESTIMATED_FORECAST

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScenarioDetail {
        private String scenarioName;
        private Double saleableQuantityKg;
        private BigDecimal pricePerKg;
        private BigDecimal grossRevenue;
        private BigDecimal productionCost;
        private Boolean productionCostKnown;
        private BigDecimal storageCosts;
        private BigDecimal handlingPackagingCost;
        private BigDecimal transportationCost;
        private BigDecimal platformCommission;
        private BigDecimal otherFeesAndTaxes;
        private BigDecimal totalCosts;
        private BigDecimal netProfit;
        private BigDecimal netRealizationPerKg;
        private Integer estimatedDaysToSale;
        private LocalDate expectedSaleDate;
        private Double estimatedQualityLossPct;
        private String caveat;
    }
}
