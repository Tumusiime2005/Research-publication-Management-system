package com.brainhub.dto;

import com.brainhub.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public class AuthDtos {

    public record RegisterRequest(
            @NotBlank(message = "First name is required")
            @Size(max = 100, message = "First name must not exceed 100 characters")
            String firstName,

            @NotBlank(message = "Last name is required")
            @Size(max = 100, message = "Last name must not exceed 100 characters")
            String lastName,

            @NotBlank(message = "Email is required")
            @Email(message = "Must be a valid email format")
            @Size(max = 255, message = "Email must not exceed 255 characters")
            String email,

            @NotBlank(message = "Password is required")
            @Size(min = 8, max = 64, message = "Password must be between 8 and 64 characters")
            @Pattern(
                    regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$",
                    message = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            )
            String password,

            @NotBlank(message = "Institution is required")
            @Size(max = 255, message = "Institution must not exceed 255 characters")
            String institution,

            @Size(max = 255, message = "Department must not exceed 255 characters")
            String department
    ) {}

    public record BootstrapAdminRequest(
            @NotBlank(message = "First name is required")
            String firstName,

            @NotBlank(message = "Last name is required")
            String lastName,

            @NotBlank(message = "Email is required")
            @Email(message = "Must be a valid email")
            String email,

            @NotBlank(message = "Password is required")
            @Size(min = 8)
            String password,

            @NotBlank(message = "Institution is required")
            String institution,

            @NotBlank(message = "Bootstrap secret token is required")
            String bootstrapSecretToken
    ) {}

    public record LoginRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Must be a valid email format")
            String email,

            @NotBlank(message = "Password is required")
            String password
    ) {}

    public record RefreshTokenRequest(
            @NotBlank(message = "Refresh token is required")
            String refreshToken
    ) {}

    public record ForgotPasswordRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Must be a valid email format")
            String email
    ) {}

    public record ResetPasswordRequest(
            @NotBlank(message = "Reset token is required")
            String resetToken,

            @NotBlank(message = "New password is required")
            @Size(min = 8, message = "Password must be at least 8 characters")
            String newPassword
    ) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Current password is required")
            String currentPassword,

            @NotBlank(message = "New password is required")
            @Size(min = 8, message = "Password must be at least 8 characters")
            String newPassword
    ) {}

    public record UpdateProfileRequest(
            @NotBlank(message = "First name is required")
            String firstName,

            @NotBlank(message = "Last name is required")
            String lastName,

            @NotBlank(message = "Institution is required")
            String institution,

            String department
    ) {}

    public record AuthResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            long expiresInMs,
            UserSummaryDto user
    ) {}

    public record UserSummaryDto(
            UUID id,
            String firstName,
            String lastName,
            String email,
            Role role,
            String institution,
            String department,
            boolean emailVerified,
            String accountStatus,
            Instant createdAt
    ) {}
}
