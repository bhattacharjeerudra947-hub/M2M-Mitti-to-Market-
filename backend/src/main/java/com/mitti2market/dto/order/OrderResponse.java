package com.mitti2market.dto.order;

import com.mitti2market.model.Order.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {

    private Long id;
    private Long produceId;
    private String produceName;
    private Long buyerId;
    private String buyerName;
    private Long farmerId;
    private String farmerName;
    private Integer quantity;
    private Double totalPrice;
    private String deliveryAddress;
    private OrderStatus status;
    private String logisticsPartner;
    private String trackingNumber;
    private LocalDate expectedDeliveryDate;
    private LocalDateTime orderDate;
    private LocalDateTime updatedAt;
}
