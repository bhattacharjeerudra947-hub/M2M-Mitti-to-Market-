package com.mitti2market.repository;

import com.mitti2market.model.Dispute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisputeRepository extends JpaRepository<Dispute, Long> {

    List<Dispute> findByDealIdOrderByCreatedAtDesc(Long dealId);
}