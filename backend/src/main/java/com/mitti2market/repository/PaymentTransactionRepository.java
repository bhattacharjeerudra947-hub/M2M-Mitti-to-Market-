package com.mitti2market.repository;

import com.mitti2market.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    Optional<PaymentTransaction> findByTransactionId(String transactionId);

    List<PaymentTransaction> findByDealIdOrderByCreatedAtDesc(Long dealId);

    List<PaymentTransaction> findByPayerIdOrderByCreatedAtDesc(Long payerId);
}
