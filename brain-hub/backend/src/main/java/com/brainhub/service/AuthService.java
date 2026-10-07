package com.brainhub.service;

import com.brainhub.dto.AuthDtos.*;
import com.brainhub.entity.RefreshToken;
import com.brainhub.entity.Role;
import com.brainhub.entity.User;
import com.brainhub.exception.BadRequestException;
import com.brainhub.exception.UnauthorizedException;
import com.brainhub.repository.RefreshTokenRepository;
import com.brainhub.repository.UserRepository;
import com.brainhub.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuditLogService auditLogService;

    @Value("${app.security.admin-bootstrap-token:BH-BOOTSTRAP-SECURE-KEY-2026}")
    private String adminBootstrapToken;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider,
            AuditLogService auditLogService
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, String ipAddress) {
        if (userRepository.existsByEmail(request.email().toLowerCase().trim())) {
            throw new BadRequestException("An account with this email address already exists.");
        }

        String encodedPassword = passwordEncoder.encode(request.password());
        User user = new User(
                request.firstName().trim(),
                request.lastName().trim(),
                request.email().toLowerCase().trim(),
                encodedPassword,
                Role.RESEARCHER,
                request.institution().trim(),
                request.department() != null ? request.department().trim() : null
        );

        user = userRepository.save(user);

        auditLogService.record(user, "REGISTER_USER", "USER", user.getId(), "User registered as RESEARCHER", ipAddress);

        return generateAuthResponse(user);
    }

    @Transactional
    public AuthResponse bootstrapAdmin(BootstrapAdminRequest request, String ipAddress) {
        if (!adminBootstrapToken.equals(request.bootstrapSecretToken())) {
            throw new UnauthorizedException("Invalid bootstrap administrator authorization token");
        }

        if (userRepository.existsByEmail(request.email().toLowerCase().trim())) {
            throw new BadRequestException("An account with this email address already exists.");
        }

        String encodedPassword = passwordEncoder.encode(request.password());
        User admin = new User(
                request.firstName().trim(),
                request.lastName().trim(),
                request.email().toLowerCase().trim(),
                encodedPassword,
                Role.ADMIN,
                request.institution().trim(),
                "Administration & Verification"
        );
        admin.setEmailVerified(true);
        admin = userRepository.save(admin);

        auditLogService.record(admin, "BOOTSTRAP_ADMIN", "USER", admin.getId(), "Administrator account bootstrapped", ipAddress);

        return generateAuthResponse(admin);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress) {
        User user = userRepository.findByEmail(request.email().toLowerCase().trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            auditLogService.record(null, "LOGIN_FAILED", "USER", user.getId(), "Failed login attempt for " + request.email(), ipAddress);
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getAccountStatus())) {
            throw new UnauthorizedException("Account is " + user.getAccountStatus());
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        auditLogService.record(user, "LOGIN_SUCCESS", "USER", user.getId(), "User successfully logged in", ipAddress);

        return generateAuthResponse(user);
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String tokenHash = hashToken(request.refreshToken());
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid or unrecognized refresh token"));

        if (storedToken.isRevoked() || storedToken.isExpired()) {
            throw new UnauthorizedException("Refresh token has expired or has been revoked");
        }

        // Revoke the current token (Rotation policy)
        storedToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(storedToken);

        User user = storedToken.getUser();
        return generateAuthResponse(user);
    }

    @Transactional
    public void logout(User user, String refreshToken) {
        if (refreshToken != null) {
            String tokenHash = hashToken(refreshToken);
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(rt -> {
                rt.setRevokedAt(Instant.now());
                refreshTokenRepository.save(rt);
            });
        }
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest request, String ipAddress) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Revoke existing refresh tokens
        refreshTokenRepository.revokeAllForUser(user, Instant.now());
        auditLogService.record(user, "CHANGE_PASSWORD", "USER", user.getId(), "Password updated", ipAddress);
    }

    @Transactional
    public UserSummaryDto updateProfile(User user, UpdateProfileRequest request) {
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setInstitution(request.institution().trim());
        user.setDepartment(request.department() != null ? request.department().trim() : null);
        user = userRepository.save(user);
        return toSummaryDto(user);
    }

    private AuthResponse generateAuthResponse(User user) {
        String accessToken = tokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String rawRefreshToken = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
        String tokenHash = hashToken(rawRefreshToken);

        Instant expiresAt = Instant.now().plusMillis(604800000L); // 7 days
        RefreshToken refreshTokenEntity = new RefreshToken(user, tokenHash, expiresAt);
        refreshTokenRepository.save(refreshTokenEntity);

        return new AuthResponse(
                accessToken,
                rawRefreshToken,
                "Bearer",
                tokenProvider.getAccessTokenExpirationMs(),
                toSummaryDto(user)
        );
    }

    public UserSummaryDto toSummaryDto(User user) {
        return new UserSummaryDto(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getRole(),
                user.getInstitution(),
                user.getDepartment(),
                user.isEmailVerified(),
                user.getAccountStatus(),
                user.getCreatedAt()
        );
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
