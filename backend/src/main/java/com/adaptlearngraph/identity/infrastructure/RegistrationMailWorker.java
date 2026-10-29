package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import jakarta.mail.MessagingException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Scheduled;

public final class RegistrationMailWorker {
    private static final Logger LOG = LoggerFactory.getLogger(RegistrationMailWorker.class);
    private final JdbcTemplate jdbc;
    private final RegistrationStore store;
    private final RegistrationSecrets secrets;
    private final RegistrationMailDelivery mail;
    private final Clock clock;
    private final String leaseOwner = UUID.randomUUID().toString();

    public RegistrationMailWorker(JdbcTemplate jdbc, RegistrationStore store, RegistrationSecrets secrets,
                                  RegistrationMailDelivery mail, Clock clock) {
        this.jdbc = jdbc;
        this.store = store;
        this.secrets = secrets;
        this.mail = mail;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${registration.mail-worker.delay-ms:1000}")
    public void deliverNext() {
        Optional<Job> next = store.transaction(() -> claim(clock.instant()));
        if (next.isEmpty()) return;
        Job job = next.get();
        var proof = store.emailProof(job.accountId());
        if (proof.isEmpty() || proof.get().generation() != job.generation()
                || proof.get().consumedAt() != null || !clock.instant().isBefore(proof.get().expiresAt())) {
            finish(job, false, false, "SUPERSEDED_OR_EXPIRED");
            return;
        }
        try {
            String code = secrets.decrypt(job.encryptedCode(), "email:" + job.accountId() + ":" + job.generation());
            mail.send(job.recipient(), code, job.eventId());
            finish(job, true, false, null);
        } catch (MailException | RegistrationFailure exception) {
            LOG.warn("Registration email delivery failed for job {} ({})", job.id(), exception.getClass().getSimpleName());
            finish(job, false, job.attempts() < 5, "SMTP_UNAVAILABLE");
        } catch (MessagingException exception) {
            LOG.error("Registration email construction failed for job {} ({})", job.id(), exception.getClass().getSimpleName());
            finish(job, false, false, "MAIL_CONFIGURATION_INVALID");
        }
    }

    private Optional<Job> claim(Instant now) {
        var jobs = jdbc.query("""
                SELECT j.job_id, j.event_id, j.attempts, e.aggregate_id, e.source_revision,
                    e.payload ->> 'encryptedCode' AS encrypted_code, a.identifier
                FROM platform.processing_job j
                JOIN platform.outbox_event e ON e.event_id = j.event_id
                JOIN platform.account a ON a.account_id = e.aggregate_id
                WHERE j.handler = 'REGISTRATION_EMAIL'
                    AND ((j.status IN ('PENDING', 'RETRY') AND j.attempts < 5 AND j.next_retry_at <= ?)
                        OR (j.status = 'RUNNING' AND j.lease_expires_at <= ?))
                ORDER BY j.created_at LIMIT 1 FOR UPDATE OF j SKIP LOCKED
                """, (rs, row) -> new Job(rs.getObject("job_id", UUID.class), rs.getObject("event_id", UUID.class),
                rs.getObject("aggregate_id", UUID.class), rs.getLong("source_revision"),
                rs.getString("encrypted_code"), rs.getString("identifier"), rs.getInt("attempts") + 1),
                Timestamp.from(now), Timestamp.from(now));
        if (jobs.isEmpty()) return Optional.empty();
        Job job = jobs.getFirst();
        if (job.attempts() > 5) {
            jdbc.update("""
                    UPDATE platform.processing_job SET status = 'FAILED', failure_code = 'DELIVERY_RETRIES_EXHAUSTED',
                        lease_owner = NULL, lease_expires_at = NULL WHERE job_id = ?
                    """, job.id());
            store.audit(job.accountId(), "REGISTRATION_EMAIL_DELIVERY", "FAILED", now);
            return Optional.empty();
        }
        jdbc.update("""
                UPDATE platform.processing_job SET status = 'RUNNING', attempts = attempts + 1,
                    lease_owner = ?, lease_expires_at = ? WHERE job_id = ?
                """, leaseOwner, Timestamp.from(now.plusSeconds(120)), job.id());
        return Optional.of(job);
    }

    private void finish(Job job, boolean sent, boolean retry, String failureCode) {
        store.transaction(() -> {
            Instant now = clock.instant();
            int changed = jdbc.update("""
                    UPDATE platform.processing_job SET status = ?, failure_code = ?, next_retry_at = ?,
                        lease_owner = NULL, lease_expires_at = NULL
                    WHERE job_id = ? AND status = 'RUNNING' AND lease_owner = ?
                    """, sent ? "SUCCEEDED" : retry ? "RETRY" : "FAILED", failureCode,
                    Timestamp.from(now.plusSeconds(15L << Math.min(job.attempts(), 5))), job.id(), leaseOwner);
            if (changed == 1) {
                if (sent) jdbc.update("UPDATE platform.outbox_event SET delivered_at = ? WHERE event_id = ?",
                        Timestamp.from(now), job.eventId());
                store.audit(job.accountId(), "REGISTRATION_EMAIL_DELIVERY",
                        sent ? "SMTP_ACCEPTED" : retry ? "RETRY" : "FAILED", now);
            }
            return null;
        });
    }

    private record Job(UUID id, UUID eventId, UUID accountId, long generation,
                       String encryptedCode, String recipient, int attempts) {
        @Override public String toString() { return "MailJob[id=" + id + "]"; }
    }
}
