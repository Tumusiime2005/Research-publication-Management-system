package com.brainhub.controller;

import com.brainhub.dto.PublicationDtos.PublicationResponse;
import com.brainhub.entity.Publication;
import com.brainhub.entity.PublicationStatus;
import com.brainhub.exception.ResourceNotFoundException;
import com.brainhub.repository.PublicationRepository;
import com.brainhub.service.FileStorageService;
import com.brainhub.service.PublicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.UUID;

@RestController
@RequestMapping("/api/publications")
@Tag(name = "Public Publications", description = "Public research repository: strictly peer-reviewed and approved publications")
public class PublicPublicationController {

    private final PublicationRepository publicationRepository;
    private final PublicationService publicationService;
    private final FileStorageService fileStorageService;

    public PublicPublicationController(
            PublicationRepository publicationRepository,
            PublicationService publicationService,
            FileStorageService fileStorageService
    ) {
        this.publicationRepository = publicationRepository;
        this.publicationService = publicationService;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping("/public")
    @Operation(summary = "Search and filter approved academic publications for the public dashboard")
    public ResponseEntity<Page<PublicationResponse>> getApprovedPublications(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String researchArea,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("publishedAt").descending());
        Page<Publication> results = publicationRepository.findApprovedWithFilters(
                (query != null && !query.isBlank()) ? query.trim() : null,
                (researchArea != null && !researchArea.isBlank()) ? researchArea.trim() : null,
                pageRequest
        );
        return ResponseEntity.ok(results.map(publicationService::toResponseDto));
    }

    @GetMapping("/public/{id}")
    @Operation(summary = "Get detailed information for a specific approved public research publication")
    public ResponseEntity<PublicationResponse> getPublicPublication(@PathVariable UUID id) {
        Publication publication = publicationRepository.findByIdAndStatus(id, PublicationStatus.APPROVED)
                .orElseThrow(() -> new ResourceNotFoundException("Approved publication not found with id: " + id));
        return ResponseEntity.ok(publicationService.toResponseDto(publication));
    }

    @GetMapping("/documents/{fileName:.+}")
    @Operation(summary = "Retrieve or download a stored research document")
    public ResponseEntity<Resource> downloadDocument(@PathVariable String fileName) {
        Path filePath = fileStorageService.loadFileAsResource(fileName);
        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("File not found or unreadable: " + fileName);
            }
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            throw new RuntimeException("Malformed path URL for document", e);
        }
    }
}
