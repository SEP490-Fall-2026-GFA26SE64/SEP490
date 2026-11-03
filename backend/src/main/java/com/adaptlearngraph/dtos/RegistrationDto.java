package com.adaptlearngraph.dtos;

import com.adaptlearngraph.services.PlatformCatalogService;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Request and response bodies of the organization registration API. Passwords, proofs and enrollment secrets are
 * redacted from {@code toString}; the encrypted TOTP secret, password hash and session state never reach a response.
 */
public final class RegistrationDto {
    private RegistrationDto() {}

    public record SignupRequest(@NotNull @Size(max = 200) String organizationName, @Size(max = 63) String subdomain,
                                @Size(max = 100) String industry, @Size(max = 100) String headcount,
                                @NotNull @Size(max = 120) String adminName, @NotNull @Size(max = 254) String adminEmail,
                                @NotNull @Size(max = 256) String password,
                                @Size(max = PlatformCatalogService.MAX_SELECTION) List<@NotNull @Size(max = 128) String> catalogSelection) {
        @Override public String toString() { return "Signup[redacted]"; }
    }

    public record SignInRequest(@NotNull @Size(max = 254) String email, @NotNull @Size(max = 256) String password) {
        @Override public String toString() { return "SignIn[redacted]"; }
    }

    public record ProofRequest(@NotNull @Size(max = 64) String code) {
        @Override public String toString() { return "Proof[redacted]"; }
    }

    public record FieldsResponse(String organizationName, String subdomain, String industry, String headcount,
                                 String adminName, String adminEmail) {}

    public record ViewResponse(UUID registrationId, String stage, String email, FieldsResponse fields,
                               String deliveryStatus, Instant resendAvailableAt, Instant emailVerifiedAt, Instant completedAt) {}

    /** The manual TOTP secret is intentionally shown once for authenticator setup; the encrypted copy stays server-side. */
    public record EnrollmentResponse(String manualSecret, String email) {
        @Override public String toString() { return "EnrollmentView[redacted]"; }
    }

    public record CompletionResponse(ViewResponse registration, List<String> recoveryCodes) {
        @Override public String toString() { return "CompletionView[redacted]"; }
    }
}