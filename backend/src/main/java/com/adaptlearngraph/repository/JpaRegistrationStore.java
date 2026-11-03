package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AccountEntity;
import com.adaptlearngraph.entities.AccountRecoveryCodeEntity;
import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.entities.ProcessingJobEntity;
import com.adaptlearngraph.entities.domain.Registration;
import com.adaptlearngraph.entities.RegistrationCatalogSelectionEntity;
import com.adaptlearngraph.entities.domain.RegistrationFields;
import com.adaptlearngraph.exception.RegistrationFailure;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;

/** JPA adapter for {@link RegistrationStore}; replaces the former hand-written JDBC store with identical semantics. */
public final class JpaRegistrationStore implements RegistrationStore {
    private static final String EMAIL_EVENT = "REGISTRATION_EMAIL";

    public record Repositories(AccountJpaRepository accounts, OrganizationRegistrationJpaRepository registrations,
                               RegistrationCatalogSelectionJpaRepository catalogSelections,
                               RegistrationEmailVerificationJpaRepository emailProofs,
                               AccountTotpJpaRepository totp, AccountRecoveryCodeJpaRepository recoveryCodes,
                               RegistrationRateLimitJpaRepository rates, OutboxEventJpaRepository outbox,
                               ProcessingJobJpaRepository jobs, AuditEventJpaRepository audit,
                               PostgresAdvisoryLocks locks) {}

    private final Repositories data;
    private final TransactionTemplate transactions;

    public JpaRegistrationStore(Repositories data, TransactionTemplate transactions) {
        this.data = data;
        this.transactions = transactions;
    }

    @Override
    public <T> T transaction(Supplier<T> operation) {
        return transactions.execute(status -> operation.get());
    }

    @Override
    public void lockEmail(String normalizedEmail) {
        data.locks().lock("registration:" + normalizedEmail);
    }

    @Override
    public boolean accountExists(String normalizedEmail) {
        return data.accounts().existsByNormalizedIdentifier(normalizedEmail);
    }

    @Override
    public Optional<Registration> findByEmail(String normalizedEmail) {
        return data.registrations().findRowByEmail(normalizedEmail).map(JpaRegistrationStore::registration);
    }

    @Override
    public Registration lockRegistration(UUID accountId) {
        var locked = data.registrations().lockByAccountId(accountId);
        if (locked.isEmpty()) throw new RegistrationFailure(RegistrationFailure.Code.UNAUTHENTICATED, "Sign in to resume registration.");
        return data.registrations().findRowByAccountId(accountId).map(JpaRegistrationStore::registration).orElseThrow();
    }

    @Override
    public void insertAccount(UUID accountId, String email, String passwordHash, Instant now) {
        try {
            data.accounts().insert(new AccountEntity(accountId, null, email, email, passwordHash, now));
        } catch (DataIntegrityViolationException exception) {
            if (!PostgresErrors.isUniqueViolation(exception)) throw exception;
            throw new RegistrationFailure(RegistrationFailure.Code.SIGNUP_CONFLICT,
                    "Registration cannot be created with these details. Sign in to resume an existing registration.");
        }
    }

    @Override
    public boolean insertRegistration(UUID id, UUID accountId, RegistrationFields fields, String slug, Instant now) {
        return data.registrations().insertIfSlugFree(id, accountId, fields.organizationName(), slug, fields.industry(),
                fields.headcount(), fields.adminName(), now) == 1;
    }

    @Override
    public void saveCatalogSelection(UUID registrationId, String templateVersion, String templateSha256,
                                     List<String> nodeIds, Instant now) {
        data.catalogSelections().insert(new RegistrationCatalogSelectionEntity(registrationId, templateVersion, templateSha256,
                nodeIds, now));
    }

    @Override
    public Optional<EmailProof> emailProof(UUID accountId) {
        return data.emailProofs().findProof(accountId).map(proof -> new EmailProof(proof.hmac(), proof.generation(),
                proof.expiresAt(), proof.consumedAt(), proof.lastSentAt(), proof.windowStartedAt(), proof.sendsInWindow()));
    }

    @Override
    public void saveEmailProof(UUID accountId, EmailProof proof) {
        data.emailProofs().upsert(accountId, proof.hmac(), proof.generation(), proof.expiresAt(), proof.consumedAt(),
                proof.lastSentAt(), proof.windowStartedAt(), proof.sendsInWindow());
    }

    @Override
    public void markEmailVerified(UUID accountId, Instant now) {
        data.registrations().markEmailVerified(accountId, now);
    }

    @Override
    public void updateVerificationState(UUID accountId, Registration.State state, boolean emailBypassed,
                                        boolean mfaBypassed, Instant now) {
        int changed = data.registrations().updateVerificationState(accountId, state.name(), emailBypassed, mfaBypassed, now);
        if (changed > 0) audit(accountId, "REGISTRATION_VERIFICATION_POLICY", "SUCCEEDED", now);
    }

    @Override
    public void consumeEmailProof(UUID accountId, Instant now) {
        data.emailProofs().consume(accountId, now);
    }

    @Override
    public Optional<TotpCredential> totp(UUID accountId) {
        return data.totp().findCredential(accountId)
                .map(credential -> new TotpCredential(credential.encryptedSecret(), credential.lastUsedStep()));
    }

    @Override
    public void completeEnrollment(UUID accountId, String encryptedSecret, long step, Instant now) {
        data.totp().upsert(accountId, encryptedSecret, now, step);
        data.registrations().completeEnrollment(accountId, now);
    }

    @Override
    public void acceptTotpStep(UUID accountId, long step) {
        data.totp().acceptStep(accountId, step);
    }

    @Override
    public void replaceRecoveryCodes(UUID accountId, List<String> hashes, Instant now) {
        data.recoveryCodes().deleteByAccount(accountId);
        data.recoveryCodes().insertAll(hashes.stream().map(hash -> new AccountRecoveryCodeEntity(accountId, hash, now)).toList());
    }

    @Override
    public boolean consumeRecoveryCode(UUID accountId, String hash, Instant now) {
        return data.recoveryCodes().consume(accountId, hash, now) == 1;
    }

    @Override
    public long beginRecovery(UUID accountId, Instant now) {
        if (data.registrations().beginRecovery(accountId, now) == 0) throw new EmptyResultDataAccessException(1);
        return data.registrations().authVersion(accountId).orElseThrow(() -> new EmptyResultDataAccessException(1));
    }

    @Override
    public RateBucket lockRate(String key, Instant now) {
        data.rates().insertIfAbsent(key, now);
        data.rates().lock(key).orElseThrow(() -> new EmptyResultDataAccessException(1));
        return data.rates().findBucket(key).map(bucket -> new RateBucket(bucket.windowStartedAt(), bucket.attempts(),
                bucket.blockedUntil())).orElseThrow(() -> new EmptyResultDataAccessException(1));
    }

    @Override
    public void saveRate(String key, RateBucket bucket) {
        data.rates().save(key, bucket.windowStartedAt(), bucket.attempts(), bucket.blockedUntil());
    }

    @Override
    public void queueEmail(UUID accountId, long generation, String encryptedCode, Instant now) {
        UUID eventId = UUID.randomUUID();
        data.outbox().insert(new OutboxEventEntity(eventId, EMAIL_EVENT, accountId, generation,
                Map.of("encryptedCode", encryptedCode), UUID.randomUUID(), now));
        data.jobs().insert(new ProcessingJobEntity(UUID.randomUUID(), eventId, EMAIL_EVENT, now, now));
    }

    @Override
    public String deliveryStatus(UUID accountId) {
        return data.outbox().latestJobStatus(EMAIL_EVENT, accountId, PageRequest.of(0, 1)).stream().findFirst()
                .map(status -> switch (status) {
                    case "SUCCEEDED" -> "SENT";
                    case "FAILED", "BLOCKED" -> "FAILED";
                    default -> "PENDING";
                }).orElse("NOT_REQUESTED");
    }

    @Override
    public void audit(UUID accountId, String action, String outcome, Instant now) {
        data.audit().insert(new AuditEventEntity(UUID.randomUUID(), accountId, "registration", action, accountId, null, now,
                outcome, UUID.randomUUID()));
    }

    private static Registration registration(OrganizationRegistrationJpaRepository.Row row) {
        return new Registration(row.registrationId(), row.accountId(),
                new RegistrationFields(row.organizationName(), row.workspaceSlug(), row.industry(), row.headcount(),
                        row.adminName(), row.identifier()),
                row.passwordHash(), Boolean.TRUE.equals(row.active()), Registration.State.valueOf(row.state()),
                row.emailVerifiedAt(), row.completedAt(), row.authVersion(), Boolean.TRUE.equals(row.recoveryRequired()),
                row.createdAt(), row.updatedAt());
    }
}
