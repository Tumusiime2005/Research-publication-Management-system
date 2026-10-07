package com.brainhub.repository;

import com.brainhub.entity.Notification;
import com.brainhub.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByRecipientOrderByCreatedAtDesc(User recipient, Pageable pageable);
    long countByRecipientAndReadFalse(User recipient);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipient = :recipient AND n.read = false")
    void markAllAsReadForUser(User recipient);
}
