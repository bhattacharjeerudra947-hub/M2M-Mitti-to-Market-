package com.mitti2market.service;

import com.mitti2market.dto.StorageComparisonDto;
import com.mitti2market.dto.StorageCostBreakdownDto;
import com.mitti2market.model.InventoryLot.BillingModel;
import com.mitti2market.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;

class StorageAndAnalyticsTest {

    private StoragePricingService pricingService;
    private StorageComparisonService comparisonService;
    private MarketDataService marketDataService;
    private AnalyticsService analyticsService;
    private AnalyticsVoiceService voiceService;

    @BeforeEach
    void setUp() {
        pricingService = new StoragePricingService();
        marketDataService = Mockito.mock(MarketDataService.class);
        comparisonService = new StorageComparisonService(pricingService, marketDataService);

        UserRepository userRepo = Mockito.mock(UserRepository.class);
        ProduceRepository produceRepo = Mockito.mock(ProduceRepository.class);
        DealRepository dealRepo = Mockito.mock(DealRepository.class);
        OrderRepository orderRepo = Mockito.mock(OrderRepository.class);
        BuyerRequirementRepository reqRepo = Mockito.mock(BuyerRequirementRepository.class);
        BuyerInterestRepository interestRepo = Mockito.mock(BuyerInterestRepository.class);
        InventoryLotRepository lotRepo = Mockito.mock(InventoryLotRepository.class);
        LogisticsRepository logRepo = Mockito.mock(LogisticsRepository.class);
        PaymentTransactionRepository payRepo = Mockito.mock(PaymentTransactionRepository.class);
        WarehouseHubRepository hubRepo = Mockito.mock(WarehouseHubRepository.class);

        analyticsService = new AnalyticsService(
                userRepo, produceRepo, dealRepo, orderRepo, reqRepo, interestRepo,
                lotRepo, logRepo, payRepo, hubRepo
        );
        voiceService = new AnalyticsVoiceService(analyticsService);
    }

    @Test
    @DisplayName("Calculate Storage: Per Kg Per Day with Handling & Freight")
    void testPerKgPerDayStorageCalculation() {
        // 1,000 kg, 5 days @ ₹0.50/kg/day -> ₹2,500 base storage
        // Loading: ₹500, Transport: ₹1,500 -> Total ₹4,500
        StorageCostBreakdownDto breakdown = pricingService.calculateStorageExpense(
                1000.0,
                5L,
                BillingModel.PER_KG_PER_DAY,
                0.50,
                0.0,
                500.0,
                0.0,
                1500.0,
                0.0,
                false
        );

        assertNotNull(breakdown);
        assertEquals(0, breakdown.getBaseStorageCharge().compareTo(BigDecimal.valueOf(2500.00)));
        assertEquals(0, breakdown.getTotalStorageExpenses().compareTo(BigDecimal.valueOf(4500.00)));
        assertEquals(0, breakdown.getEffectiveCostPerKg().compareTo(BigDecimal.valueOf(4.50)));
        assertEquals(BillingModel.PER_KG_PER_DAY, breakdown.getBillingModel());
    }

    @Test
    @DisplayName("Calculate Storage: Per Tonne Per Day")
    void testPerTonnePerDayCalculation() {
        // 2,000 kg = 2.0 tonnes, 10 days @ ₹200/tonne/day = ₹4,000
        StorageCostBreakdownDto breakdown = pricingService.calculateStorageExpense(
                2000.0,
                10L,
                BillingModel.PER_TONNE_PER_DAY,
                200.0,
                0.0,
                0.0,
                0.0,
                0.0,
                0.0,
                true
        );

        assertNotNull(breakdown);
        assertEquals(0, breakdown.getBaseStorageCharge().compareTo(BigDecimal.valueOf(4000.00)));
        assertEquals(0, breakdown.getTotalStorageExpenses().compareTo(BigDecimal.valueOf(4000.00)));
        assertFalse(breakdown.getIsEstimated());
    }

    @Test
    @DisplayName("Immediate Sale vs Storage Comparison Engine")
    void testStorageComparisonEngine() {
        // 1000 kg Tomatoes, current price ₹20/kg, future price ₹28/kg after 30 days
        StorageComparisonDto comparison = comparisonService.compareScenarios(
                "Tomato",
                1000.0,
                20.0,
                28.0,
                30,
                BillingModel.PER_KG_PER_DAY,
                0.50,
                250.0,
                250.0,
                1500.0,
                10000.0,
                2.0
        );

        assertNotNull(comparison);
        assertNotNull(comparison.getImmediateScenario());
        assertNotNull(comparison.getStorageScenario());

        // Immediate: 1000 * 20 = 20,000 gross
        assertEquals(0, comparison.getImmediateScenario().getGrossRevenue().compareTo(BigDecimal.valueOf(20000.00)));

        // Storage: 980 kg * 28 = 27,440 gross
        assertEquals(980.0, comparison.getStorageScenario().getSaleableQuantityKg());
        assertEquals(0, comparison.getStorageScenario().getGrossRevenue().compareTo(BigDecimal.valueOf(27440.00)));

        assertNotNull(comparison.getRecommendationCode());
        assertNotNull(comparison.getRecommendationHeadline());
        assertFalse(comparison.getAssumptions().isEmpty());
    }

    @Test
    @DisplayName("Multilingual Voice Query: Bengali, Hindi, and English")
    void testMultilingualVoiceAssistant() {
        // Bengali question: "আমার এই মাসে মোট কত লাভ হয়েছে?"
        Map<String, Object> bnResult = voiceService.processVoiceQuery(
                "আমার এই মাসে মোট কত লাভ হয়েছে?",
                "bn",
                1L,
                "FARMER"
        );
        assertNotNull(bnResult);
        assertEquals("MONTHLY_PROFIT", bnResult.get("intent"));
        assertEquals("bn", bnResult.get("language"));
        assertTrue(bnResult.get("textResponse").toString().contains("টাকা") || bnResult.get("textResponse").toString().contains("₹"));

        // Hindi question: "कोल्ड स्टोरेज पर कितना खर्च हुआ?"
        Map<String, Object> hiResult = voiceService.processVoiceQuery(
                "कोल्ड स्टोरेज पर कितना खर्च हुआ?",
                "hi",
                1L,
                "FARMER"
        );
        assertNotNull(hiResult);
        assertEquals("STORAGE_EXPENSES", hiResult.get("intent"));
        assertEquals("hi", hiResult.get("language"));
        assertTrue(hiResult.get("textResponse").toString().contains("कोल्ड स्टोरेज"));

        // English question: "Which crop generated the highest profit?"
        Map<String, Object> enResult = voiceService.processVoiceQuery(
                "Which crop generated the highest profit?",
                "en",
                1L,
                "FARMER"
        );
        assertNotNull(enResult);
        assertEquals("CROP_PROFITABILITY", enResult.get("intent"));
        assertEquals("en", enResult.get("language"));
        assertNotNull(enResult.get("chartFocus"));
    }
}
