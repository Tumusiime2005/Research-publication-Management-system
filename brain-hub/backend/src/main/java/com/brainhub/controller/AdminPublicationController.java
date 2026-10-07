package com.brainhub.controller;

import com.brainhub.dto.PublicationDtos.*;
import com.brainhub.entity.PublicationStatus;
import com.brainhub.security.UserPrincipal;
import com.brainhub.service.AdminReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/publications")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Reviews", description = "Endpoints for administrators to inspect submissions, verify documents, and record decisions")
public class AdminPublicationController {

    private final AdminReviewService adminReviewService;

    public AdminPublicationController(AdminReviewService adminReviewService) {
        this.adminReviewService = adminReviewService;
    }

    @GetMapping
    @Operation(summary = "Get the admin review queue with filtering by status, research area, and date range")
    public ResponseEntity<Page<PublicationResponse>> getReviewQueue(
            @RequestParam(required = false) PublicationStatus status,
            @RequestParam(required = false) String researchArea,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(adminReviewService.getReviewQueue(status, researchArea, startDate, endDate, pageRequest));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get complete publication details for administrative review")
    public ResponseEntity<PublicationResponse> getPublicationForReview(@PathVariable UUID id) {
        return ResponseEntity.ok(adminReviewService.getPublicationForReview(id));
    }

    @PostMapping("/{id}/review")
    @Operation(summary = "Record verification review decision (APPROVE, REJECT, or REVISION_REQUESTED)")
    public ResponseEntity<PublicationResponse> conductReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody ReviewDecisionRequest request,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(adminReviewService.conductReview(principal.getUser(), id, request, httpRequest.getRemoteAddr()));
    }

    @GetMapping("/dashboard-stats")
    @Operation(summary = "Retrieve real aggregated metrics for the administrative dashboard")
    public ResponseEntity<AdminDashboardStatsResponse> getAdminDashboardStats(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(adminReviewService.getAdminDashboardStats(principal.getUser()));
    }
}
