package com.brainhub.service;

import com.brainhub.entity.AuditLog;
import com.brainhub.entity.User;
import com.brainhub.repository.AuditLogRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Async
    @Transactional
    public void record(User actor, String action, String entityType, UUID entityId, String metadata, String ipAddress) {
        AuditLog log = new AuditLog(actor, action, entityType, entityId, metadata, ipAddress);
        auditLogRepository.save(log);
    }
}
