package com.brainhub.controller;

import com.brainhub.entity.AuditLog;
import com.brainhub.repository.AuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Audit Logs", description = "Administrative immutable audit trail for compliance and tracking")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public record AuditLogDto(
            UUID id,
            String actorEmail,
            String action,
            String entityType,
            UUID entityId,
            String metadata,
            String ipAddress,
            Instant createdAt
    ) {}

    @GetMapping
    @Operation(summary = "Get immutable system audit logs with pagination")
    public ResponseEntity<Page<AuditLogDto>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<AuditLog> logs = (action != null && !action.isBlank())
                ? auditLogRepository.findByActionOrderByCreatedAtDesc(action.trim(), pageRequest)
                : auditLogRepository.findAllByOrderByCreatedAtDesc(pageRequest);

        return ResponseEntity.ok(logs.map(log -> new AuditLogDto(
                log.getId(),
                log.getActor() != null ? log.getActor().getEmail() : "SYSTEM",
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getMetadata(),
                log.getIpAddress(),
                log.getCreatedAt()
        )));
    }
}
