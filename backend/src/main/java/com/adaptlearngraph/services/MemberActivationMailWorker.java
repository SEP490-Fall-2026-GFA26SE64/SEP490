package com.adaptlearngraph.services;

import com.adaptlearngraph.exception.RegistrationFailure;
import com.adaptlearngraph.helper.RegistrationMailDelivery;
import com.adaptlearngraph.repository.ProcessingJobJpaRepository;
import com.adaptlearngraph.repository.RegistrationSecrets;
import com.adaptlearngraph.repository.WorkspaceActivationJpaRepository;
import jakarta.mail.MessagingException;
import java.time.Clock;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;

public final class MemberActivationMailWorker {
    private final ProcessingJobJpaRepository jobs;
    private final WorkspaceActivationJpaRepository activations;
    private final TransactionTemplate transactions;
    private final RegistrationSecrets secrets;
    private final RegistrationMailDelivery mail;
    private final Clock clock;
    private final String publicUrl;

    public MemberActivationMailWorker(ProcessingJobJpaRepository jobs, WorkspaceActivationJpaRepository activations,
            TransactionTemplate transactions, RegistrationSecrets secrets, RegistrationMailDelivery mail, Clock clock, String publicUrl) {
        this.jobs = jobs;
        this.activations = activations;
        this.transactions = transactions;
        this.secrets = secrets;
        this.mail = mail;
        this.clock = clock;
        this.publicUrl = publicUrl.replaceAll("/+$", "");
    }

    @Scheduled(fixedDelayString = "${registration.mail-worker.delay-ms:1000}")
    public void deliver() {
        var job = transactions.execute(tx -> {
            var now = clock.instant();
            var row = jobs.lockNextActivationEmail(now).flatMap(jobs::mailJob).orElse(null);
            if (row == null) return null;
            var activation = activations.delivery(row.aggregateId()).orElseThrow();
            boolean eligible = activation.generation().equals(row.sourceRevision()) && activation.consumedAt() == null
                    && activation.expiresAt().isAfter(now);
            var value = new Job(row.jobId(), row.eventId(), row.attempts() + 1, row.aggregateId(), row.sourceRevision(),
                    (String) row.payload().get("encryptedToken"), activation.email(), eligible, UUID.randomUUID().toString());
            jobs.lease(value.id(), value.lease(), clock.instant().plusSeconds(120));
            return value;
        });
        if (job == null) return;
        boolean sent = false;
        String failure = null;
        if (!job.eligible()) failure = "SUPERSEDED_OR_EXPIRED";
        else if (job.attempt() > 5) failure = "DELIVERY_RETRIES_EXHAUSTED";
        else {
            try {
                String token = secrets.decrypt(job.encrypted(), "activation:" + job.activation() + ":" + job.generation());
                mail.sendActivation(job.email(), publicUrl + "/activate#token=" + token, job.event());
                sent = true;
            } catch (MailException | MessagingException | RegistrationFailure exception) {
                LoggerFactory.getLogger(getClass()).warn("Member activation delivery failed for job {} ({})", job.id(),
                        exception.getClass().getSimpleName());
                failure = "SMTP_UNAVAILABLE";
            }
        }
        String status = sent ? "SUCCEEDED" : "SMTP_UNAVAILABLE".equals(failure) && job.attempt() < 5 ? "RETRY" : "FAILED";
        jobs.release(job.id(), job.lease(), status, failure, clock.instant().plusSeconds(30L * job.attempt()));
    }

    private record Job(UUID id, UUID event, int attempt, UUID activation, long generation, String encrypted, String email,
                       boolean eligible, String lease) {
        @Override public String toString() { return "ActivationMailJob[redacted]"; }
    }
}
