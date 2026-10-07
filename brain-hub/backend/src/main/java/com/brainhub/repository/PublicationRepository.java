package com.brainhub.repository;

import com.brainhub.entity.Publication;
import com.brainhub.entity.PublicationStatus;
import com.brainhub.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PublicationRepository extends JpaRepository<Publication, UUID> {

    // Researcher queries
    Page<Publication> findBySubmittedBy(User submittedBy, Pageable pageable);
    Page<Publication> findBySubmittedByAndStatus(User submittedBy, PublicationStatus status, Pageable pageable);
    Optional<Publication> findByIdAndSubmittedBy(UUID id, User submittedBy);
    long countBySubmittedByAndStatus(User submittedBy, PublicationStatus status);
    long countBySubmittedBy(User submittedBy);

    // Public queries: strictly APPROVED
    @Query("SELECT p FROM Publication p WHERE p.status = 'APPROVED' " +
           "AND (:query IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(p.abstractText) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(p.keywords) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "AND (:researchArea IS NULL OR p.researchArea = :researchArea)")
    Page<Publication> findApprovedWithFilters(
            @Param("query") String query,
            @Param("researchArea") String researchArea,
            Pageable pageable
    );

    Optional<Publication> findByIdAndStatus(UUID id, PublicationStatus status);

    // Admin queries: filterable by status, researchArea, date range
    @Query("SELECT p FROM Publication p WHERE " +
           "(:status IS NULL OR p.status = :status) " +
           "AND (:researchArea IS NULL OR p.researchArea = :researchArea) " +
           "AND (:startDate IS NULL OR p.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR p.createdAt <= :endDate)")
    Page<Publication> findAdminQueue(
            @Param("status") PublicationStatus status,
            @Param("researchArea") String researchArea,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate,
            Pageable pageable
    );

    long countByStatus(PublicationStatus status);
}
