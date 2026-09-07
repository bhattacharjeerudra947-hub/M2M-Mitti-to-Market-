package com.mitti2market.repository;

import com.mitti2market.model.DealEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DealEventRepository extends JpaRepository<DealEvent, Long> {

    List<DealEvent> findByDealIdOrderByCreatedAtAsc(Long dealId);
}