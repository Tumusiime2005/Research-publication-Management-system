package com.brainhub.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "publication_authors")
public class PublicationAuthor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "publication_id", nullable = false)
    private Publication publication;

    @Column(name = "author_name", nullable = false, length = 150)
    private String authorName;

    @Column(name = "author_email", nullable = false, length = 255)
    private String authorEmail;

    @Column(name = "author_order", nullable = false)
    private int authorOrder;

    @Column(name = "is_registered_user", nullable = false)
    private boolean registeredUser = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public PublicationAuthor() {}

    public PublicationAuthor(String authorName, String authorEmail, int authorOrder, boolean registeredUser) {
        this.authorName = authorName;
        this.authorEmail = authorEmail;
        this.authorOrder = authorOrder;
        this.registeredUser = registeredUser;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Publication getPublication() { return publication; }
    public void setPublication(Publication publication) { this.publication = publication; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public String getAuthorEmail() { return authorEmail; }
    public void setAuthorEmail(String authorEmail) { this.authorEmail = authorEmail; }
    public int getAuthorOrder() { return authorOrder; }
    public void setAuthorOrder(int authorOrder) { this.authorOrder = authorOrder; }
    public boolean isRegisteredUser() { return registeredUser; }
    public void setRegisteredUser(boolean registeredUser) { this.registeredUser = registeredUser; }
    public Instant getCreatedAt() { return createdAt; }
}
