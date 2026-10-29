package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.subscription.application.port.out.PaymentGateway.Observation;
import com.adaptlearngraph.subscription.application.port.out.PaymentOrderStore;
import com.adaptlearngraph.subscription.application.port.out.PaymentProcessingStore;
import com.adaptlearngraph.subscription.domain.BillingCalendar;
import com.adaptlearngraph.subscription.domain.PaymentOrder;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcPaymentProcessingStore implements PaymentProcessingStore {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final PaymentOrderStore orders;

    public JdbcPaymentProcessingStore(JdbcTemplate jdbc, TransactionTemplate transactions, PaymentOrderStore orders) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.orders = orders;
    }

    @Override
    public Optional<Work> claim(Instant now) {
        return transactions.execute(tx -> {
            var jobs = jdbc.query("""
                    SELECT j.job_id, j.handler, j.attempts, e.aggregate_id FROM platform.processing_job j
                    JOIN platform.outbox_event e USING(event_id)
                    WHERE j.handler IN ('PAYMENT_CREATE','PAYMENT_RECONCILE','PAYMENT_APPLY')
                      AND ((j.status IN ('PENDING','RETRY') AND j.next_retry_at <= ?)
                        OR (j.status = 'RUNNING' AND j.lease_expires_at <= ?))
                    ORDER BY j.next_retry_at, j.created_at LIMIT 1 FOR UPDATE OF j SKIP LOCKED
                    """, (rs, i) -> new Job(rs.getObject(1, UUID.class), rs.getString(2), rs.getInt(3),
                    rs.getObject(4, UUID.class)), time(now), time(now));
            if (jobs.isEmpty()) return Optional.empty();
            var job = jobs.getFirst();
            String lease = UUID.randomUUID().toString();
            jdbc.update("""
                    UPDATE platform.processing_job SET status='RUNNING', attempts=attempts+1,
                    lease_owner=?, lease_expires_at=? WHERE job_id=?
                    """, lease, time(now.plusSeconds(120)), job.id());
            return Optional.of(new Work(job.id(), lease, job.handler(), job.attempts() + 1,
                    orders.find(job.orderId()).orElseThrow()));
        });
    }

    @Override
    public void record(Observation observation, Instant now) {
        transactions.executeWithoutResult(tx -> {
            if(observation.reference()!=null) {
                org.springframework.jdbc.core.RowCallbackHandler acquired=result->{};
                jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",acquired,"payment-reference:"+observation.reference());
            }
            var found = orders.findByProviderCode(observation.orderCode());
            if (found.isEmpty()) {
                observation(observation, null, "QUARANTINED", now);
                return;
            }
            var order = lock(found.get());
            if(observation.reference()!=null && Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM platform.payment_observation
                      WHERE provider_reference=? AND order_id IS NOT NULL AND order_id<>?)
                    """,Boolean.class,observation.reference(),order.orderId()))) {
                observation(observation,order.orderId(),"MISMATCH",now);
                exception(order,"PROVIDER_REFERENCE_REUSED",now);
                return;
            }
            boolean linkMismatch = order.paymentLinkId() != null && !order.paymentLinkId().equals(observation.paymentLinkId());
            boolean currencyMismatch = observation.currency() != null && !order.terms().currency().equals(observation.currency());
            boolean amountMismatch = observation.amount() == null || observation.amount() < 0
                    || (!"WEBHOOK".equals(observation.source()) && observation.amount() != order.terms().priceVnd())
                    || ("WEBHOOK".equals(observation.source()) && observation.amount() > order.terms().priceVnd());
            if (linkMismatch || currencyMismatch || amountMismatch) {
                observation(observation, order.orderId(), "MISMATCH", now);
                exception(order, "PROVIDER_TERMS_MISMATCH", now);
                return;
            }
            if (!observation(observation, order.orderId(), "RECORDED", now)) return;
            if ("PAID".equals(order.paymentStatus())) return;
            // Only a signed currency-bearing fact establishes the link/currency binding.
            if (order.paymentLinkId() == null && "VND".equals(observation.currency())) {
                jdbc.update("UPDATE platform.payment_order SET payment_link_id=? WHERE order_id=?",
                        observation.paymentLinkId(), order.orderId());
            }
            if (observation.checkoutUrl() != null) jdbc.update(
                    "UPDATE platform.payment_order SET checkout_url=? WHERE order_id=?", observation.checkoutUrl(), order.orderId());
            boolean webhookPaid = "WEBHOOK".equals(observation.source()) && "PAID".equals(observation.status());
            Long paid = webhookPaid ? observation.amount() : observation.paidAmount();
            boolean confirmed = "PAID".equals(observation.status()) && paid != null
                    && paid == order.terms().priceVnd() && "VND".equals(observation.currency());
            if (paid != null && paid > order.terms().priceVnd()) {
                exception(order, "OVERPAYMENT", now);
                return;
            }
            if (confirmed) {
                boolean replaced = Boolean.TRUE.equals(jdbc.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM platform.payment_order WHERE supersedes_order_id=?)", Boolean.class, order.orderId()));
                UUID applied = jdbc.queryForObject("SELECT applied_order_id FROM platform.subscription_intent WHERE intent_id=?",
                        UUID.class, order.intentId());
                if (replaced || (applied != null && !applied.equals(order.orderId()))) {
                    exception(order, "CONFLICTING_LATE_PAYMENT", now);
                    return;
                }
                jdbc.update("""
                        UPDATE platform.payment_order SET payment_status='PAID', observed_paid_amount=?,
                            paid_at=?, provider_status=?, last_checked_at=?, failure_code=NULL WHERE order_id=?
                        """, paid, time(now), observation.status(), time(now), order.orderId());
                queue(order.orderId(), "PAYMENT_APPLY", now);
                UUID event = UUID.randomUUID();
                int inserted = jdbc.update("""
                        INSERT INTO platform.outbox_event(event_id,event_type,aggregate_id,source_revision,payload,correlation_id,created_at)
                        VALUES (?,'SUBSCRIPTION_PAYMENT_CONFIRMED',?,0,'{}'::jsonb,?,?)
                        ON CONFLICT(event_type,aggregate_id,source_revision) DO NOTHING
                        """, event, order.orderId(), UUID.randomUUID(), time(now));
                if (inserted == 1) jdbc.update("""
                        INSERT INTO platform.processing_job(job_id,event_id,handler,next_retry_at,created_at)
                        VALUES (?,?,'PAYMENT_CONFIRMATION_EMAIL',?,?)
                        """, UUID.randomUUID(), event, time(now), time(now));
            } else if (!"EXCEPTION".equals(order.paymentStatus())) {
                boolean terminal = java.util.Set.of("CANCELLED", "EXPIRED", "FAILED").contains(observation.status())
                        && "QUERY".equals(observation.source()) && paid != null && paid == 0;
                // Never let an older zero-paid observation erase already observed funds.
                if (terminal && order.observedPaidAmount() != null && order.observedPaidAmount() > 0) terminal = false;
                Long observedPaid = order.observedPaidAmount();
                if (paid != null) observedPaid = Math.max(paid, observedPaid == null ? 0 : observedPaid);
                String state = terminal ? "UNPAID_TERMINAL" : observedPaid != null && observedPaid > 0 ? "PARTIAL" : "PENDING";
                jdbc.update("""
                        UPDATE platform.payment_order SET payment_status=?, observed_paid_amount=?, provider_status=?,
                            last_checked_at=?, failure_code=? WHERE order_id=?
                        """, state, observedPaid, observation.status(), time(now),
                        "PAID".equals(observation.status()) ? "CURRENCY_EVIDENCE_REQUIRED" : null, order.orderId());
            }
        });
    }

    private boolean observation(Observation value, UUID orderId, String disposition, Instant now) {
        return jdbc.update("""
                INSERT INTO platform.payment_observation(observation_id,order_id,provider_order_code,provider_reference,
                  payment_link_id,amount,currency,observed_status,payload_digest,source,received_at,provider_paid_at,disposition)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source,provider_order_code,payload_digest) DO NOTHING
                """, UUID.randomUUID(), orderId, value.orderCode(), value.reference(), value.paymentLinkId(), value.amount(),
                value.currency(), value.status(), value.payloadDigest(), value.source(), time(now),
                time(value.providerPaidAt()), disposition) == 1;
    }

    private void exception(PaymentOrder order, String reason, Instant now) {
        jdbc.update("""
                UPDATE platform.payment_order SET payment_status=CASE WHEN payment_status='PAID' THEN 'PAID' ELSE 'EXCEPTION' END,
                  failure_code=?,last_checked_at=? WHERE order_id=?
                """, reason, time(now), order.orderId());
        jdbc.update("""
                UPDATE platform.subscription_intent SET state='EXCEPTION',updated_at=?
                WHERE intent_id=? AND state <> 'APPLIED'
                """, time(now), order.intentId());
        audit(order.ownerAccountId(), "PAYMENT_EXCEPTION", order.orderId(), reason, now);
    }

    @Override
    public void apply(UUID orderId, Instant now) {
        try {
            transactions.executeWithoutResult(tx -> {
            var order = lock(orders.find(orderId).orElseThrow());
            String state = jdbc.queryForObject("SELECT state FROM platform.subscription_intent WHERE intent_id=?", String.class, order.intentId());
            if ("APPLIED".equals(state) || "EXCEPTION".equals(state) || !"PAID".equals(order.paymentStatus())) return;
            UUID organization = order.organizationId();
            if (organization == null) organization = provision(order, now);
            UUID subscription = jdbc.queryForObject("SELECT subscription_id FROM platform.subscription WHERE organization_id=?",
                    UUID.class, organization);
            if (usedSeats(organization) > order.terms().employeeSeats()) {
                jdbc.update("UPDATE platform.subscription_intent SET state='WAITING_CAPACITY',updated_at=? WHERE intent_id=?",
                        time(now), order.intentId());
                application(order, "WAITING_CAPACITY", null, null, "CAPACITY_REMEDIATION_REQUIRED", now);
                return;
            }
            var periods = jdbc.query("""
                    SELECT starts_at,ends_at,anniversary_day FROM platform.subscription_period
                    WHERE subscription_id=? ORDER BY ends_at DESC LIMIT 1
                    """, (rs, i) -> new Period(rs.getTimestamp(1).toInstant(), rs.getTimestamp(2).toInstant(), rs.getInt(3)), subscription);
            if (!periods.isEmpty() && periods.getFirst().start().isAfter(now)) {
                exception(order, "FUTURE_PERIOD_CONFLICT", now);
                return;
            }
            var previous = periods.isEmpty() ? null : periods.getFirst();
            boolean continuous = previous != null && !previous.end().isBefore(now);
            Instant start = continuous ? previous.end() : now;
            int anniversary = continuous ? previous.anniversary() : BillingCalendar.anniversaryDay(start);
            Instant end = BillingCalendar.endOfPeriod(start, order.terms().durationMonths(), anniversary);
            UUID period = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO platform.subscription_period(period_id,subscription_id,order_id,starts_at,ends_at,
                      billing_zone,anniversary_day,created_at) VALUES (?,?,?,?,?,'Asia/Ho_Chi_Minh',?,?)
                    """, period, subscription, orderId, time(start), time(end), anniversary, time(now));
            application(order, "APPLIED", period, now, null, now);
            jdbc.update("""
                    UPDATE platform.subscription_intent SET state='APPLIED',applied_order_id=?,updated_at=? WHERE intent_id=?
                    """, orderId, time(now), order.intentId());
            jdbc.update("UPDATE platform.subscription SET revision=revision+1 WHERE subscription_id=?", subscription);
            jdbc.update("UPDATE platform.payment_order SET failure_code=NULL WHERE order_id=?",orderId);
            jdbc.update("""
                    UPDATE platform.organization_workspace SET setup_state='READY',ready_at=coalesce(ready_at,?),failure_code=NULL
                    WHERE organization_id=? AND setup_state <> 'READY'
                    """, time(now), organization);
            audit(order.ownerAccountId(), "SUBSCRIPTION_PAYMENT_APPLIED", orderId, "SUCCEEDED", now);
            });
        } catch(org.springframework.dao.DataAccessException failure) {
            org.slf4j.LoggerFactory.getLogger(getClass()).error("Payment application storage failed for order {} ({})",orderId,failure.getClass().getSimpleName());
            throw new com.adaptlearngraph.subscription.domain.SubscriptionFailure(
                    com.adaptlearngraph.subscription.domain.SubscriptionFailure.Code.SERVICE_UNAVAILABLE,
                    "Payment is recorded but subscription setup could not be committed. Processing will retry.");
        }
    }

    private UUID provision(PaymentOrder order, Instant now) {
        var existing = jdbc.query("SELECT organization_id FROM platform.organization_workspace WHERE registration_id=?",
                (rs, i) -> rs.getObject(1, UUID.class), order.registrationId());
        if (!existing.isEmpty()) return existing.getFirst();
        var registration = jdbc.queryForObject("""
                SELECT organization_name,workspace_slug,account_id,state FROM platform.organization_registration WHERE registration_id=?
                """, (rs, i) -> new Registration(rs.getString(1), rs.getString(2), rs.getObject(3, UUID.class), rs.getString(4)),
                order.registrationId());
        if (registration == null || !"REGISTERED".equals(registration.state())
                || !order.ownerAccountId().equals(registration.account())) throw new IllegalStateException("Invalid paid registration owner.");
        UUID organization = UUID.randomUUID();
        jdbc.update("INSERT INTO platform.organization(organization_id,code,name,created_at) VALUES (?,?,?,?)",
                organization, registration.slug().toUpperCase(java.util.Locale.ROOT), registration.name(), time(now));
        jdbc.update("""
                UPDATE platform.account SET organization_id=? WHERE account_id=? AND organization_id IS NULL
                """, organization, registration.account());
        UUID member = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,created_at,updated_at)
                VALUES (?,?,?,true,?,?)
                """, member, registration.account(), organization, time(now), time(now));
        jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?,'ORGANIZATION_ADMINISTRATOR')", member);
        jdbc.update("""
                INSERT INTO platform.organization_workspace(workspace_id,organization_id,registration_id,slug,setup_state,created_at)
                VALUES (?,?,?,?,'PROVISIONING',?)
                """, UUID.randomUUID(), organization, order.registrationId(), registration.slug(), time(now));
        jdbc.update("INSERT INTO platform.subscription(subscription_id,organization_id,created_at) VALUES (?,?,?)",
                UUID.randomUUID(), organization, time(now));
        return organization;
    }

    private void application(PaymentOrder order, String state, UUID period, Instant applied, String failure, Instant now) {
        jdbc.update("""
                INSERT INTO platform.payment_application(application_id,order_id,intent_id,state,period_id,applied_at,failure_code,updated_at)
                VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(intent_id) DO UPDATE SET state=excluded.state,period_id=excluded.period_id,
                  applied_at=excluded.applied_at,failure_code=excluded.failure_code,updated_at=excluded.updated_at
                """, UUID.randomUUID(), order.orderId(), order.intentId(), state, period, time(applied), failure, time(now));
    }

    private PaymentOrder lock(PaymentOrder order) {
        if (order.organizationId() == null) jdbc.query(
                "SELECT registration_id FROM platform.organization_registration WHERE registration_id=? FOR UPDATE",
                (rs, i) -> rs.getObject(1), order.registrationId());
        else jdbc.query("SELECT organization_id FROM platform.organization WHERE organization_id=? FOR UPDATE",
                (rs, i) -> rs.getObject(1), order.organizationId());
        jdbc.query("SELECT intent_id FROM platform.subscription_intent WHERE intent_id=? FOR UPDATE",
                (rs, i) -> rs.getObject(1), order.intentId());
        jdbc.query("SELECT order_id FROM platform.payment_order WHERE order_id=? FOR UPDATE",
                (rs, i) -> rs.getObject(1), order.orderId());
        return orders.find(order.orderId()).orElseThrow();
    }

    @Override
    public void finish(Work work, Instant now) {
        transactions.executeWithoutResult(tx -> {
            int changed = jdbc.update("""
                    UPDATE platform.processing_job SET status='SUCCEEDED',lease_owner=NULL,lease_expires_at=NULL,failure_code=NULL
                    WHERE job_id=? AND lease_owner=? AND status='RUNNING'
                    """, work.jobId(), work.lease());
            if (changed == 1) jdbc.update("""
                    UPDATE platform.outbox_event SET delivered_at=? WHERE event_id=
                      (SELECT event_id FROM platform.processing_job WHERE job_id=?)
                    """, time(now), work.jobId());
        });
    }

    @Override
    public void retry(Work work, String failureCode, Instant now) {
        transactions.executeWithoutResult(tx -> {
            int changed = jdbc.update("""
                    UPDATE platform.processing_job SET status=?,failure_code=?,next_retry_at=?,lease_owner=NULL,lease_expires_at=NULL
                    WHERE job_id=? AND lease_owner=? AND status='RUNNING'
                    """, work.attempt() >= 8 ? "FAILED" : "RETRY", failureCode,
                    time(now.plusSeconds(Math.min(900, 5L << Math.min(work.attempt(), 8)))), work.jobId(), work.lease());
            if (changed == 1) jdbc.update("""
                    UPDATE platform.payment_order SET failure_code=?,
                      payment_status=CASE WHEN payment_status='CREATING' THEN 'UNKNOWN' ELSE payment_status END
                    WHERE order_id=? AND NOT EXISTS(
                      SELECT 1 FROM platform.payment_application a
                      WHERE a.order_id=platform.payment_order.order_id AND a.state='APPLIED')
                    """, failureCode, work.order().orderId());
        });
    }

    @Override
    public void schedule(UUID orderId, Instant now) {
        transactions.executeWithoutResult(tx -> {
            var order = lock(orders.find(orderId).orElseThrow());
            jdbc.update("""
                    UPDATE platform.processing_job SET status='BLOCKED'
                    WHERE status='FAILED' AND handler IN ('PAYMENT_CREATE','PAYMENT_RECONCILE','PAYMENT_APPLY')
                      AND event_id IN (SELECT event_id FROM platform.outbox_event WHERE aggregate_id=?)
                    """,orderId);
            queue(orderId, "PAID".equals(order.paymentStatus()) ? "PAYMENT_APPLY" :
                    order.paymentLinkId() == null ? "PAYMENT_CREATE" : "PAYMENT_RECONCILE", now);
        });
    }

    @Override
    public void scheduleDue(Instant now) {
        var ids = jdbc.query("""
                SELECT o.order_id FROM platform.payment_order o JOIN platform.subscription_intent i USING(intent_id)
                WHERE i.state IN ('OPEN','WAITING_CAPACITY') AND o.payment_status IN ('PENDING','UNKNOWN','PARTIAL','PAID')
                  AND (o.last_checked_at IS NULL OR o.last_checked_at < ?)
                  AND NOT EXISTS(SELECT 1 FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                    WHERE e.aggregate_id=o.order_id AND j.handler IN ('PAYMENT_CREATE','PAYMENT_RECONCILE','PAYMENT_APPLY')
                      AND j.status IN ('PENDING','RUNNING','RETRY','FAILED'))
                ORDER BY o.created_at LIMIT 20
                """, (rs, i) -> rs.getObject(1, UUID.class), time(now.minusSeconds(60)));
        ids.forEach(id -> schedule(id, now));
    }

    private void queue(UUID orderId, String handler, Instant now) {
        boolean queued = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                  WHERE e.aggregate_id=? AND j.handler=? AND j.status IN ('PENDING','RUNNING','RETRY'))
                """, Boolean.class, orderId, handler));
        if (queued) return;
        long revision = jdbc.queryForObject("UPDATE platform.payment_order SET revision=revision+1 WHERE order_id=? RETURNING revision",
                Long.class, orderId);
        UUID event = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO platform.outbox_event(event_id,event_type,aggregate_id,source_revision,payload,correlation_id,created_at)
                VALUES (?,'SUBSCRIPTION_WORK',?,?,'{}'::jsonb,?,?)
                """, event, orderId, revision, UUID.randomUUID(), time(now));
        jdbc.update("INSERT INTO platform.processing_job(job_id,event_id,handler,next_retry_at,created_at) VALUES (?,?,?,?,?)",
                UUID.randomUUID(), event, handler, time(now), time(now));
    }

    private int usedSeats(UUID organization) {
        return jdbc.queryForObject("""
                SELECT count(*) FROM platform.organization_membership m JOIN platform.account a USING(account_id)
                JOIN platform.organization_membership_role r USING(membership_id)
                WHERE m.organization_id=? AND m.active AND a.active AND r.role_code='EMPLOYEE'
                """, Integer.class, organization);
    }
    private void audit(UUID actor, String action, UUID resource, String outcome, Instant now) {
        jdbc.update("""
                INSERT INTO platform.audit_event(audit_event_id,actor_id,action,resource_id,occurred_at,outcome,correlation_id)
                VALUES (?,?,?,?,?,?,?)
                """, UUID.randomUUID(), actor, action, resource, time(now), outcome, UUID.randomUUID());
    }
    private static Timestamp time(Instant value) { return value == null ? null : Timestamp.from(value); }
    private record Job(UUID id, String handler, int attempts, UUID orderId) {}
    private record Period(Instant start, Instant end, int anniversary) {}
    private record Registration(String name, String slug, UUID account, String state) {}
}
