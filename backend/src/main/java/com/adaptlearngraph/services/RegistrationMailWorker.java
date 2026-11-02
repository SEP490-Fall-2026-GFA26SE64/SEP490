package com.adaptlearngraph.services;

import com.adaptlearngraph.exception.RegistrationFailure;
import com.adaptlearngraph.helper.RegistrationMailDelivery;
import com.adaptlearngraph.repository.AccountJpaRepository;
import com.adaptlearngraph.repository.OutboxEventJpaRepository;
import com.adaptlearngraph.repository.ProcessingJobJpaRepository;
import com.adaptlearngraph.repository.RegistrationSecrets;
import com.adaptlearngraph.repository.RegistrationStore;
import jakarta.mail.MessagingException;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Scheduled;

public final class RegistrationMailWorker {
    private static final Logger LOG = LoggerFactory.getLogger(RegistrationMailWorker.class);
    private final ProcessingJobJpaRepository jobs;
    private final OutboxEventJpaRepository outbox;
    private final AccountJpaRepository accounts;
    private final RegistrationStore store;
    private final RegistrationSecrets secrets;
    private final RegistrationMailDelivery mail;
    private final Clock clock;
    private final String leaseOwner = UUID.randomUUID().toString();

    public RegistrationMailWorker(ProcessingJobJpaRepository jobs, OutboxEventJpaRepository outbox, AccountJpaRepository accounts,
                                  RegistrationStore store, RegistrationSecrets secrets, RegistrationMailDelivery mail, Clock clock) {
        this.jobs = jobs;
        this.outbox = outbox;
        this.accounts = accounts;
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
        var locked = jobs.lockNextRegistrationEmail(now).flatMap(jobs::mailJob);
        if (locked.isEmpty()) return Optional.empty();
        var row = locked.get();
        Job job = new Job(row.jobId(), row.eventId(), row.aggregateId(), row.sourceRevision(),
                (String) row.payload().get("encryptedCode"), accounts.identifier(row.aggregateId()).orElseThrow(), row.attempts() + 1);
        if (job.attempts() > 5) {
            jobs.failUnleased(job.id(), "DELIVERY_RETRIES_EXHAUSTED");
            store.audit(job.accountId(), "REGISTRATION_EMAIL_DELIVERY", "FAILED", now);
            return Optional.empty();
        }
        jobs.lease(job.id(), leaseOwner, now.plusSeconds(120));
        return Optional.of(job);
    }

    private void finish(Job job, boolean sent, boolean retry, String failureCode) {
        store.transaction(() -> {
            Instant now = clock.instant();
            int changed = jobs.release(job.id(), leaseOwner, sent ? "SUCCEEDED" : retry ? "RETRY" : "FAILED", failureCode,
                    now.plusSeconds(15L << Math.min(job.attempts(), 5)));
            if (changed == 1) {
                if (sent) outbox.delivered(job.eventId(), now);
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
