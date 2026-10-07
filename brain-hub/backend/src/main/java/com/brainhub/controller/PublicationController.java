package com.brainhub.controller;

import com.brainhub.dto.PublicationDtos.*;
import com.brainhub.entity.PublicationStatus;
import com.brainhub.security.UserPrincipal;
import com.brainhub.service.FileStorageService;
import com.brainhub.service.PublicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/publications")
@Tag(name = "Researcher Publications", description = "Endpoints for authors to draft, upload documents, and submit research")
public class PublicationController {

    private final PublicationService publicationService;
    private final FileStorageService fileStorageService;

    public PublicationController(PublicationService publicationService, FileStorageService fileStorageService) {
        this.publicationService = publicationService;
        this.fileStorageService = fileStorageService;
    }

    @PostMapping
    @Operation(summary = "Create a new publication draft")
    public ResponseEntity<PublicationResponse> createDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreatePublicationRequest request,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(publicationService.createDraft(principal.getUser(), request, httpRequest.getRemoteAddr()));
    }

    @GetMapping("/my")
    @Operation(summary = "Retrieve publications created by the authenticated researcher")
    public ResponseEntity<Page<PublicationResponse>> getMyPublications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) PublicationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(publicationService.getMyPublications(principal.getUser(), status, pageRequest));
    }

    @GetMapping("/my/{id}")
    @Operation(summary = "Get publication details by ID for the owning researcher")
    public ResponseEntity<PublicationResponse> getMyPublication(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(publicationService.getMyPublicationById(principal.getUser(), id));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update an existing draft publication")
    public ResponseEntity<PublicationResponse> updateDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePublicationRequest request,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(publicationService.updateDraft(principal.getUser(), id, request, httpRequest.getRemoteAddr()));
    }

    @PostMapping(value = "/{id}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload and attach a PDF document to a draft publication")
    public ResponseEntity<PublicationResponse> uploadDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file
    ) {
        FileStorageService.StoredFileInfo fileInfo = fileStorageService.storeFile(file);
        return ResponseEntity.ok(publicationService.attachDocument(principal.getUser(), id, fileInfo));
    }

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit a completed publication draft for administrative review")
    public ResponseEntity<PublicationResponse> submitForReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(publicationService.submitForReview(principal.getUser(), id, httpRequest.getRemoteAddr()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an un-submitted draft publication")
    public ResponseEntity<Void> deleteDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            HttpServletRequest httpRequest
    ) {
        publicationService.deleteDraft(principal.getUser(), id, httpRequest.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/dashboard-stats")
    @Operation(summary = "Get real publication counts and notifications for the researcher dashboard")
    public ResponseEntity<DashboardStatsResponse> getResearcherStats(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(publicationService.getResearcherDashboardStats(principal.getUser()));
    }
}
