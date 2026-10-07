package com.brainhub.service;

import com.brainhub.dto.PublicationDtos.*;
import com.brainhub.entity.*;
import com.brainhub.exception.BadRequestException;
import com.brainhub.exception.ResourceNotFoundException;
import com.brainhub.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class AdminReviewService {

    private final PublicationRepository publicationRepository;
    private final PublicationReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final PublicationService publicationService;

    public AdminReviewService(
            PublicationRepository publicationRepository,
            PublicationReviewRepository reviewRepository,
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            NotificationService notificationService,
            AuditLogService auditLogService,
            PublicationService publicationService
    ) {
        this.publicationRepository = publicationRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.publicationService = publicationService;
    }

    @Transactional(readOnly = true)
    public Page<PublicationResponse> getReviewQueue(
            PublicationStatus status,
            String researchArea,
            Instant startDate,
            Instant endDate,
            Pageable pageable
    ) {
        return publicationRepository.findAdminQueue(status, researchArea, startDate, endDate, pageable)
                .map(publicationService::toResponseDto);
    }

    @Transactional(readOnly = true)
    public PublicationResponse getPublicationForReview(UUID id) {
        Publication publication = publicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Publication not found with id: " + id));
        return publicationService.toResponseDto(publication);
    }

    @Transactional
    public PublicationResponse conductReview(User admin, UUID publicationId, ReviewDecisionRequest request, String ipAddress) {
        Publication publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Publication not found with id: " + publicationId));

        if (publication.getStatus() == PublicationStatus.DRAFT) {
            throw new BadRequestException("Cannot review a publication that is still in DRAFT status");
        }

        if (request.decision() == ReviewDecision.REJECTED && (request.verificationNotes() == null || request.verificationNotes().trim().length() < 10)) {
            throw new BadRequestException("A comprehensive rejection reason (minimum 10 characters) is required.");
        }

        PublicationReview review = new PublicationReview(
                publication,
                admin,
                request.decision(),
                request.verificationNotes().trim()
        );
        publication.addReview(review);

        String notificationTitle;
        String notificationMessage;

        switch (request.decision()) {
            case APPROVED -> {
                publication.setStatus(PublicationStatus.APPROVED);
                publication.setPublishedAt(Instant.now());
                notificationTitle = "Publication Approved & Published!";
                notificationMessage = "Your research titled '" + publication.getTitle() + "' has been approved by the editorial committee and is now live on BRAIN HUB.";
            }
            case REJECTED -> {
                publication.setStatus(PublicationStatus.REJECTED);
                notificationTitle = "Publication Rejected";
                notificationMessage = "Your submission '" + publication.getTitle() + "' was not accepted. Reviewer note: " + request.verificationNotes().trim();
            }
            case REVISION_REQUESTED -> {
                publication.setStatus(PublicationStatus.DRAFT); // Re-opens draft for researcher edits
                notificationTitle = "Revision Requested for Publication";
                notificationMessage = "Editorial changes are requested for '" + publication.getTitle() + "'. Reviewer instructions: " + request.verificationNotes().trim();
            }
            default -> throw new BadRequestException("Unsupported review decision: " + request.decision());
        }

        publication = publicationRepository.save(publication);

        // Notify the author
        notificationService.send(
                publication.getSubmittedBy(),
                "REVIEW_" + request.decision().name(),
                notificationTitle,
                notificationMessage,
                publication
        );

        auditLogService.record(admin, "REVIEW_DECISION_" + request.decision().name(), "PUBLICATION",
                publication.getId(), "Admin " + admin.getEmail() + " made decision: " + request.decision(), ipAddress);

        return publicationService.toResponseDto(publication);
    }

    @Transactional(readOnly = true)
    public AdminDashboardStatsResponse getAdminDashboardStats(User admin) {
        long totalResearchers = userRepository.countByRole(Role.RESEARCHER);
        long totalPublications = publicationRepository.count();
        long pendingReviews = publicationRepository.countByStatus(PublicationStatus.SUBMITTED)
                + publicationRepository.countByStatus(PublicationStatus.UNDER_REVIEW);
        long approved = publicationRepository.countByStatus(PublicationStatus.APPROVED);
        long rejected = publicationRepository.countByStatus(PublicationStatus.REJECTED);
        long unread = notificationRepository.countByRecipientAndReadFalse(admin);

        return new AdminDashboardStatsResponse(
                totalResearchers,
                totalPublications,
                pendingReviews,
                approved,
                rejected,
                unread
        );
    }
}
