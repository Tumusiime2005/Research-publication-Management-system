package com.brainhub.controller;

import com.brainhub.entity.Notification;
import com.brainhub.repository.NotificationRepository;
import com.brainhub.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "In-app notifications for status transitions and verification reviews")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public record NotificationDto(
            UUID id,
            String type,
            String title,
            String message,
            UUID relatedPublicationId,
            boolean read,
            Instant createdAt
    ) {}

    @GetMapping
    @Operation(summary = "Get user notifications paginated")
    public ResponseEntity<Page<NotificationDto>> getMyNotifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Notification> notifs = notificationRepository.findByRecipientOrderByCreatedAtDesc(principal.getUser(), pageRequest);

        return ResponseEntity.ok(notifs.map(n -> new NotificationDto(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getMessage(),
                n.getRelatedPublication() != null ? n.getRelatedPublication().getId() : null,
                n.isRead(),
                n.getCreatedAt()
        )));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark a single notification as read")
    @Transactional
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getRecipient().getId().equals(principal.getId())) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    @Operation(summary = "Mark all notifications as read for current user")
    @Transactional
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
        notificationRepository.markAllAsReadForUser(principal.getUser());
        return ResponseEntity.noContent().build();
    }
}
