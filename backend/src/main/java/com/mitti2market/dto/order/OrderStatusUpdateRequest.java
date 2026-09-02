package com.mitti2market.dto.order;

import com.mitti2market.model.Order.OrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private OrderStatus status;

    private String logisticsPartner;

    private String trackingNumber;

    private LocalDate expectedDeliveryDate;
}
