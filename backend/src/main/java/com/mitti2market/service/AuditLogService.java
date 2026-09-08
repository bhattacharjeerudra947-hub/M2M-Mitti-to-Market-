package com.mitti2market.service;

import com.mitti2market.model.AuditLog;
import com.mitti2market.model.User;
import com.mitti2market.repository.AuditLogRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public void log(Long actorId, String action, String targetType, Long targetId, String reason, String details) {
        User actor = actorId != null ? userRepository.findById(actorId).orElse(null) : null;
        String actorName = actor != null ? actor.getName() : "SYSTEM";

        AuditLog log = AuditLog.builder()
                .actor(actor)
                .actorName(actorName)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .reason(reason)
                .details(details)
                .build();

        auditLogRepository.save(log);
    }

    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }
}
