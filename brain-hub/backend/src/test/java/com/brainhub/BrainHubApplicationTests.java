package com.brainhub;

import com.brainhub.dto.AuthDtos.RegisterRequest;
import com.brainhub.dto.PublicationDtos.*;
import com.brainhub.entity.PublicationStatus;
import com.brainhub.entity.ReviewDecision;
import com.brainhub.entity.Role;
import com.brainhub.entity.User;
import com.brainhub.repository.PublicationRepository;
import com.brainhub.repository.UserRepository;
import com.brainhub.service.AdminReviewService;
import com.brainhub.service.AuthService;
import com.brainhub.service.PublicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class BrainHubApplicationTests {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("brain_hub_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private AuthService authService;

    @Autowired
    private PublicationService publicationService;

    @Autowired
    private AdminReviewService adminReviewService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PublicationRepository publicationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User researcher;
    private User admin;

    @BeforeEach
    void setUp() {
        publicationRepository.deleteAll();
        userRepository.deleteAll();

        researcher = new User(
                "Ada", "Lovelace", "ada.lovelace@oxford.edu",
                passwordEncoder.encode("SecurePass123!"), Role.RESEARCHER, "University of Oxford", "Computer Science"
        );
        researcher = userRepository.save(researcher);

        admin = new User(
                "Alan", "Turing", "alan.turing@cambridge.edu",
                passwordEncoder.encode("AdminPass123!"), Role.ADMIN, "Cambridge Institute", "Review Board"
        );
        admin = userRepository.save(admin);
    }

    @Test
    @DisplayName("Should successfully register researcher and hash password with BCrypt")
    void testResearcherRegistration() {
        RegisterRequest request = new RegisterRequest(
                "Grace", "Hopper", "grace.hopper@yale.edu",
                "CompScience#2026", "Yale University", "Systems"
        );

        var response = authService.register(request, "127.0.0.1");

        assertNotNull(response.accessToken());
        assertNotNull(response.refreshToken());
        assertEquals("grace.hopper@yale.edu", response.user().email());
        assertEquals(Role.RESEARCHER, response.user().role());

        User saved = userRepository.findByEmail("grace.hopper@yale.edu").orElseThrow();
        assertTrue(passwordEncoder.matches("CompScience#2026", saved.getPasswordHash()));
        assertNotEquals("CompScience#2026", saved.getPasswordHash());
    }

    @Test
    @DisplayName("Should enforce full publication workflow: Draft -> Submitted -> Approved and verify public visibility")
    void testPublicationWorkflow() {
        // 1. Create draft
        CreatePublicationRequest draftReq = new CreatePublicationRequest(
                "Quantum Machine Learning in Computational Neuroscience",
                "This study investigates tensor network representations of neurological neural networks.",
                "Neurocomputing",
                "quantum, neuroscience, machine learning",
                List.of(new AuthorDto("Ada Lovelace", "ada.lovelace@oxford.edu", 1, true))
        );

        PublicationResponse draft = publicationService.createDraft(researcher, draftReq, "127.0.0.1");
        assertEquals(PublicationStatus.DRAFT, draft.status());

        // 2. Submit for review
        PublicationResponse submitted = publicationService.submitForReview(researcher, draft.id(), "127.0.0.1");
        assertEquals(PublicationStatus.SUBMITTED, submitted.status());

        // 3. Admin reviews and approves
        ReviewDecisionRequest reviewReq = new ReviewDecisionRequest(
                ReviewDecision.APPROVED,
                "Rigorous methodology and outstanding theoretical derivation. Verified by editorial committee."
        );

        PublicationResponse approved = adminReviewService.conductReview(admin, submitted.id(), reviewReq, "127.0.0.1");
        assertEquals(PublicationStatus.APPROVED, approved.status());
        assertNotNull(approved.publishedAt());

        // 4. Check public repository visibility
        var publicList = publicationRepository.findApprovedWithFilters(null, null, org.springframework.data.domain.PageRequest.of(0, 10));
        assertEquals(1, publicList.getTotalElements());
        assertEquals("Quantum Machine Learning in Computational Neuroscience", publicList.getContent().get(0).getTitle());
    }

    @Test
    @DisplayName("Should require valid reason when rejecting a publication")
    void testRejectionValidation() {
        CreatePublicationRequest draftReq = new CreatePublicationRequest(
                "Flawed Hypotheses in Distributed Ledger Scalability",
                "Short abstract on blockchain latency bounds under extreme network jitter.",
                "Distributed Systems",
                "blockchain, networks",
                List.of(new AuthorDto("Ada Lovelace", "ada.lovelace@oxford.edu", 1, true))
        );

        PublicationResponse draft = publicationService.createDraft(researcher, draftReq, "127.0.0.1");
        PublicationResponse submitted = publicationService.submitForReview(researcher, draft.id(), "127.0.0.1");

        // Attempt rejection with insufficient reason
        ReviewDecisionRequest invalidReview = new ReviewDecisionRequest(
                ReviewDecision.REJECTED,
                "Too short"
        );

        assertThrows(RuntimeException.class, () ->
                adminReviewService.conductReview(admin, submitted.id(), invalidReview, "127.0.0.1")
        );
    }
}
