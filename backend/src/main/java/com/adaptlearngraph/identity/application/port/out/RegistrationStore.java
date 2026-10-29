package com.adaptlearngraph.identity.application.port.out;

import com.adaptlearngraph.identity.domain.Registration;
import com.adaptlearngraph.identity.domain.RegistrationFields;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

public interface RegistrationStore {
    <T> T transaction(Supplier<T> operation);
    void lockEmail(String normalizedEmail);
    boolean accountExists(String normalizedEmail);
    Optional<Registration> findByEmail(String normalizedEmail);
    Registration lockRegistration(UUID accountId);
    void insertAccount(UUID accountId, String email, String passwordHash, Instant now);
    boolean insertRegistration(UUID id, UUID accountId, RegistrationFields fields, String slug, Instant now);
    Optional<EmailProof> emailProof(UUID accountId);
    void saveEmailProof(UUID accountId, EmailProof proof);
    void markEmailVerified(UUID accountId, Instant now);
    void consumeEmailProof(UUID accountId, Instant now);
    Optional<TotpCredential> totp(UUID accountId);
    void completeEnrollment(UUID accountId, String encryptedSecret, long step, Instant now);
    void acceptTotpStep(UUID accountId, long step);
    void replaceRecoveryCodes(UUID accountId, List<String> hashes, Instant now);
    boolean consumeRecoveryCode(UUID accountId, String hash, Instant now);
    long beginRecovery(UUID accountId, Instant now);
    RateBucket lockRate(String key, Instant now);
    void saveRate(String key, RateBucket bucket);
    void queueEmail(UUID accountId, long generation, String encryptedCode, Instant now);
    String deliveryStatus(UUID accountId);
    void audit(UUID accountId, String action, String outcome, Instant now);

    record EmailProof(String hmac, long generation, Instant expiresAt, Instant consumedAt,
                      Instant lastSentAt, Instant windowStartedAt, int sendsInWindow) {}
    record TotpCredential(String encryptedSecret, long lastUsedStep) {}
    record RateBucket(Instant windowStartedAt, int attempts, Instant blockedUntil) {}
}
