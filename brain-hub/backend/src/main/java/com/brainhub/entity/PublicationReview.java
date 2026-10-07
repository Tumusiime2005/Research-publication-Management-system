package com.brainhub.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "publication_reviews")
public class PublicationReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "publication_id", nullable = false)
    private Publication publication;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReviewDecision decision;

    @Column(name = "verification_notes", nullable = false, columnDefinition = "TEXT")
    private String verificationNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public PublicationReview() {}

    public PublicationReview(Publication publication, User reviewer, ReviewDecision decision, String verificationNotes) {
        this.publication = publication;
        this.reviewer = reviewer;
        this.decision = decision;
        this.verificationNotes = verificationNotes;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Publication getPublication() { return publication; }
    public void setPublication(Publication publication) { this.publication = publication; }
    public User getReviewer() { return reviewer; }
    public void setReviewer(User reviewer) { this.reviewer = reviewer; }
    public ReviewDecision getDecision() { return decision; }
    public void setDecision(ReviewDecision decision) { this.decision = decision; }
    public String getVerificationNotes() { return verificationNotes; }
    public void setVerificationNotes(String verificationNotes) { this.verificationNotes = verificationNotes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
