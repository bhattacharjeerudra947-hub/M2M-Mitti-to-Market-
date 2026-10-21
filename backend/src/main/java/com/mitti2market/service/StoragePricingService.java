package com.mitti2market.service;

import com.mitti2market.dto.StorageCostBreakdownDto;
import com.mitti2market.model.InventoryLot.BillingModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Decimal-safe Storage Expense Calculator.
 * Implements configurable billing models for agricultural cold storage and warehouses.
 */
@Slf4j
@Service
public class StoragePricingService {

    private static final double DEFAULT_CRATE_KG = 20.0;
    private static final double DEFAULT_PALLET_KG = 500.0;

    /**
     * Calculate comprehensive storage expenses.
     */
    public StorageCostBreakdownDto calculateStorageExpense(
            Double quantityKg,
            Long durationDays,
            BillingModel billingModel,
            Double ratePerUnit,
            Double fixedBookingFee,
            Double loadingUnloadingFee,
            Double handlingPackagingFee,
            Double transportationFee,
            Double taxAndOtherFee,
            Boolean isFinalInvoice
    ) {
        double qty = (quantityKg != null && quantityKg > 0) ? quantityKg : 0.0;
        long days = (durationDays != null && durationDays > 0) ? durationDays : 1L; // Minimum 1 billable day
        BillingModel model = (billingModel != null) ? billingModel : BillingModel.PER_KG_PER_DAY;
        double rate = (ratePerUnit != null && ratePerUnit > 0) ? ratePerUnit : 0.50; // Default ₹0.50/kg/day

        BigDecimal bQty = BigDecimal.valueOf(qty);
        BigDecimal bDays = BigDecimal.valueOf(days);
        BigDecimal bRate = BigDecimal.valueOf(rate).setScale(2, RoundingMode.HALF_UP);

        BigDecimal baseStorageCharge = BigDecimal.ZERO;
        List<String> notes = new ArrayList<>();

        switch (model) {
            case PER_KG_PER_DAY -> {
                // formula: qty * rate * days
                baseStorageCharge = bQty.multiply(bRate).multiply(bDays);
                notes.add(String.format("Calculated as %.2f kg × ₹%.2f/kg/day × %d days", qty, rate, days));
            }
            case PER_TONNE_PER_DAY -> {
                // formula: (qty / 1000) * rate * days
                BigDecimal tonnes = bQty.divide(BigDecimal.valueOf(1000.0), 4, RoundingMode.HALF_UP);
                baseStorageCharge = tonnes.multiply(bRate).multiply(bDays);
                notes.add(String.format("Calculated as %.3f tonnes × ₹%.2f/tonne/day × %d days", qty / 1000.0, rate, days));
            }
            case PER_CRATE_PER_DAY -> {
                // formula: (qty / crateCapacity) * rate * days
                double crates = Math.ceil(qty / DEFAULT_CRATE_KG);
                baseStorageCharge = BigDecimal.valueOf(crates).multiply(bRate).multiply(bDays);
                notes.add(String.format("Calculated as %.0f crates (%.0f kg/crate) × ₹%.2f/crate/day × %d days", crates, DEFAULT_CRATE_KG, rate, days));
            }
            case PER_KG_PER_MONTH -> {
                // formula: qty * rate * (days / 30)
                BigDecimal months = bDays.divide(BigDecimal.valueOf(30.0), 4, RoundingMode.HALF_UP);
                baseStorageCharge = bQty.multiply(bRate).multiply(months);
                notes.add(String.format("Calculated as %.2f kg × ₹%.2f/kg/month × (%.1f billable months)", qty, rate, days / 30.0));
            }
            case PER_PALLET_PER_DAY -> {
                // formula: (qty / palletCapacity) * rate * days
                double pallets = Math.ceil(qty / DEFAULT_PALLET_KG);
                baseStorageCharge = BigDecimal.valueOf(pallets).multiply(bRate).multiply(bDays);
                notes.add(String.format("Calculated as %.0f pallets (%.0f kg/pallet) × ₹%.2f/pallet/day × %d days", pallets, DEFAULT_PALLET_KG, rate, days));
            }
            case FIXED_BOOKING_FEE -> {
                // Flat booking fee regardless of days
                baseStorageCharge = BigDecimal.valueOf(fixedBookingFee != null ? fixedBookingFee : 0.0);
                notes.add(String.format("Fixed booking fee of ₹%.2f applied", baseStorageCharge.doubleValue()));
            }
            case COMBINED -> {
                // base rate per kg per day + fixed booking fee
                BigDecimal fixedFee = BigDecimal.valueOf(fixedBookingFee != null ? fixedBookingFee : 0.0);
                BigDecimal varFee = bQty.multiply(bRate).multiply(bDays);
                baseStorageCharge = fixedFee.add(varFee);
                notes.add(String.format("Combined fee: Fixed ₹%.2f + Variable (%.2f kg × ₹%.2f × %d days)", fixedFee.doubleValue(), qty, rate, days));
            }
        }

        baseStorageCharge = baseStorageCharge.setScale(2, RoundingMode.HALF_UP);

        BigDecimal bFixed = BigDecimal.valueOf(fixedBookingFee != null ? fixedBookingFee : 0.0).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bLoading = BigDecimal.valueOf(loadingUnloadingFee != null ? loadingUnloadingFee : 0.0).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bHandling = BigDecimal.valueOf(handlingPackagingFee != null ? handlingPackagingFee : 0.0).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bTransport = BigDecimal.valueOf(transportationFee != null ? transportationFee : 0.0).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bTax = BigDecimal.valueOf(taxAndOtherFee != null ? taxAndOtherFee : 0.0).setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalStorageExpenses = baseStorageCharge
                .add(bLoading)
                .add(bHandling)
                .add(bTransport)
                .add(bTax);

        // Effective storage cost per kg
        BigDecimal effectiveCostPerKg = qty > 0
                ? totalStorageExpenses.divide(bQty, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return StorageCostBreakdownDto.builder()
                .quantityKg(qty)
                .billableDays(days)
                .billingModel(model)
                .ratePerUnit(bRate)
                .baseStorageCharge(baseStorageCharge)
                .fixedBookingFee(bFixed)
                .loadingUnloadingFee(bLoading)
                .handlingPackagingFee(bHandling)
                .transportationFee(bTransport)
                .taxAndOtherFee(bTax)
                .totalStorageExpenses(totalStorageExpenses)
                .effectiveCostPerKg(effectiveCostPerKg)
                .isEstimated(!Boolean.TRUE.equals(isFinalInvoice))
                .calculationNotes(notes)
                .build();
    }
}
