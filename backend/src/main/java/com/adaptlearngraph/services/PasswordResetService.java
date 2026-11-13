package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.PasswordResetEntity;
import com.adaptlearngraph.entities.domain.RegistrationFields;
import com.adaptlearngraph.exception.RegistrationFailure;
import com.adaptlearngraph.helper.RegistrationMailDelivery;
import com.adaptlearngraph.repository.AccountJpaRepository;
import com.adaptlearngraph.repository.OrganizationRegistrationJpaRepository;
import com.adaptlearngraph.repository.PasswordResetJpaRepository;
import com.adaptlearngraph.repository.RegistrationSecrets;
import com.adaptlearngraph.repository.RegistrationStore;
import com.adaptlearngraph.repository.WorkspaceAccountProfileJpaRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

public class PasswordResetService implements PasswordResetUseCase {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final AccountJpaRepository accounts;
    private final PasswordResetJpaRepository resets;
    private final WorkspaceAccountProfileJpaRepository profiles;
    private final OrganizationRegistrationJpaRepository registrations;
    private final RegistrationSecrets secrets;
    private final RegistrationStore security;
    private final RegistrationMailDelivery mail;
    private final Clock clock;
    private final String publicUrl;

    public PasswordResetService(AccountJpaRepository accounts,
                                PasswordResetJpaRepository resets,
                                WorkspaceAccountProfileJpaRepository profiles,
                                OrganizationRegistrationJpaRepository registrations,
                                RegistrationSecrets secrets,
                                RegistrationStore security,
                                RegistrationMailDelivery mail,
                                Clock clock,
                                String publicUrl) {
        this.accounts = accounts;
        this.resets = resets;
        this.profiles = profiles;
        this.registrations = registrations;
        this.secrets = secrets;
        this.security = security;
        this.mail = mail;
        this.clock = clock;
        this.publicUrl = publicUrl != null ? publicUrl.replaceAll("/+$", "") : "http://127.0.0.1:8088";
    }

    @Override
    @Transactional
    public void requestReset(String email, String clientAddress) {
        String normalized = RegistrationFields.normalizeEmail(email);
        if (normalized.isBlank() || normalized.length() > 254) {
            return;
        }
        Instant now = clock.instant();

        String rateKey = secrets.digest("password-reset-rate:" + normalized);
        var bucket = security.lockRate(rateKey, now);
        boolean sameWindow = now.isBefore(bucket.windowStartedAt().plusSeconds(3600));
        if (sameWindow && bucket.attempts() >= 5) {
            log.warn("Password reset rate limit exceeded for normalized email {}", normalized);
            return;
        }
        security.saveRate(rateKey, new RegistrationStore.RateBucket(sameWindow ? bucket.windowStartedAt() : now, sameWindow ? bucket.attempts() + 1 : 1, null));

        var accountOpt = accounts.findIdentityByEmail(normalized);
        if (accountOpt.isEmpty()) {
            log.info("Password reset requested for non-existent email {}", normalized);
            return;
        }

        var account = accountOpt.get();
        if (!Boolean.TRUE.equals(account.active())) {
            log.info("Password reset requested for inactive account {}", account.accountId());
            return;
        }

        resets.invalidateExistingForAccount(account.accountId(), now);

        String token = secrets.recoveryCode() + secrets.recoveryCode();
        String digest = secrets.digest("password-reset:" + token);
        UUID resetId = UUID.randomUUID();
        Instant expiresAt = now.plus(Duration.ofMinutes(15));

        resets.save(new PasswordResetEntity(resetId, account.accountId(), digest, expiresAt, now));

        try {
            String resetLink = publicUrl + "/reset-password#token=" + token;
            mail.sendPasswordReset(account.identifier(), resetLink, UUID.randomUUID());
            log.info("Password reset email dispatched to {}", account.identifier());
        } catch (Exception ex) {
            log.error("Failed to send password reset email to {}: {}", account.identifier(), ex.getMessage());
            throw new RegistrationFailure(RegistrationFailure.Code.SERVICE_UNAVAILABLE, "Unable to deliver password reset email. Please contact support.");
        }
        security.audit(account.accountId(), "PASSWORD_RESET_REQUESTED", "SUCCEEDED", now);
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword, String clientAddress) {
        if (token == null || token.isBlank()) {
            throw new RegistrationFailure(RegistrationFailure.Code.INVALID_INPUT, "Password reset token is required.");
        }
        RegistrationFields.validatePassword(newPassword);
        Instant now = clock.instant();

        String digest = secrets.digest("password-reset:" + token.trim());
        var resetOpt = resets.findValidByDigest(digest);
        if (resetOpt.isEmpty()) {
            throw new RegistrationFailure(RegistrationFailure.Code.INVALID_PROOF, "Password reset token is invalid or has already been used.");
        }

        var reset = resetOpt.get();
        if (now.isAfter(reset.getExpiresAt())) {
            throw new RegistrationFailure(RegistrationFailure.Code.EXPIRED_PROOF, "Password reset token has expired. Please request a new one.");
        }

        reset.consume(now);
        resets.save(reset);

        String newHash = secrets.hashPassword(newPassword);
        accounts.updatePasswordHash(reset.getAccountId(), newHash);

        profiles.revokeSessions(reset.getAccountId());
        registrations.revokeSessions(reset.getAccountId(), now);

        security.audit(reset.getAccountId(), "PASSWORD_RESET_COMPLETED", "SUCCEEDED", now);
        log.info("Password successfully reset for account {}", reset.getAccountId());
    }

    @Override
    @Transactional
    public void changePassword(UUID accountId, String currentPassword, String newPassword) {
        if (accountId == null) {
            throw new RegistrationFailure(RegistrationFailure.Code.UNAUTHENTICATED, "Authentication required.");
        }
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new RegistrationFailure(RegistrationFailure.Code.INVALID_INPUT, "Current password is required.");
        }
        RegistrationFields.validatePassword(newPassword);

        var seedOpt = accounts.findSeed(accountId);
        if (seedOpt.isEmpty()) {
            throw new RegistrationFailure(RegistrationFailure.Code.UNAUTHENTICATED, "Account not found.");
        }
        var account = seedOpt.get();
        if (!secrets.passwordMatches(currentPassword, account.passwordHash())) {
            throw new RegistrationFailure(RegistrationFailure.Code.INVALID_INPUT, "Current password does not match.");
        }

        if (currentPassword.equals(newPassword)) {
            throw new RegistrationFailure(RegistrationFailure.Code.INVALID_INPUT, "New password must be different from your current password.");
        }

        Instant now = clock.instant();
        String newHash = secrets.hashPassword(newPassword);
        accounts.updatePasswordHash(accountId, newHash);

        profiles.revokeSessions(accountId);
        registrations.revokeSessions(accountId, now);

        security.audit(accountId, "PASSWORD_CHANGED", "SUCCEEDED", now);
        log.info("Password successfully changed for account {}", accountId);
    }
}

