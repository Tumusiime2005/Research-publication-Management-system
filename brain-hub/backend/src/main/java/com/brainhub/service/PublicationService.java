package com.brainhub.service;

import com.brainhub.dto.AuthDtos;
import com.brainhub.dto.PublicationDtos.*;
import com.brainhub.entity.*;
import com.brainhub.exception.BadRequestException;
import com.brainhub.exception.ResourceNotFoundException;
import com.brainhub.repository.NotificationRepository;
import com.brainhub.repository.PublicationRepository;
import com.brainhub.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PublicationService {

    private final PublicationRepository publicationRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public PublicationService(
            PublicationRepository publicationRepository,
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            NotificationService notificationService,
            AuditLogService auditLogService
    ) {
        this.publicationRepository = publicationRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public PublicationResponse createDraft(User user, CreatePublicationRequest request, String ipAddress) {
        Publication publication = new Publication();
        publication.setTitle(request.title().trim());
        publication.setAbstractText(request.abstractText().trim());
        publication.setResearchArea(request.researchArea().trim());
        publication.setKeywords(request.keywords().trim());
        publication.setStatus(PublicationStatus.DRAFT);
        publication.setSubmittedBy(user);

        if (request.authors() != null) {
            for (AuthorDto a : request.authors()) {
                publication.addAuthor(new PublicationAuthor(
                        a.authorName().trim(),
                        a.authorEmail().trim(),
                        a.authorOrder(),
                        a.registeredUser()
                ));
            }
        }

        publication = publicationRepository.save(publication);

        auditLogService.record(user, "CREATE_DRAFT", "PUBLICATION", publication.getId(),
                "Draft created: " + publication.getTitle(), ipAddress);

        return toResponseDto(publication);
    }

    @Transactional
    public PublicationResponse updateDraft(User user, UUID publicationId, UpdatePublicationRequest request, String ipAddress) {
        Publication publication = getOwnedPublication(publicationId, user);

        if (publication.getStatus() != PublicationStatus.DRAFT) {
            throw new BadRequestException("Publications with status " + publication.getStatus() +
                    " cannot be modified directly. Only drafts can be edited.");
        }

        publication.setTitle(request.title().trim());
        publication.setAbstractText(request.abstractText().trim());
        publication.setResearchArea(request.researchArea().trim());
        publication.setKeywords(request.keywords().trim());

        publication.getAuthors().clear();
        for (AuthorDto a : request.authors()) {
            publication.addAuthor(new PublicationAuthor(
                    a.authorName().trim(),
                    a.authorEmail().trim(),
                    a.authorOrder(),
                    a.registeredUser()
            ));
        }

        publication = publicationRepository.save(publication);
        auditLogService.record(user, "UPDATE_DRAFT", "PUBLICATION", publication.getId(),
                "Draft updated: " + publication.getTitle(), ipAddress);

        return toResponseDto(publication);
    }

    @Transactional
    public PublicationResponse submitForReview(User user, UUID publicationId, String ipAddress) {
        Publication publication = getOwnedPublication(publicationId, user);

        if (publication.getStatus() != PublicationStatus.DRAFT) {
            throw new BadRequestException("Publication has already been submitted or processed (Status: " +
                    publication.getStatus() + ")");
        }

        if (publication.getAuthors().isEmpty()) {
            throw new BadRequestException("Publication must have at least one author before submission");
        }

        publication.setStatus(PublicationStatus.SUBMITTED);
        publication = publicationRepository.save(publication);

        // Notify administrators of incoming research
        List<User> admins = userRepository.findByRole(Role.ADMIN, Pageable.unpaged()).getContent();
        notificationService.notifyAdmins(
                admins,
                "NEW_SUBMISSION",
                "New Research Submitted for Review",
                "Researcher " + user.getFirstName() + " " + user.getLastName() +
                        " submitted '" + publication.getTitle() + "' in area " + publication.getResearchArea(),
                publication
        );

        auditLogService.record(user, "SUBMIT_PUBLICATION", "PUBLICATION", publication.getId(),
                "Publication submitted for review", ipAddress);

        return toResponseDto(publication);
    }

    @Transactional
    public PublicationResponse attachDocument(User user, UUID publicationId, FileStorageService.StoredFileInfo fileInfo) {
        Publication publication = getOwnedPublication(publicationId, user);
        if (publication.getStatus() != PublicationStatus.DRAFT) {
            throw new BadRequestException("Documents can only be attached to draft publications");
        }

        publication.setDocumentUrl(fileInfo.fileUrl());
        publication.setDocumentOriginalName(fileInfo.originalFileName());
        publication.setDocumentSize(fileInfo.fileSize());
        publication.setDocumentMimeType(fileInfo.mimeType());

        publication = publicationRepository.save(publication);
        return toResponseDto(publication);
    }

    @Transactional(readOnly = true)
    public Page<PublicationResponse> getMyPublications(User user, PublicationStatus status, Pageable pageable) {
        Page<Publication> page = (status == null)
                ? publicationRepository.findBySubmittedBy(user, pageable)
                : publicationRepository.findBySubmittedByAndStatus(user, status, pageable);

        return page.map(this::toResponseDto);
    }

    @Transactional(readOnly = true)
    public PublicationResponse getMyPublicationById(User user, UUID id) {
        Publication publication = getOwnedPublication(id, user);
        return toResponseDto(publication);
    }

    @Transactional
    public void deleteDraft(User user, UUID id, String ipAddress) {
        Publication publication = getOwnedPublication(id, user);
        if (publication.getStatus() != PublicationStatus.DRAFT) {
            throw new BadRequestException("Only draft publications may be deleted");
        }
        publicationRepository.delete(publication);
        auditLogService.record(user, "DELETE_DRAFT", "PUBLICATION", id, "Draft deleted", ipAddress);
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getResearcherDashboardStats(User user) {
        long total = publicationRepository.countBySubmittedBy(user);
        long drafts = publicationRepository.countBySubmittedByAndStatus(user, PublicationStatus.DRAFT);
        long submitted = publicationRepository.countBySubmittedByAndStatus(user, PublicationStatus.SUBMITTED);
        long underReview = publicationRepository.countBySubmittedByAndStatus(user, PublicationStatus.UNDER_REVIEW);
        long approved = publicationRepository.countBySubmittedByAndStatus(user, PublicationStatus.APPROVED);
        long rejected = publicationRepository.countBySubmittedByAndStatus(user, PublicationStatus.REJECTED);
        long unread = notificationRepository.countByRecipientAndReadFalse(user);

        return new DashboardStatsResponse(total, drafts, submitted, underReview, approved, rejected, unread);
    }

    private Publication getOwnedPublication(UUID id, User user) {
        return publicationRepository.findByIdAndSubmittedBy(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Publication not found with id: " + id));
    }

    public PublicationResponse toResponseDto(Publication p) {
        User sub = p.getSubmittedBy();
        AuthDtos.UserSummaryDto subDto = new AuthDtos.UserSummaryDto(
                sub.getId(), sub.getFirstName(), sub.getLastName(), sub.getEmail(),
                sub.getRole(), sub.getInstitution(), sub.getDepartment(),
                sub.isEmailVerified(), sub.getAccountStatus(), sub.getCreatedAt()
        );

        List<AuthorDto> authors = p.getAuthors().stream()
                .map(a -> new AuthorDto(a.getAuthorName(), a.getAuthorEmail(), a.getAuthorOrder(), a.isRegisteredUser()))
                .collect(Collectors.toList());

        List<ReviewResponseDto> reviews = p.getReviews().stream()
                .map(r -> new ReviewResponseDto(
                        r.getId(),
                        r.getReviewer().getId(),
                        r.getReviewer().getFirstName() + " " + r.getReviewer().getLastName(),
                        r.getDecision(),
                        r.getVerificationNotes(),
                        r.getCreatedAt()
                ))
                .collect(Collectors.toList());

        return new PublicationResponse(
                p.getId(),
                p.getTitle(),
                p.getAbstractText(),
                p.getResearchArea(),
                p.getKeywords(),
                p.getDocumentUrl(),
                p.getDocumentOriginalName(),
                p.getDocumentSize(),
                p.getDocumentMimeType(),
                p.getStatus(),
                subDto,
                p.getPublishedAt(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                authors,
                reviews
        );
    }
}
