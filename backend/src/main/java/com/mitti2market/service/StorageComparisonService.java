package com.mitti2market.service;

import com.mitti2market.dto.StorageComparisonDto;
import com.mitti2market.dto.StorageComparisonDto.ScenarioDetail;
import com.mitti2market.dto.StorageCostBreakdownDto;
import com.mitti2market.model.InventoryLot.BillingModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageComparisonService {

    private final StoragePricingService storagePricingService;
    private final MarketDataService marketDataService;

    /**
     * Compare Scenario A (Immediate Sale) vs Scenario B (Store in Cold Storage / Warehouse and Sell Later).
     */
    public StorageComparisonDto compareScenarios(
            String cropName,
            Double quantityKg,
            Double currentPricePerKg,
            Double futurePricePerKg,
            Integer storageDays,
            BillingModel billingModel,
            Double dailyStorageRate,
            Double loadingFee,
            Double handlingFee,
            Double transportFee,
            Double productionCostTotal,
            Double qualityLossPct
    ) {
        double qty = (quantityKg != null && quantityKg > 0) ? quantityKg : 1000.0;
        int days = (storageDays != null && storageDays > 0) ? storageDays : 30;
        double lossRate = (qualityLossPct != null && qualityLossPct >= 0) ? qualityLossPct : 2.0;

        // Current price resolution: if not supplied, look up in MarketDataService
        double curPrice = (currentPricePerKg != null && currentPricePerKg > 0)
                ? currentPricePerKg
                : resolveMarketPrice(cropName, 25.0);

        // Future price resolution: if not supplied, compute based on market trend or default +15%
        double futPrice = (futurePricePerKg != null && futurePricePerKg > 0)
                ? futurePricePerKg
                : estimateFuturePrice(cropName, curPrice, days);

        boolean prodCostKnown = productionCostTotal != null && productionCostTotal > 0;
        BigDecimal bProdCost = prodCostKnown
                ? BigDecimal.valueOf(productionCostTotal).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // ══════════════════════════════════════════════════════════════
        // 1. SCENARIO A: IMMEDIATE SALE
        // ══════════════════════════════════════════════════════════════
        double immSaleableQty = qty;
        BigDecimal bCurPrice = BigDecimal.valueOf(curPrice).setScale(2, RoundingMode.HALF_UP);
        BigDecimal immGrossRevenue = BigDecimal.valueOf(immSaleableQty).multiply(bCurPrice).setScale(2, RoundingMode.HALF_UP);

        BigDecimal immTransport = BigDecimal.valueOf(Math.round(qty * 0.04 * 25.0)).setScale(2, RoundingMode.HALF_UP); // ~25km local mandi
        BigDecimal immHandling = BigDecimal.valueOf(Math.round(qty * 0.20)).setScale(2, RoundingMode.HALF_UP); // ₹0.20/kg loading
        BigDecimal immCommission = immGrossRevenue.multiply(BigDecimal.valueOf(0.005)).setScale(2, RoundingMode.HALF_UP); // 0.5% platform fee
        BigDecimal immOtherFees = BigDecimal.ZERO;

        BigDecimal immTotalCosts = bProdCost.add(immTransport).add(immHandling).add(immCommission).add(immOtherFees);
        BigDecimal immNetProfit = immGrossRevenue.subtract(immTotalCosts);
        BigDecimal immNetRealizationPerKg = immSaleableQty > 0
                ? immNetProfit.divide(BigDecimal.valueOf(immSaleableQty), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        ScenarioDetail immediateDetail = ScenarioDetail.builder()
                .scenarioName("Immediate Direct Sale")
                .saleableQuantityKg(immSaleableQty)
                .pricePerKg(bCurPrice)
                .grossRevenue(immGrossRevenue)
                .productionCost(bProdCost)
                .productionCostKnown(prodCostKnown)
                .storageCosts(BigDecimal.ZERO)
                .handlingPackagingCost(immHandling)
                .transportationCost(immTransport)
                .platformCommission(immCommission)
                .otherFeesAndTaxes(immOtherFees)
                .totalCosts(immTotalCosts)
                .netProfit(immNetProfit)
                .netRealizationPerKg(immNetRealizationPerKg)
                .estimatedDaysToSale(2)
                .expectedSaleDate(LocalDate.now().plusDays(2))
                .estimatedQualityLossPct(0.0)
                .caveat(prodCostKnown ? "Full net profit calculated with recorded production cost." : "Production cost unrecorded; margin shows recorded-cost realization.")
                .build();

        // ══════════════════════════════════════════════════════════════
        // 2. SCENARIO B: STORE AND SELL LATER
        // ══════════════════════════════════════════════════════════════
        double storeSaleableQty = Math.round(qty * (1.0 - (lossRate / 100.0)) * 10.0) / 10.0;
        BigDecimal bFutPrice = BigDecimal.valueOf(futPrice).setScale(2, RoundingMode.HALF_UP);
        BigDecimal storeGrossRevenue = BigDecimal.valueOf(storeSaleableQty).multiply(bFutPrice).setScale(2, RoundingMode.HALF_UP);

        // Calculate storage expense using StoragePricingService
        StorageCostBreakdownDto storageBreakdown = storagePricingService.calculateStorageExpense(
                qty,
                (long) days,
                billingModel != null ? billingModel : BillingModel.PER_KG_PER_DAY,
                dailyStorageRate != null ? dailyStorageRate : 0.50,
                0.0,
                loadingFee != null ? loadingFee : (qty * 0.25),
                handlingFee != null ? handlingFee : (qty * 0.25),
                transportFee != null ? transportFee : (qty * 0.04 * 40.0), // ~40km to cold storage hub
                0.0,
                false
        );

        BigDecimal storeStorageFees = storageBreakdown.getBaseStorageCharge();
        BigDecimal storeHandling = storageBreakdown.getLoadingUnloadingFee().add(storageBreakdown.getHandlingPackagingFee());
        BigDecimal storeTransport = storageBreakdown.getTransportationFee();
        BigDecimal storeCommission = storeGrossRevenue.multiply(BigDecimal.valueOf(0.005)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal storeOtherFees = storageBreakdown.getTaxAndOtherFee();

        BigDecimal storeTotalCosts = bProdCost
                .add(storeStorageFees)
                .add(storeHandling)
                .add(storeTransport)
                .add(storeCommission)
                .add(storeOtherFees);

        BigDecimal storeNetProfit = storeGrossRevenue.subtract(storeTotalCosts);
        BigDecimal storeNetRealizationPerKg = storeSaleableQty > 0
                ? storeNetProfit.divide(BigDecimal.valueOf(storeSaleableQty), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        ScenarioDetail storageDetail = ScenarioDetail.builder()
                .scenarioName("Store in Facility & Sell Later")
                .saleableQuantityKg(storeSaleableQty)
                .pricePerKg(bFutPrice)
                .grossRevenue(storeGrossRevenue)
                .productionCost(bProdCost)
                .productionCostKnown(prodCostKnown)
                .storageCosts(storeStorageFees)
                .handlingPackagingCost(storeHandling)
                .transportationCost(storeTransport)
                .platformCommission(storeCommission)
                .otherFeesAndTaxes(storeOtherFees)
                .totalCosts(storeTotalCosts)
                .netProfit(storeNetProfit)
                .netRealizationPerKg(storeNetRealizationPerKg)
                .estimatedDaysToSale(days)
                .expectedSaleDate(LocalDate.now().plusDays(days))
                .estimatedQualityLossPct(lossRate)
                .caveat("Assumes " + lossRate + "% natural shrinkage/sorting loss during " + days + " days storage.")
                .build();

        // ══════════════════════════════════════════════════════════════
        // 3. COMPARISON & RECOMMENDATION ENGINE
        // ══════════════════════════════════════════════════════════════
        BigDecimal profitDiff = storeNetProfit.subtract(immNetProfit);
        BigDecimal realizationDiff = storeNetRealizationPerKg.subtract(immNetRealizationPerKg);

        String code;
        String headline;
        String explanation;

        if (profitDiff.compareTo(BigDecimal.valueOf(1000.0)) > 0 && realizationDiff.compareTo(BigDecimal.valueOf(1.0)) > 0) {
            code = "STORAGE_RECOMMENDED";
            headline = String.format("Storage may improve expected net returns by ₹%,.0f", profitDiff.doubleValue());
            explanation = String.format(
                    "Storing for %d days generates an estimated net realization of ₹%.2f/kg vs ₹%.2f/kg currently. Expected price rise to ₹%.2f/kg comfortably absorbs ₹%,.0f in storage, handling, and shrinkage expenses.",
                    days, storeNetRealizationPerKg.doubleValue(), immNetRealizationPerKg.doubleValue(), futPrice, storageBreakdown.getTotalStorageExpenses().doubleValue()
            );
        } else if (profitDiff.compareTo(BigDecimal.valueOf(-500.0)) < 0 || realizationDiff.compareTo(BigDecimal.valueOf(-0.5)) < 0) {
            code = "IMMEDIATE_SALE_RECOMMENDED";
            headline = "Selling now is more profitable than holding in storage";
            explanation = String.format(
                    "Immediate sale yields ₹%,.0f higher net profit. Additional storage costs (₹%,.0f) and %.1f%% quality shrinkage outweigh the projected price change.",
                    Math.abs(profitDiff.doubleValue()), storageBreakdown.getTotalStorageExpenses().doubleValue(), lossRate
            );
        } else {
            code = "MARGINAL_DIFFERENCE";
            headline = "Marginal difference between immediate sale and storage";
            explanation = String.format(
                    "The net difference is only ₹%,.0f (₹%.2f/kg). Consider holding only if cash flow allows and buyer contracts are anticipated.",
                    profitDiff.doubleValue(), realizationDiff.doubleValue()
            );
        }

        List<String> assumptions = new ArrayList<>();
        assumptions.add(String.format("Storage duration: %d days under %s billing model at ₹%.2f/unit", days, billingModel != null ? billingModel : BillingModel.PER_KG_PER_DAY, dailyStorageRate != null ? dailyStorageRate : 0.50));
        assumptions.add(String.format("Storage facility shrinkage & handling loss: %.1f%% (yielding %.1f kg saleable)", lossRate, storeSaleableQty));
        assumptions.add(String.format("Estimated storage & handling expenses: ₹%,.0f (₹%.2f/kg)", storageBreakdown.getTotalStorageExpenses().doubleValue(), storageBreakdown.getEffectiveCostPerKg().doubleValue()));
        assumptions.add(String.format("Projected future selling price: ₹%.2f/kg based on regional seasonal trends", futPrice));
        if (!prodCostKnown) {
            assumptions.add("Farmer production cost was not recorded; margins reflect net realization over supply-chain and storage expenses.");
        }

        return StorageComparisonDto.builder()
                .cropName(cropName)
                .quantityKg(qty)
                .currentMarketPrice(bCurPrice)
                .immediateScenario(immediateDetail)
                .storageScenario(storageDetail)
                .netProfitDifference(profitDiff)
                .netRealizationDifferencePerKg(realizationDiff)
                .recommendationCode(code)
                .recommendationHeadline(headline)
                .recommendationExplanation(explanation)
                .assumptions(assumptions)
                .dataCompleteness(prodCostKnown ? "COMPLETE" : "PRODUCTION_COST_UNRECORDED")
                .build();
    }

    private double resolveMarketPrice(String cropName, double fallback) {
        if (cropName == null) return fallback;
        try {
            var analysis = marketDataService.getMarketAnalysis(cropName, null, 0, null, null);
            if (analysis != null && analysis.containsKey("aiOptimalPrice")) {
                Object p = analysis.get("aiOptimalPrice");
                if (p instanceof Number) return ((Number) p).doubleValue();
            }
        } catch (Exception ignored) {}
        return fallback;
    }

    private double estimateFuturePrice(String cropName, double currentPrice, int days) {
        // Look up seasonal trend from MarketDataService
        double factor = 1.15; // default 15% increase for off-season storage
        try {
            var analysis = marketDataService.getMarketAnalysis(cropName, null, 0, null, null);
            if (analysis != null) {
                String trend = String.valueOf(analysis.getOrDefault("trend", "Stable"));
                if ("Increasing".equalsIgnoreCase(trend)) {
                    factor = 1.25; // 25% increase
                } else if ("Decreasing".equalsIgnoreCase(trend)) {
                    factor = 0.95; // 5% decrease
                } else {
                    factor = 1.10;
                }
            }
        } catch (Exception ignored) {}

        // Scale factor with duration (e.g. 30 days vs 60 days)
        double dayFactor = Math.min(1.4, 1.0 + ((factor - 1.0) * (days / 30.0)));
        return Math.round(currentPrice * dayFactor * 10.0) / 10.0;
    }
}
