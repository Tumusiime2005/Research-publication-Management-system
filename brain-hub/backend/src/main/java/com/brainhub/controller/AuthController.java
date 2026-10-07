package com.brainhub.controller;

import com.brainhub.dto.AuthDtos.*;
import com.brainhub.entity.User;
import com.brainhub.security.UserPrincipal;
import com.brainhub.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for user registration, login, token refresh, and bootstrap")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new researcher account")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        String ipAddress = httpRequest.getRemoteAddr();
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request, ipAddress));
    }

    @PostMapping("/bootstrap-admin")
    @Operation(summary = "Initialize/Bootstrap system administrator with protected secret token")
    public ResponseEntity<AuthResponse> bootstrapAdmin(@Valid @RequestBody BootstrapAdminRequest request, HttpServletRequest httpRequest) {
        String ipAddress = httpRequest.getRemoteAddr();
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.bootstrapAdmin(request, ipAddress));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user credentials and receive JWT access/refresh tokens")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String ipAddress = httpRequest.getRemoteAddr();
        return ResponseEntity.ok(authService.login(request, ipAddress));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Exchange a rotating refresh token for a fresh JWT access and refresh token")
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Log out user and revoke active refresh tokens")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UserPrincipal principal, @RequestBody(required = false) RefreshTokenRequest request) {
        if (principal != null) {
            authService.logout(principal.getUser(), request != null ? request.refreshToken() : null);
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Get currently authenticated user identity and role")
    public ResponseEntity<UserSummaryDto> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(authService.toSummaryDto(principal.getUser()));
    }

    @PatchMapping("/me/password")
    @Operation(summary = "Change password for the authenticated user")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.changePassword(principal.getUser(), request, httpRequest.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/me/profile")
    @Operation(summary = "Update personal profile information")
    public ResponseEntity<UserSummaryDto> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(authService.updateProfile(principal.getUser(), request));
    }
}
