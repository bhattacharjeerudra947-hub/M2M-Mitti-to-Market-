package com.mitti2market.repository;

import com.mitti2market.model.Report;
import com.mitti2market.model.Report.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findByStatusOrderByCreatedAtDesc(ReportStatus status);

    List<Report> findAllByOrderByCreatedAtDesc();

    List<Report> findByReporterIdOrderByCreatedAtDesc(Long reporterId);

    long countByStatus(ReportStatus status);
}
