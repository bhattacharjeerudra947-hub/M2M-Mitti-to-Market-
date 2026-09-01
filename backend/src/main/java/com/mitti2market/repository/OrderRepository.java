package com.mitti2market.repository;

import com.mitti2market.model.Order;
import com.mitti2market.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByBuyer(User buyer);
    Optional<Order> findByOrderNumber(String orderNumber);
}
