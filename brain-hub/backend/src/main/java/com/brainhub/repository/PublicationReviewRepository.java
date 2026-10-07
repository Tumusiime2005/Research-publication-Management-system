package com.brainhub.repository;

import com.brainhub.entity.Publication;
import com.brainhub.entity.PublicationReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PublicationReviewRepository extends JpaRepository<PublicationReview, UUID> {
    List<PublicationReview> findByPublicationOrderByCreatedAtDesc(Publication publication);
}
