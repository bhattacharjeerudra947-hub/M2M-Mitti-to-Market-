package com.mitti2market.dto;

import com.mitti2market.model.InventoryLot.BillingModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorageCostBreakdownDto {
    private Double quantityKg;
    private Long billableDays;
    private BillingModel billingModel;
    private BigDecimal ratePerUnit;
    private BigDecimal baseStorageCharge;
    private BigDecimal fixedBookingFee;
    private BigDecimal loadingUnloadingFee;
    private BigDecimal handlingPackagingFee;
    private BigDecimal transportationFee;
    private BigDecimal taxAndOtherFee;
    private BigDecimal totalStorageExpenses;
    private BigDecimal effectiveCostPerKg;
    private Boolean isEstimated;
    private List<String> calculationNotes;
}
