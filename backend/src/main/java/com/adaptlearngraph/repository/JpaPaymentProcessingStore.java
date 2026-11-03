package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.domain.BillingCalendar;
import com.adaptlearngraph.entities.domain.IntegrationPolicy;
import com.adaptlearngraph.entities.OrganizationEntity;
import com.adaptlearngraph.entities.OrganizationMembershipEntity;
import com.adaptlearngraph.entities.OrganizationMembershipRoleEntity;
import com.adaptlearngraph.entities.OrganizationWorkspaceEntity;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.entities.domain.PaymentOrder;
import com.adaptlearngraph.entities.ProcessingJobEntity;
import com.adaptlearngraph.entities.SubscriptionEntity;
import com.adaptlearngraph.entities.SubscriptionPeriodEntity;
import com.adaptlearngraph.entities.WorkspaceCatalogImportEntity;
import com.adaptlearngraph.exception.SubscriptionFailure;
import com.adaptlearngraph.helper.PaymentGateway.Observation;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * JPA adapter for {@link PaymentProcessingStore}. Kept native for exact semantics: the SKIP LOCKED job claim, the
 * provider-reference advisory lock, ON CONFLICT idempotency of observations/confirmation events/applications, and row
 * locks of registration/organization, intent and order (in that order) before any order transition.
 */
public final class JpaPaymentProcessingStore implements PaymentProcessingStore {
    private static final Set<String> PAYMENT_HANDLERS = Set.of("PAYMENT_CREATE", "PAYMENT_RECONCILE", "PAYMENT_APPLY");
    private final SubscriptionRepositories data;
    private final TransactionTemplate transactions;
    private final PaymentOrderStore orders;
    private final IntegrationPolicy policy;

    public JpaPaymentProcessingStore(SubscriptionRepositories data, TransactionTemplate transactions, PaymentOrderStore orders) {
        this(data, transactions, orders, IntegrationPolicy.ENABLED);
    }

    public JpaPaymentProcessingStore(SubscriptionRepositories data, TransactionTemplate transactions, PaymentOrderStore orders,
            IntegrationPolicy policy) {
        this.data = data;
        this.transactions = transactions;
        this.orders = orders;
        this.policy = policy;
    }

    @Override
    public Optional<Work> claim(Instant now) {
        return transactions.execute(tx -> {
            var locked = data.jobs().lockNextPaymentJob(now);
            if (locked.isEmpty()) return Optional.<Work>empty();
            var job = data.jobs().claimed(locked.get()).orElseThrow();
            String lease = UUID.randomUUID().toString();
            data.jobs().lease(job.jobId(), lease, now.plusSeconds(120));
            return Optional.of(new Work(job.jobId(), lease, job.handler(), job.attempts() + 1,
                    orders.find(job.aggregateId()).orElseThrow()));
        });
    }

    @Override
    public void record(Observation observation, Instant now) {
        transactions.executeWithoutResult(tx -> {
            if (observation.reference() != null) data.locks().lock("payment-reference:" + observation.reference());
            var found = orders.findByProviderCode(observation.orderCode());
            if (found.isEmpty()) {
                observation(observation, null, "QUARANTINED", now);
                return;
            }
            var order = lock(found.get());
            if (observation.reference() != null
                    && data.observations().referenceUsedByAnotherOrder(observation.reference(), order.orderId())) {
                observation(observation, order.orderId(), "MISMATCH", now);
                exception(order, "PROVIDER_REFERENCE_REUSED", now);
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
                data.orders().bindPaymentLink(order.orderId(), observation.paymentLinkId());
            }
            if (observation.checkoutUrl() != null) data.orders().checkoutUrl(order.orderId(), observation.checkoutUrl());
            boolean webhookPaid = "WEBHOOK".equals(observation.source()) && "PAID".equals(observation.status());
            Long paid = webhookPaid ? observation.amount() : observation.paidAmount();
            boolean confirmed = "PAID".equals(observation.status()) && paid != null
                    && paid == order.terms().priceVnd() && "VND".equals(observation.currency());
            if (paid != null && paid > order.terms().priceVnd()) {
                exception(order, "OVERPAYMENT", now);
                return;
            }
            if (confirmed) {
                boolean replaced = data.orders().existsBySupersedesOrderId(order.orderId());
                UUID applied = data.intents().appliedOrder(order.intentId()).orElse(null);
                if (replaced || (applied != null && !applied.equals(order.orderId()))) {
                    exception(order, "CONFLICTING_LATE_PAYMENT", now);
                    return;
                }
                data.orders().markPaid(order.orderId(), paid, observation.status(), now);
                queue(order.orderId(), "PAYMENT_APPLY", now);
                UUID event = UUID.randomUUID();
                int inserted = data.outbox().insertIfAbsent(event, "SUBSCRIPTION_PAYMENT_CONFIRMED", order.orderId(), 0,
                        UUID.randomUUID(), now);
                if (inserted == 1) data.jobs().insert(new ProcessingJobEntity(UUID.randomUUID(), event, "PAYMENT_CONFIRMATION_EMAIL", now, now));
            } else if (!"EXCEPTION".equals(order.paymentStatus())) {
                boolean terminal = Set.of("CANCELLED", "EXPIRED", "FAILED").contains(observation.status())
                        && "QUERY".equals(observation.source()) && paid != null && paid == 0;
                // Never let an older zero-paid observation erase already observed funds.
                if (terminal && order.observedPaidAmount() != null && order.observedPaidAmount() > 0) terminal = false;
                Long observedPaid = order.observedPaidAmount();
                if (paid != null) observedPaid = Math.max(paid, observedPaid == null ? 0 : observedPaid);
                String state = terminal ? "UNPAID_TERMINAL" : observedPaid != null && observedPaid > 0 ? "PARTIAL" : "PENDING";
                data.orders().progress(order.orderId(), state, observedPaid, observation.status(), now,
                        "PAID".equals(observation.status()) ? "CURRENCY_EVIDENCE_REQUIRED" : null);
            }
        });
    }

    private boolean observation(Observation value, UUID orderId, String disposition, Instant now) {
        return data.observations().insertIfNew(UUID.randomUUID(), orderId, value.orderCode(), value.reference(),
                value.paymentLinkId(), value.amount(), value.currency(), value.status(), value.payloadDigest(), value.source(),
                now, value.providerPaidAt(), disposition) == 1;
    }

    private void exception(PaymentOrder order, String reason, Instant now) {
        data.orders().exception(order.orderId(), reason, now);
        data.intents().exception(order.intentId(), now);
        audit(order.ownerAccountId(), "PAYMENT_EXCEPTION", order.orderId(), reason, now);
    }

    @Override
    public void bypassForDevelopment(UUID orderId, Instant now) {
        if (policy.payosEnabled()) throw new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN, "Development payment bypass is disabled.");
        transactions.executeWithoutResult(tx -> {
            var order = lock(orders.find(orderId).orElseThrow());
            if ("DEV_BYPASSED".equals(order.paymentStatus())) return;
            if (!"CREATING".equals(order.paymentStatus()) || order.paymentLinkId() != null
                    || order.observedPaidAmount() != null || order.confirmedAt() != null) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,
                        "Only a new order without provider payment evidence can use development bypass.");
            }
            data.orders().bypass(orderId, now);
            audit(order.ownerAccountId(), "SUBSCRIPTION_DEVELOPMENT_BYPASS", orderId, "SUCCEEDED", now);
            queue(orderId, "PAYMENT_APPLY", now);
        });
    }

    @Override
    public void apply(UUID orderId, Instant now) {
        try {
            transactions.executeWithoutResult(tx -> {
                var order = lock(orders.find(orderId).orElseThrow());
                String state = data.intents().state(order.intentId())
                        .orElseThrow(() -> new org.springframework.dao.EmptyResultDataAccessException(1));
                if ("APPLIED".equals(state) || "EXCEPTION".equals(state)
                        || !("PAID".equals(order.paymentStatus())
                            || (!policy.payosEnabled() && "DEV_BYPASSED".equals(order.paymentStatus())))) return;
                UUID organization = order.organizationId();
                if (organization == null) organization = provision(order, now);
                UUID subscription = data.subscriptions().subscriptionOf(organization)
                        .orElseThrow(() -> new org.springframework.dao.EmptyResultDataAccessException(1));
                if (data.memberships().usedSeats(organization) > order.terms().employeeSeats()) {
                    data.intents().waitForCapacity(order.intentId(), now);
                    application(order, "WAITING_CAPACITY", null, null, "CAPACITY_REMEDIATION_REQUIRED", now);
                    return;
                }
                var previous = data.subscriptions().latestPeriod(subscription, PageRequest.of(0, 1)).stream().findFirst().orElse(null);
                if (previous != null && previous.startsAt().isAfter(now)) {
                    exception(order, "FUTURE_PERIOD_CONFLICT", now);
                    return;
                }
                boolean continuous = previous != null && !previous.endsAt().isBefore(now);
                Instant start = continuous ? previous.endsAt() : now;
                int anniversary = continuous ? previous.anniversaryDay() : BillingCalendar.anniversaryDay(start);
                Instant end = BillingCalendar.endOfPeriod(start, order.terms().durationMonths(), anniversary);
                UUID period = UUID.randomUUID();
                data.periods().insert(new SubscriptionPeriodEntity(period, subscription, orderId, start, end, "Asia/Ho_Chi_Minh",
                        anniversary, now));
                application(order, "APPLIED", period, now, null, now);
                data.intents().applied(order.intentId(), orderId, now);
                data.subscriptions().bumpRevision(subscription);
                data.orders().clearFailure(orderId);
                data.workspaces().markReadyIfCatalogCopied(organization, now);
                audit(order.ownerAccountId(), "DEV_BYPASSED".equals(order.paymentStatus())
                        ? "SUBSCRIPTION_DEVELOPMENT_APPLIED" : "SUBSCRIPTION_PAYMENT_APPLIED", orderId, "SUCCEEDED", now);
            });
        } catch (org.springframework.dao.DataAccessException failure) {
            org.slf4j.LoggerFactory.getLogger(getClass()).error("Payment application storage failed for order {} ({})", orderId,
                    failure.getClass().getSimpleName());
            throw new SubscriptionFailure(SubscriptionFailure.Code.SERVICE_UNAVAILABLE,
                    "Payment is recorded but subscription setup could not be committed. Processing will retry.");
        }
    }

    private UUID provision(PaymentOrder order, Instant now) {
        var existing = data.workspaces().setupOf(order.registrationId());
        if (existing.isPresent()) return existing.get().organizationId();
        var registration = data.registrations().provisioning(order.registrationId())
                .orElseThrow(() -> new org.springframework.dao.EmptyResultDataAccessException(1));
        if (!"REGISTERED".equals(registration.state()) || !order.ownerAccountId().equals(registration.accountId())) {
            throw new IllegalStateException("Invalid paid registration owner.");
        }
        UUID organization = UUID.randomUUID();
        data.organizations().insert(new OrganizationEntity(organization, registration.workspaceSlug().toUpperCase(java.util.Locale.ROOT),
                registration.organizationName(), now));
        data.accounts().bindOrganization(registration.accountId(), organization);
        UUID member = UUID.randomUUID();
        data.memberships().insert(new OrganizationMembershipEntity(member, registration.accountId(), organization, true, null, null, now));
        data.roles().insert(new OrganizationMembershipRoleEntity(member, "ORGANIZATION_ADMINISTRATOR"));
        data.workspaces().insert(new OrganizationWorkspaceEntity(UUID.randomUUID(), organization, order.registrationId(),
                registration.workspaceSlug(), now));
        if (data.catalogSelections().existsByRegistrationId(order.registrationId())) {
            data.catalogImports().insert(new WorkspaceCatalogImportEntity(organization, order.registrationId(), now));
        }
        data.subscriptions().insert(new SubscriptionEntity(UUID.randomUUID(), organization, now));
        return organization;
    }

    private void application(PaymentOrder order, String state, UUID period, Instant applied, String failure, Instant now) {
        data.applications().upsert(UUID.randomUUID(), order.orderId(), order.intentId(), state, period, applied, failure, now);
    }

    private PaymentOrder lock(PaymentOrder order) {
        if (order.organizationId() == null) data.registrations().lockById(order.registrationId());
        else data.organizations().lock(order.organizationId());
        data.intents().lock(order.intentId());
        data.orders().lock(order.orderId());
        return orders.find(order.orderId()).orElseThrow();
    }

    @Override
    public void finish(Work work, Instant now) {
        transactions.executeWithoutResult(tx -> {
            if (data.jobs().finish(work.jobId(), work.lease()) == 1) data.outbox().deliveredByJob(work.jobId(), now);
        });
    }

    @Override
    public void retry(Work work, String failureCode, Instant now) {
        transactions.executeWithoutResult(tx -> {
            int changed = data.jobs().release(work.jobId(), work.lease(), work.attempt() >= 8 ? "FAILED" : "RETRY", failureCode,
                    now.plusSeconds(Math.min(900, 5L << Math.min(work.attempt(), 8))));
            if (changed == 1) data.orders().processingFailed(work.order().orderId(), failureCode);
        });
    }

    @Override
    public void schedule(UUID orderId, Instant now) {
        transactions.executeWithoutResult(tx -> {
            var order = lock(orders.find(orderId).orElseThrow());
            data.jobs().blockFailedPaymentJobs(orderId);
            queue(orderId, "PAID".equals(order.paymentStatus()) ? "PAYMENT_APPLY"
                    : order.paymentLinkId() == null ? "PAYMENT_CREATE" : "PAYMENT_RECONCILE", now);
        });
    }

    @Override
    public void scheduleDue(Instant now) {
        data.orders().dueForCheck(now.minusSeconds(60), PageRequest.of(0, 20)).forEach(id -> schedule(id, now));
    }

    @Override
    public Optional<String> workspaceSlug(UUID organizationId) {
        return data.workspaces().slug(organizationId);
    }

    private void queue(UUID orderId, String handler, Instant now) {
        if (!PAYMENT_HANDLERS.contains(handler)) throw new IllegalArgumentException("Unsupported payment handler");
        if (data.jobs().active(orderId, handler)) return;
        data.orders().bumpRevision(orderId);
        long revision = data.orders().revision(orderId).orElseThrow();
        UUID event = UUID.randomUUID();
        data.outbox().insert(new OutboxEventEntity(event, "SUBSCRIPTION_WORK", orderId, revision, Map.of(), UUID.randomUUID(), now));
        data.jobs().insert(new ProcessingJobEntity(UUID.randomUUID(), event, handler, now, now));
    }

    private void audit(UUID actor, String action, UUID resource, String outcome, Instant now) {
        data.audit().insert(new AuditEventEntity(UUID.randomUUID(), actor, null, action, resource, null, now, outcome, UUID.randomUUID()));
    }
}
