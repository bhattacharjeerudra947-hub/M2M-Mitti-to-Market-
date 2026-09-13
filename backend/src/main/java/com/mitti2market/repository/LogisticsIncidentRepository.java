package com.mitti2market.repository;

import com.mitti2market.model.LogisticsIncident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LogisticsIncidentRepository extends JpaRepository<LogisticsIncident, Long> {

    Optional<LogisticsIncident> findByIncidentNumber(String incidentNumber);

    List<LogisticsIncident> findByDealIdOrderByCreatedAtDesc(Long dealId);

    List<LogisticsIncident> findByReportedByIdOrderByCreatedAtDesc(Long reportedById);

    List<LogisticsIncident> findByStatusOrderByCreatedAtDesc(LogisticsIncident.IncidentStatus status);
}
