package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.application.port.out.RegistrationStore;
import com.adaptlearngraph.identity.domain.Registration;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.identity.domain.RegistrationFields;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcRegistrationStore implements RegistrationStore {
    private static final String SELECT_REGISTRATION = """
            SELECT r.*, a.identifier, a.password_hash, a.active
            FROM platform.organization_registration r
            JOIN platform.account a ON a.account_id = r.account_id
            """;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public JdbcRegistrationStore(JdbcTemplate jdbc, TransactionTemplate transactions) {
        this.jdbc = jdbc;
        this.transactions = transactions;
    }

    @Override
    public <T> T transaction(Supplier<T> operation) {
        return transactions.execute(status -> operation.get());
    }

    @Override
    public void lockEmail(String normalizedEmail) {
        RowCallbackHandler lockResult = result -> {
            // The SELECT acquires the transaction-scoped lock; its return value is unused.
        };
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
                lockResult, "registration:" + normalizedEmail);
    }

    @Override
    public boolean accountExists(String email) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM platform.account WHERE normalized_identifier = ?)", Boolean.class, email));
    }

    @Override
    public Optional<Registration> findByEmail(String email) {
        return jdbc.query(SELECT_REGISTRATION + " WHERE a.normalized_identifier = ?", this::registration, email)
                .stream().findFirst();
    }

    @Override
    public Registration lockRegistration(UUID accountId) {
        return jdbc.query(SELECT_REGISTRATION + " WHERE r.account_id = ? FOR UPDATE OF r, a",
                this::registration, accountId).stream().findFirst().orElseThrow(() ->
                new RegistrationFailure(RegistrationFailure.Code.UNAUTHENTICATED, "Sign in to resume registration."));
    }

    @Override
    public void insertAccount(UUID accountId, String email, String passwordHash, Instant now) {
        try {
            jdbc.update("""
                    INSERT INTO platform.account(account_id, identifier, normalized_identifier, password_hash, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """, accountId, email, email, passwordHash, timestamp(now));
        } catch (DuplicateKeyException exception) {
            throw new RegistrationFailure(RegistrationFailure.Code.SIGNUP_CONFLICT,
                    "Registration cannot be created with these details. Sign in to resume an existing registration.");
        }
    }

    @Override
    public boolean insertRegistration(UUID id, UUID accountId, RegistrationFields fields, String slug, Instant now) {
        return jdbc.update("""
                INSERT INTO platform.organization_registration(
                    registration_id, account_id, organization_name, workspace_slug, industry, headcount,
                    admin_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (workspace_slug) DO NOTHING
                """, id, accountId, fields.organizationName(), slug, fields.industry(), fields.headcount(),
                fields.adminName(), timestamp(now), timestamp(now)) == 1;
    }

    @Override
    public Optional<EmailProof> emailProof(UUID accountId) {
        return jdbc.query("""
                SELECT * FROM platform.registration_email_verification WHERE account_id = ?
                """, (rs, row) -> new EmailProof(rs.getString("code_hmac"), rs.getLong("generation"),
                instant(rs, "expires_at"), instant(rs, "consumed_at"), instant(rs, "last_sent_at"),
                instant(rs, "window_started_at"), rs.getInt("sends_in_window")), accountId).stream().findFirst();
    }

    @Override
    public void saveEmailProof(UUID accountId, EmailProof proof) {
        jdbc.update("""
                INSERT INTO platform.registration_email_verification(
                    account_id, code_hmac, generation, expires_at, consumed_at, last_sent_at, window_started_at, sends_in_window)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (account_id) DO UPDATE SET
                    code_hmac = excluded.code_hmac, generation = excluded.generation,
                    expires_at = excluded.expires_at, consumed_at = excluded.consumed_at,
                    last_sent_at = excluded.last_sent_at, window_started_at = excluded.window_started_at,
                    sends_in_window = excluded.sends_in_window
                """, accountId, proof.hmac(), proof.generation(), timestamp(proof.expiresAt()),
                timestamp(proof.consumedAt()), timestamp(proof.lastSentAt()),
                timestamp(proof.windowStartedAt()), proof.sendsInWindow());
    }

    @Override
    public void markEmailVerified(UUID accountId, Instant now) {
        jdbc.update("""
                UPDATE platform.organization_registration
                SET state = 'MFA_PENDING', email_verified_at = coalesce(email_verified_at, ?), updated_at = ?
                WHERE account_id = ? AND state <> 'REGISTERED'
                """, timestamp(now), timestamp(now), accountId);
    }

    @Override
    public void consumeEmailProof(UUID accountId, Instant now) {
        jdbc.update("UPDATE platform.registration_email_verification SET consumed_at = ? WHERE account_id = ?",
                timestamp(now), accountId);
    }

    @Override
    public Optional<TotpCredential> totp(UUID accountId) {
        return jdbc.query("SELECT encrypted_secret, last_used_step FROM platform.account_totp WHERE account_id = ?",
                (rs, row) -> new TotpCredential(rs.getString(1), rs.getLong(2)), accountId).stream().findFirst();
    }

    @Override
    public void completeEnrollment(UUID accountId, String secret, long step, Instant now) {
        jdbc.update("""
                INSERT INTO platform.account_totp(account_id, encrypted_secret, enabled_at, last_used_step)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (account_id) DO UPDATE SET encrypted_secret = excluded.encrypted_secret,
                    enabled_at = excluded.enabled_at, last_used_step = excluded.last_used_step
                """, accountId, secret, timestamp(now), step);
        jdbc.update("""
                UPDATE platform.organization_registration
                SET state = 'REGISTERED', completed_at = coalesce(completed_at, ?), updated_at = ?,
                    recovery_required = false, auth_version = auth_version + 1
                WHERE account_id = ?
                """, timestamp(now), timestamp(now), accountId);
    }

    @Override
    public void acceptTotpStep(UUID accountId, long step) {
        jdbc.update("UPDATE platform.account_totp SET last_used_step = ? WHERE account_id = ?", step, accountId);
    }

    @Override
    public void replaceRecoveryCodes(UUID accountId, List<String> hashes, Instant now) {
        jdbc.update("DELETE FROM platform.account_recovery_code WHERE account_id = ?", accountId);
        for (String hash : hashes) {
            jdbc.update("""
                    INSERT INTO platform.account_recovery_code(account_id, code_hash, created_at) VALUES (?, ?, ?)
                    """, accountId, hash, timestamp(now));
        }
    }

    @Override
    public boolean consumeRecoveryCode(UUID accountId, String hash, Instant now) {
        return jdbc.update("""
                UPDATE platform.account_recovery_code SET consumed_at = ?
                WHERE account_id = ? AND code_hash = ? AND consumed_at IS NULL
                """, timestamp(now), accountId, hash) == 1;
    }

    @Override
    public long beginRecovery(UUID accountId, Instant now) {
        return jdbc.queryForObject("""
                UPDATE platform.organization_registration SET recovery_required = true,
                    auth_version = auth_version + 1, updated_at = ?
                WHERE account_id = ? RETURNING auth_version
                """, Long.class, timestamp(now), accountId);
    }

    @Override
    public RateBucket lockRate(String key, Instant now) {
        jdbc.update("""
                INSERT INTO platform.registration_rate_limit(bucket_key, window_started_at, attempts)
                VALUES (?, ?, 0) ON CONFLICT DO NOTHING
                """, key, timestamp(now));
        return jdbc.queryForObject("""
                SELECT window_started_at, attempts, blocked_until
                FROM platform.registration_rate_limit WHERE bucket_key = ? FOR UPDATE
                """, (rs, row) -> new RateBucket(instant(rs, "window_started_at"), rs.getInt("attempts"),
                instant(rs, "blocked_until")), key);
    }

    @Override
    public void saveRate(String key, RateBucket bucket) {
        jdbc.update("""
                UPDATE platform.registration_rate_limit
                SET window_started_at = ?, attempts = ?, blocked_until = ? WHERE bucket_key = ?
                """, timestamp(bucket.windowStartedAt()), bucket.attempts(), timestamp(bucket.blockedUntil()), key);
    }

    @Override
    public void queueEmail(UUID accountId, long generation, String encryptedCode, Instant now) {
        UUID eventId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO platform.outbox_event(event_id, event_type, aggregate_id, source_revision,
                    payload, correlation_id, created_at)
                VALUES (?, 'REGISTRATION_EMAIL', ?, ?,
                    jsonb_build_object('encryptedCode', CAST(? AS text)), ?, ?)
                """, eventId, accountId, generation, encryptedCode, UUID.randomUUID(), timestamp(now));
        jdbc.update("""
                INSERT INTO platform.processing_job(job_id, event_id, handler, next_retry_at, created_at)
                VALUES (?, ?, 'REGISTRATION_EMAIL', ?, ?)
                """, UUID.randomUUID(), eventId, timestamp(now), timestamp(now));
    }

    @Override
    public String deliveryStatus(UUID accountId) {
        return jdbc.query("""
                SELECT j.status FROM platform.outbox_event e
                JOIN platform.processing_job j ON j.event_id = e.event_id AND j.handler = 'REGISTRATION_EMAIL'
                WHERE e.event_type = 'REGISTRATION_EMAIL' AND e.aggregate_id = ?
                ORDER BY e.source_revision DESC LIMIT 1
                """, (rs, row) -> switch (rs.getString(1)) {
                    case "SUCCEEDED" -> "SENT";
                    case "FAILED", "BLOCKED" -> "FAILED";
                    default -> "PENDING";
                }, accountId).stream().findFirst().orElse("NOT_REQUESTED");
    }

    @Override
    public void audit(UUID accountId, String action, String outcome, Instant now) {
        jdbc.update("""
                INSERT INTO platform.audit_event(audit_event_id, actor_id, service_name, action,
                    resource_id, occurred_at, outcome, correlation_id)
                VALUES (?, ?, 'registration', ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), accountId, action, accountId, timestamp(now), outcome, UUID.randomUUID());
    }

    private Registration registration(ResultSet rs, int row) throws SQLException {
        return new Registration(rs.getObject("registration_id", UUID.class), rs.getObject("account_id", UUID.class),
                new RegistrationFields(rs.getString("organization_name"), rs.getString("workspace_slug"),
                        rs.getString("industry"), rs.getString("headcount"),
                        rs.getString("admin_name"), rs.getString("identifier")),
                rs.getString("password_hash"), rs.getBoolean("active"), Registration.State.valueOf(rs.getString("state")),
                instant(rs, "email_verified_at"), instant(rs, "completed_at"), rs.getLong("auth_version"),
                rs.getBoolean("recovery_required"), instant(rs, "created_at"), instant(rs, "updated_at"));
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private static Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }
}
