package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.model.Report.ReportStatus;
import com.mitti2market.model.Report.ReportType;
import com.mitti2market.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final ProduceRepository produceRepository;
    private final DealRepository dealRepository;
    private final BuyerRequirementRepository buyerRequirementRepository;
    private final AdminService adminService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    /** Submit a new report */
    @Transactional
    public Report createReport(Long reporterId, Map<String, Object> body) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", reporterId));

        Long reportedUserId = body.get("reportedUserId") != null ? Long.valueOf(body.get("reportedUserId").toString()) : null;
        Long reportedProduceId = body.get("reportedProduceId") != null ? Long.valueOf(body.get("reportedProduceId").toString()) : null;
        Long reportedBusinessId = body.get("reportedBusinessId") != null ? Long.valueOf(body.get("reportedBusinessId").toString()) : null;
        Long reportedDealId = body.get("reportedDealId") != null ? Long.valueOf(body.get("reportedDealId").toString()) : null;
        Long reportedRequirementId = body.get("reportedRequirementId") != null ? Long.valueOf(body.get("reportedRequirementId").toString()) : null;

        if (reportedUserId == null && reportedProduceId == null && reportedBusinessId == null
                && reportedDealId == null && reportedRequirementId == null) {
            throw new BadRequestException("Report must target a user, produce, business, deal, or requirement");
        }

        String typeStr = (String) body.get("reportType");
        if (typeStr == null || typeStr.isBlank()) {
            typeStr = "OTHER";
        }

        ReportType reportType;
        try {
            reportType = ReportType.valueOf(typeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            reportType = ReportType.OTHER;
        }

        User reportedUser = reportedUserId != null ? userRepository.findById(reportedUserId).orElse(null) : null;
        Produce reportedProduce = reportedProduceId != null ? produceRepository.findById(reportedProduceId).orElse(null) : null;
        User reportedBusiness = reportedBusinessId != null ? userRepository.findById(reportedBusinessId).orElse(null) : null;
        Deal reportedDeal = reportedDealId != null ? dealRepository.findById(reportedDealId).orElse(null) : null;
        BuyerRequirement reportedReq = reportedRequirementId != null ? buyerRequirementRepository.findById(reportedRequirementId).orElse(null) : null;

        Report report = Report.builder()
                .reporter(reporter)
                .reportedUser(reportedUser)
                .reportedProduce(reportedProduce)
                .reportedBusiness(reportedBusiness)
                .reportedDeal(reportedDeal)
                .reportedRequirement(reportedReq)
                .reportType(reportType)
                .description((String) body.getOrDefault("description", ""))
                .status(ReportStatus.OPEN)
                .build();

        report = reportRepository.save(report);

        auditLogService.log(reporterId, "REPORT_CREATED", "REPORT", report.getId(), reportType.name(), "Report created by " + reporter.getName());

        return report;
    }

    /** List reports for Admin review */
    public List<Map<String, Object>> getReports(String status) {
        return getReports(status, null, null);
    }

    public List<Map<String, Object>> getReports(String status, String type, String keyword) {
        List<Report> list = reportRepository.findAllByOrderByCreatedAtDesc();

        return list.stream().filter(r -> {
            if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                if (!r.getStatus().name().equalsIgnoreCase(status)) return false;
            }
            if (type != null && !type.isBlank() && !type.equalsIgnoreCase("ALL")) {
                if (!r.getReportType().name().equalsIgnoreCase(type)) return false;
            }
            if (keyword != null && !keyword.isBlank()) {
                String k = keyword.toLowerCase().trim();
                boolean descMatch = r.getDescription() != null && r.getDescription().toLowerCase().contains(k);
                boolean reporterMatch = r.getReporter() != null && (
                        (r.getReporter().getName() != null && r.getReporter().getName().toLowerCase().contains(k)) ||
                        (r.getReporter().getEmail() != null && r.getReporter().getEmail().toLowerCase().contains(k)));
                boolean targetUserMatch = r.getReportedUser() != null && r.getReportedUser().getName() != null && r.getReportedUser().getName().toLowerCase().contains(k);
                boolean targetProduceMatch = r.getReportedProduce() != null && r.getReportedProduce().getName() != null && r.getReportedProduce().getName().toLowerCase().contains(k);
                if (!descMatch && !reporterMatch && !targetUserMatch && !targetProduceMatch) return false;
            }
            return true;
        }).map(this::toResponse).toList();
    }

    /** Get user's own submitted reports */
    public List<Map<String, Object>> getMyReports(Long userId) {
        return reportRepository.findByReporterIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse).toList();
    }

    /** Resolve / Dismiss / Escalate report */
    @Transactional
    public Report resolveReport(Long adminId, Long reportId, String statusStr, String adminNote, String actionType) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));
        User admin = userRepository.findById(adminId).orElse(null);

        ReportStatus newStatus;
        try {
            newStatus = ReportStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid report status: " + statusStr);
        }

        report.setStatus(newStatus);
        report.setAdminNote(adminNote);
        report.setResolvedBy(admin);
        report.setResolvedAt(LocalDateTime.now());
        reportRepository.save(report);

        // Execute connected administrative action if requested
        if (actionType != null && !actionType.isBlank() && !actionType.equalsIgnoreCase("NONE")) {
            if (actionType.equalsIgnoreCase("SUSPEND_USER") && report.getReportedUser() != null) {
                adminService.suspendUser(adminId, report.getReportedUser().getId(), "Suspended following report #" + reportId + ": " + adminNote);
            } else if (actionType.equalsIgnoreCase("REMOVE_PRODUCE") && report.getReportedProduce() != null) {
                adminService.removeProduce(adminId, report.getReportedProduce().getId(), "Removed following report #" + reportId + ": " + adminNote);
            } else if (actionType.equalsIgnoreCase("REMOVE_REQUIREMENT") && report.getReportedRequirement() != null) {
                adminService.removeRequirement(adminId, report.getReportedRequirement().getId(), "Removed following report #" + reportId + ": " + adminNote);
            }
        }

        auditLogService.log(adminId, "REPORT_" + newStatus.name(), "REPORT", reportId, adminNote, "Report #" + reportId + " status changed to " + newStatus.name());

        notificationService.createNotification(report.getReporter().getId(), Notification.NotificationType.REPORT_UPDATE,
                "Report Update", "Your report #" + reportId + " status is now " + newStatus.name().toLowerCase().replace('_', ' ') + ".",
                reportId, "REPORT");

        return report;
    }

    public Map<String, Object> toResponse(Report r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("reporterId", r.getReporter().getId());
        m.put("reporterName", r.getReporter().getName());
        m.put("reporterRole", r.getReporter().getRole().name());
        m.put("reportType", r.getReportType().name());
        m.put("description", r.getDescription());
        m.put("status", r.getStatus().name());
        m.put("adminNote", r.getAdminNote());
        m.put("resolvedBy", r.getResolvedBy() != null ? r.getResolvedBy().getName() : null);
        m.put("resolvedAt", r.getResolvedAt());
        m.put("createdAt", r.getCreatedAt());

        if (r.getReportedUser() != null) {
            Map<String, Object> u = new LinkedHashMap<>();
            u.put("id", r.getReportedUser().getId());
            u.put("name", r.getReportedUser().getName());
            u.put("role", r.getReportedUser().getRole().name());
            m.put("reportedUser", u);
        }
        if (r.getReportedProduce() != null) {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("id", r.getReportedProduce().getId());
            p.put("name", r.getReportedProduce().getName());
            m.put("reportedProduce", p);
        }
        if (r.getReportedBusiness() != null) {
            Map<String, Object> b = new LinkedHashMap<>();
            b.put("id", r.getReportedBusiness().getId());
            b.put("name", r.getReportedBusiness().getName());
            m.put("reportedBusiness", b);
        }
        if (r.getReportedDeal() != null) {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("id", r.getReportedDeal().getId());
            d.put("dealId", r.getReportedDeal().getDealId());
            m.put("reportedDeal", d);
        }
        if (r.getReportedRequirement() != null) {
            Map<String, Object> req = new LinkedHashMap<>();
            req.put("id", r.getReportedRequirement().getId());
            req.put("crop", r.getReportedRequirement().getCrop());
            m.put("reportedRequirement", req);
        }

        return m;
    }
}
