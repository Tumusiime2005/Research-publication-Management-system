package com.brainhub.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "publications")
public class Publication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String abstractText;

    @Column(name = "research_area", nullable = false, length = 100)
    private String researchArea;

    @Column(nullable = false, length = 500)
    private String keywords;

    @Column(name = "document_url", length = 1024)
    private String documentUrl;

    @Column(name = "document_original_name", length = 255)
    private String documentOriginalName;

    @Column(name = "document_size")
    private Long documentSize;

    @Column(name = "document_mime_type", length = 100)
    private String documentMimeType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PublicationStatus status = PublicationStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "publication", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("authorOrder ASC")
    private List<PublicationAuthor> authors = new ArrayList<>();

    @OneToMany(mappedBy = "publication", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    private List<PublicationReview> reviews = new ArrayList<>();

    public Publication() {}

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void addAuthor(PublicationAuthor author) {
        authors.add(author);
        author.setPublication(this);
    }

    public void removeAuthor(PublicationAuthor author) {
        authors.remove(author);
        author.setPublication(null);
    }

    public void addReview(PublicationReview review) {
        reviews.add(review);
        review.setPublication(this);
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getAbstractText() { return abstractText; }
    public void setAbstractText(String abstractText) { this.abstractText = abstractText; }
    public String getResearchArea() { return researchArea; }
    public void setResearchArea(String researchArea) { this.researchArea = researchArea; }
    public String getKeywords() { return keywords; }
    public void setKeywords(String keywords) { this.keywords = keywords; }
    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
    public String getDocumentOriginalName() { return documentOriginalName; }
    public void setDocumentOriginalName(String documentOriginalName) { this.documentOriginalName = documentOriginalName; }
    public Long getDocumentSize() { return documentSize; }
    public void setDocumentSize(Long documentSize) { this.documentSize = documentSize; }
    public String getDocumentMimeType() { return documentMimeType; }
    public void setDocumentMimeType(String documentMimeType) { this.documentMimeType = documentMimeType; }
    public PublicationStatus getStatus() { return status; }
    public void setStatus(PublicationStatus status) { this.status = status; }
    public User getSubmittedBy() { return submittedBy; }
    public void setSubmittedBy(User submittedBy) { this.submittedBy = submittedBy; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<PublicationAuthor> getAuthors() { return authors; }
    public void setAuthors(List<PublicationAuthor> authors) { this.authors = authors; }
    public List<PublicationReview> getReviews() { return reviews; }
    public void setReviews(List<PublicationReview> reviews) { this.reviews = reviews; }
}
