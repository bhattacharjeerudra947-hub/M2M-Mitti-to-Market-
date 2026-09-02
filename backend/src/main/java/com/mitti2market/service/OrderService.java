package com.mitti2market.service;

import com.mitti2market.dto.order.OrderRequest;
import com.mitti2market.dto.order.OrderResponse;
import com.mitti2market.dto.order.OrderStatusUpdateRequest;
import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.InsufficientStockException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.Order;
import com.mitti2market.model.Order.OrderStatus;
import com.mitti2market.model.Produce;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.model.User;
import com.mitti2market.repository.OrderRepository;
import com.mitti2market.repository.ProduceRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProduceRepository produceRepository;
    private final UserRepository userRepository;

    @Transactional
    public OrderResponse placeOrder(OrderRequest request) {
        Produce produce = produceRepository.findById(request.getProduceId())
                .orElseThrow(() -> new ResourceNotFoundException("Produce", "id", request.getProduceId()));

        User buyer = userRepository.findById(request.getBuyerId())
                .orElseThrow(() -> new ResourceNotFoundException("Buyer", "id", request.getBuyerId()));

        if (buyer.getRole() != User.Role.BUSINESS) {
            throw new BadRequestException("User is not a business buyer");
        }

        // Validate stock
        if (request.getQuantity() > produce.getQuantity()) {
            throw new InsufficientStockException(produce.getName(), request.getQuantity(), produce.getQuantity());
        }

        // Compute total price
        double totalPrice = produce.getPricePerUnit() * request.getQuantity();

        Order order = Order.builder()
                .produce(produce)
                .buyer(buyer)
                .farmer(produce.getFarmer())
                .quantity(request.getQuantity())
                .totalPrice(totalPrice)
                .deliveryAddress(request.getDeliveryAddress())
                .status(OrderStatus.PENDING)
                .build();

        Order saved = orderRepository.save(order);

        // Deduct quantity from produce listing
        int remaining = produce.getQuantity() - request.getQuantity();
        produce.setQuantity(remaining);

        // Flip status based on remaining stock
        if (remaining <= 0) {
            produce.setStatus(ProduceStatus.SOLD_OUT);
        } else if (remaining < 10) {
            produce.setStatus(ProduceStatus.LOW_STOCK);
        }

        produceRepository.save(produce);

        return toResponse(saved);
    }

    public List<OrderResponse> listOrders(OrderStatus status) {
        List<Order> orders = (status != null)
                ? orderRepository.findByStatus(status)
                : orderRepository.findAll();
        return orders.stream().map(this::toResponse).toList();
    }

    public OrderResponse getOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        return toResponse(order);
    }

    public List<OrderResponse> getByFarmer(Long farmerId) {
        if (!userRepository.existsById(farmerId)) {
            throw new ResourceNotFoundException("Farmer", "id", farmerId);
        }
        return orderRepository.findByFarmerId(farmerId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<OrderResponse> getByBuyer(Long buyerId) {
        if (!userRepository.existsById(buyerId)) {
            throw new ResourceNotFoundException("Buyer", "id", buyerId);
        }
        return orderRepository.findByBuyerId(buyerId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrderResponse updateStatus(Long id, OrderStatusUpdateRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        order.setStatus(request.getStatus());

        if (request.getLogisticsPartner() != null) {
            order.setLogisticsPartner(request.getLogisticsPartner());
        }
        if (request.getTrackingNumber() != null) {
            order.setTrackingNumber(request.getTrackingNumber());
        }
        if (request.getExpectedDeliveryDate() != null) {
            order.setExpectedDeliveryDate(request.getExpectedDeliveryDate());
        }

        Order saved = orderRepository.save(order);
        return toResponse(saved);
    }

    @Transactional
    public OrderResponse cancelOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new BadRequestException("Cannot cancel a delivered order");
        }

        order.setStatus(OrderStatus.CANCELLED);
        Order saved = orderRepository.save(order);

        // Restore quantity to produce listing
        Produce produce = order.getProduce();
        produce.setQuantity(produce.getQuantity() + order.getQuantity());

        // Restore produce status if it was LOW_STOCK or SOLD_OUT
        if (produce.getStatus() == ProduceStatus.SOLD_OUT || produce.getStatus() == ProduceStatus.LOW_STOCK) {
            produce.setStatus(ProduceStatus.AVAILABLE);
        }

        produceRepository.save(produce);

        return toResponse(saved);
    }

    private OrderResponse toResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .produceId(order.getProduce().getId())
                .produceName(order.getProduce().getName())
                .buyerId(order.getBuyer().getId())
                .buyerName(order.getBuyer().getName())
                .farmerId(order.getFarmer().getId())
                .farmerName(order.getFarmer().getName())
                .quantity(order.getQuantity())
                .totalPrice(order.getTotalPrice())
                .deliveryAddress(order.getDeliveryAddress())
                .status(order.getStatus())
                .logisticsPartner(order.getLogisticsPartner())
                .trackingNumber(order.getTrackingNumber())
                .expectedDeliveryDate(order.getExpectedDeliveryDate())
                .orderDate(order.getOrderDate())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}
