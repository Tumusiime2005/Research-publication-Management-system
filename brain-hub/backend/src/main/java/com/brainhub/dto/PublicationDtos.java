package com.brainhub.dto;

import com.brainhub.entity.PublicationStatus;
import com.brainhub.entity.ReviewDecision;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class PublicationDtos {

    public record AuthorDto(
            @NotBlank(message = "Author name is required")
            @Size(max = 150)
            String authorName,

            @NotBlank(message = "Author email is required")
            @Size(max = 255)
            String authorEmail,

            int authorOrder,
            boolean registeredUser
    ) {}

    public record CreatePublicationRequest(
            @NotBlank(message = "Title is required")
            @Size(min = 5, max = 300, message = "Title must be between 5 and 300 characters")
            String title,

            @NotBlank(message = "Abstract is required")
            @Size(min = 20, message = "Abstract must be at least 20 characters")
            String abstractText,

            @NotBlank(message = "Research area is required")
            @Size(max = 100)
            String researchArea,

            @NotBlank(message = "Keywords are required")
            @Size(max = 500)
            String keywords,

            @NotEmpty(message = "At least one author must be specified")
            List<AuthorDto> authors
    ) {}

    public record UpdatePublicationRequest(
            @NotBlank(message = "Title is required")
            @Size(min = 5, max = 300)
            String title,

            @NotBlank(message = "Abstract is required")
            @Size(min = 20)
            String abstractText,

            @NotBlank(message = "Research area is required")
            String researchArea,

            @NotBlank(message = "Keywords are required")
            String keywords,

            @NotEmpty(message = "Authors list cannot be empty")
            List<AuthorDto> authors
    ) {}

    public record ReviewDecisionRequest(
            @NotNull(message = "Decision is required")
            ReviewDecision decision,

            @NotBlank(message = "Verification notes are required. For rejections, a detailed rationale must be provided.")
            @Size(min = 10, message = "Verification notes must be at least 10 characters")
            String verificationNotes
    ) {}

    public record PublicationResponse(
            UUID id,
            String title,
            String abstractText,
            String researchArea,
            String keywords,
            String documentUrl,
            String documentOriginalName,
            Long documentSize,
            String documentMimeType,
            PublicationStatus status,
            AuthDtos.UserSummaryDto submittedBy,
            Instant publishedAt,
            Instant createdAt,
            Instant updatedAt,
            List<AuthorDto> authors,
            List<ReviewResponseDto> reviews
    ) {}

    public record ReviewResponseDto(
            UUID id,
            UUID reviewerId,
            String reviewerName,
            ReviewDecision decision,
            String verificationNotes,
            Instant createdAt
    ) {}

    public record DashboardStatsResponse(
            long totalPublications,
            long drafts,
            long submitted,
            long underReview,
            long approved,
            long rejected,
            long unreadNotifications
    ) {}

    public record AdminDashboardStatsResponse(
            long totalResearchers,
            long totalPublications,
            long pendingReviews,
            long approvedPublications,
            long rejectedPublications,
            long unreadNotifications
    ) {}
}
