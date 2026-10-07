package com.brainhub.service;

import com.brainhub.entity.Notification;
import com.brainhub.entity.Publication;
import com.brainhub.entity.User;
import com.brainhub.repository.NotificationRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Async
    @Transactional
    public void send(User recipient, String type, String title, String message, Publication relatedPublication) {
        Notification notification = new Notification(recipient, type, title, message, relatedPublication);
        notificationRepository.save(notification);
    }

    @Async
    @Transactional
    public void notifyAdmins(List<User> admins, String type, String title, String message, Publication relatedPublication) {
        for (User admin : admins) {
            Notification notification = new Notification(admin, type, title, message, relatedPublication);
            notificationRepository.save(notification);
        }
    }
}
