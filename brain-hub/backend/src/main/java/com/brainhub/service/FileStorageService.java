package com.brainhub.service;

import com.brainhub.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path uploadLocation;
    private final String storageProvider;
    private static final List<String> ALLOWED_MIME_TYPES = List.of(
            "application/pdf",
            "application/x-pdf"
    );
    private static final long MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

    public record StoredFileInfo(
            String fileUrl,
            String originalFileName,
            long fileSize,
            String mimeType
    ) {}

    public FileStorageService(
            @Value("${app.storage.provider:local}") String storageProvider,
            @Value("${app.storage.local-upload-dir:./uploads/publications}") String localUploadDir
    ) {
        this.storageProvider = storageProvider;
        this.uploadLocation = Paths.get(localUploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize upload storage folder", e);
        }
    }

    public StoredFileInfo storeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded file is empty");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("File exceeds maximum allowed size of 25MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Only PDF research documents are allowed (received MIME type: " + contentType + ")");
        }

        String rawOriginalName = file.getOriginalFilename();
        String safeOriginalName = (rawOriginalName != null)
                ? Paths.get(rawOriginalName).getFileName().toString().replaceAll("[^a-zA-Z0-9._-]", "_")
                : "document.pdf";

        if (!safeOriginalName.toLowerCase().endsWith(".pdf")) {
            throw new BadRequestException("File extension must be .pdf");
        }

        // Generate safe unique stored file name
        String uniqueStoredName = UUID.randomUUID() + "_" + safeOriginalName;

        try {
            Path targetPath = this.uploadLocation.resolve(uniqueStoredName).normalize();
            // Guard against path traversal
            if (!targetPath.startsWith(this.uploadLocation)) {
                throw new BadRequestException("Invalid path sequence in file name");
            }

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/api/publications/documents/" + uniqueStoredName;
            return new StoredFileInfo(fileUrl, safeOriginalName, file.getSize(), contentType);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store publication document", e);
        }
    }

    public Path loadFileAsResource(String fileName) {
        Path filePath = this.uploadLocation.resolve(fileName).normalize();
        if (!filePath.startsWith(this.uploadLocation) || !Files.exists(filePath)) {
            throw new BadRequestException("Document not found");
        }
        return filePath;
    }
}
