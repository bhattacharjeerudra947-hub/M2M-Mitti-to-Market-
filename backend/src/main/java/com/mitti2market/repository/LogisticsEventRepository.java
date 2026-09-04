package com.mitti2market.repository;

import com.mitti2market.model.LogisticsEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LogisticsEventRepository extends JpaRepository<LogisticsEvent, Long> {

    List<LogisticsEvent> findByLogisticsIdOrderByTimestampDesc(Long logisticsId);
}
