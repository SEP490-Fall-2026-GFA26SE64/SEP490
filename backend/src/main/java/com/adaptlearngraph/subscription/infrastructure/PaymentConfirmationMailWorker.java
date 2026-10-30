package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.shared.infrastructure.mail.TransactionalEmail;
import com.adaptlearngraph.shared.infrastructure.mail.TransactionalMailSender;
import jakarta.mail.MessagingException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;

public final class PaymentConfirmationMailWorker {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final TransactionalMailSender mail;
    private final Clock clock;
    private final String publicUrl;

    public PaymentConfirmationMailWorker(JdbcTemplate jdbc, TransactionTemplate transactions,
            TransactionalMailSender mail, Clock clock, String publicUrl) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.mail = mail;
        this.clock = clock;
        this.publicUrl = publicUrl.replaceAll("/+$", "");
    }

    @Scheduled(fixedDelayString = "${registration.mail-worker.delay-ms:1000}")
    public void deliver() {
        Job job = transactions.execute(tx -> {
            var now = Timestamp.from(clock.instant());
            var jobs = jdbc.query("""
                    SELECT j.job_id,j.event_id,j.attempts,o.order_id,o.provider_order_code,o.name,o.price_vnd,
                      o.duration_months,o.employee_seats,o.paid_at,i.kind,a.identifier
                    FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                    JOIN platform.payment_order o ON o.order_id=e.aggregate_id
                    JOIN platform.subscription_intent i USING(intent_id)
                    JOIN platform.account a ON a.account_id=o.created_by
                    WHERE j.handler='PAYMENT_CONFIRMATION_EMAIL' AND o.payment_status='PAID'
                      AND ((j.status IN ('PENDING','RETRY') AND j.next_retry_at<=?)
                        OR (j.status='RUNNING' AND j.lease_expires_at<=?))
                    ORDER BY j.created_at LIMIT 1 FOR UPDATE OF j SKIP LOCKED
                    """, (rs, index) -> new Job(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class),
                    rs.getInt(3) + 1, rs.getObject(4, UUID.class), rs.getLong(5), rs.getString(6),
                    rs.getLong(7), rs.getInt(8), rs.getInt(9), rs.getTimestamp(10),
                    rs.getString(11), rs.getString(12), UUID.randomUUID().toString()), now, now);
            if (jobs.isEmpty()) return null;
            var value = jobs.getFirst();
            jdbc.update("""
                    UPDATE platform.processing_job SET status='RUNNING',attempts=attempts+1,lease_owner=?,lease_expires_at=?
                    WHERE job_id=?
                    """, value.lease(), Timestamp.from(clock.instant().plusSeconds(120)), value.id());
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
                    .withZone(ZoneId.of("Asia/Ho_Chi_Minh")).format(job.confirmed().toInstant()));
            String route = "PURCHASE".equals(job.kind()) ? "/guest/payment-result" : "/admin/subscription/payment-result";
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
            int updated = jdbc.update("""
                    UPDATE platform.processing_job SET status=?,failure_code=?,next_retry_at=?,lease_owner=NULL,lease_expires_at=NULL
                    WHERE job_id=? AND lease_owner=? AND status='RUNNING'
                    """, outcome, reason, Timestamp.from(clock.instant().plusSeconds(30L * job.attempt())), job.id(), job.lease());
            if (updated == 1 && "SUCCEEDED".equals(outcome)) jdbc.update(
                    "UPDATE platform.outbox_event SET delivered_at=? WHERE event_id=?", Timestamp.from(clock.instant()), job.event());
        });
    }

    private record Job(UUID id, UUID event, int attempt, UUID order, long code, String plan, long amount,
                       int months, int seats, Timestamp confirmed, String kind, String email, String lease) {
        @Override public String toString() { return "PaymentMailJob[redacted]"; }
    }
}
