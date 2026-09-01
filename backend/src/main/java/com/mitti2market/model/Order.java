package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String orderNumber;

    @ManyToOne
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne
    @JoinColumn(name = "produce_id", nullable = false)
    private Produce produce;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double pricePerKg;

    private Double totalAmount;

    @Enumerated(EnumType.STRING)
    private OrderStatus status = OrderStatus.CONFIRMED;

    @Enumerated(EnumType.STRING)
    private DeliveryStage currentStage = DeliveryStage.CONFIRMED;

    private String deliveryLocation;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    public enum OrderStatus {
        CONFIRMED,
        IN_TRANSIT,
        DELIVERED,
        CANCELLED
    }

    public enum DeliveryStage {
        CONFIRMED,
        PICKUP,
        IN_TRANSIT,
        DELIVERED
    }
}
