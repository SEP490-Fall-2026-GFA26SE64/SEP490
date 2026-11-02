package com.adaptlearngraph.services;

import com.adaptlearngraph.helper.TransactionalEmail;
import com.adaptlearngraph.helper.TransactionalMailSender;
import com.adaptlearngraph.repository.OutboxEventJpaRepository;
import com.adaptlearngraph.repository.PaymentOrderJpaRepository;
import com.adaptlearngraph.repository.ProcessingJobJpaRepository;
import jakarta.mail.MessagingException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;

public final class PaymentConfirmationMailWorker {
    private final ProcessingJobJpaRepository jobs;
    private final OutboxEventJpaRepository outbox;
    private final PaymentOrderJpaRepository orders;
    private final TransactionTemplate transactions;
    private final TransactionalMailSender mail;
    private final Clock clock;
    private final String publicUrl;

    public PaymentConfirmationMailWorker(ProcessingJobJpaRepository jobs, OutboxEventJpaRepository outbox,
            PaymentOrderJpaRepository orders, TransactionTemplate transactions, TransactionalMailSender mail, Clock clock,
            String publicUrl) {
        this.jobs = jobs;
        this.outbox = outbox;
        this.orders = orders;
        this.transactions = transactions;
        this.mail = mail;
        this.clock = clock;
        this.publicUrl = publicUrl.replaceAll("/+$", "");
    }

    @Scheduled(fixedDelayString = "${registration.mail-worker.delay-ms:1000}")
    public void deliver() {
        Job job = transactions.execute(tx -> {
            var row = jobs.lockNextPaymentConfirmationEmail(clock.instant()).flatMap(jobs::mailJob).orElse(null);
            if (row == null) return null;
            var order = orders.confirmation(row.aggregateId()).orElseThrow();
            var value = new Job(row.jobId(), row.eventId(), row.attempts() + 1, order.orderId(), order.providerOrderCode(),
                    order.name(), order.priceVnd(), order.durationMonths(), order.employeeSeats(), order.paidAt(), order.kind(),
                    order.email(), UUID.randomUUID().toString(), order.slug());
            jobs.lease(value.id(), value.lease(), clock.instant().plusSeconds(120));
            return value;
        });
        if (job == null) return;
        boolean sent = false;
        String failure = null;
        if (job.attempt() > 5) failure = "DELIVERY_RETRIES_EXHAUSTED";
        else {
            var details = new LinkedHashMap<String, String>();
            details.put("Order", Long.toString(job.code()));
            details.put("Subscription", job.plan());
            details.put("Amount received", String.format(java.util.Locale.US, "%,d VND", job.amount()));
            details.put("Purchased period", job.months() + " calendar month(s)");
            details.put("Employee seats", Integer.toString(job.seats()));
            details.put("Payment confirmed", DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm z", java.util.Locale.ENGLISH)
                    .withZone(ZoneId.of("Asia/Ho_Chi_Minh")).format(job.confirmed()));
            String route = "PURCHASE".equals(job.kind()) ? "/guest/payment-result"
                    : com.adaptlearngraph.helper.WorkspaceLinks.path(job.slug(), "/admin/subscription/payment-result");
            try {
                mail.send(job.email(), TransactionalEmail.render("Payment received - Adapt-Learn-Graph",
                        "Thank you. Your subscription payment has been verified. Keep this confirmation for your records.",
                        null, details, "View payment details", publicUrl + route + "?order=" + job.order(),
                        "Sign in with the account used for this purchase. Workspace setup or renewal activation may still be processing;"
                                + " the order page shows the latest status. This confirmation is not a tax invoice."),
                        "X-Payment-Event", job.event());
                sent = true;
            } catch (MailException | MessagingException exception) {
                LoggerFactory.getLogger(getClass()).warn("Payment email delivery failed for job {} ({})",
                        job.id(), exception.getClass().getSimpleName());
                failure = "SMTP_UNAVAILABLE";
            }
        }
        String outcome = sent ? "SUCCEEDED" : "SMTP_UNAVAILABLE".equals(failure) && job.attempt() < 5 ? "RETRY" : "FAILED";
        String reason = failure;
        transactions.executeWithoutResult(tx -> {
            int updated = jobs.release(job.id(), job.lease(), outcome, reason, clock.instant().plusSeconds(30L * job.attempt()));
            if (updated == 1 && "SUCCEEDED".equals(outcome)) outbox.delivered(job.event(), clock.instant());
        });
    }

    private record Job(UUID id, UUID event, int attempt, UUID order, long code, String plan, long amount,
                       int months, int seats, Instant confirmed, String kind, String email, String lease, String slug) {
        @Override public String toString() { return "PaymentMailJob[redacted]"; }
    }
}
