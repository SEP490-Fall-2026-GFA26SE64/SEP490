package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.BillingCalendar;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.entities.domain.PaymentOrder;
import com.adaptlearngraph.entities.PaymentOrderEntity;
import com.adaptlearngraph.entities.domain.PlanTerms;
import com.adaptlearngraph.entities.ProcessingJobEntity;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.entities.SubscriptionIntentEntity;
import com.adaptlearngraph.exception.SubscriptionFailure;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;

/** JPA adapter for {@link PaymentOrderStore}: idempotent order creation serialized by registration/organization locks. */
public final class JpaPaymentOrderStore implements PaymentOrderStore {
    private final SubscriptionRepositories data;
    private final TransactionTemplate transactions;
    private final JpaSubscriptionWorkspaceStore workspaces;

    public JpaPaymentOrderStore(SubscriptionRepositories data, TransactionTemplate transactions) {
        this.data = data;
        this.transactions = transactions;
        this.workspaces = new JpaSubscriptionWorkspaceStore(data, transactions);
    }

    @Override
    public PaymentOrder create(SubscriptionIdentity.Context context, Command command, Instant clockNow) {
        Instant now = clockNow.truncatedTo(ChronoUnit.SECONDS);
        return transactions.execute(transaction -> {
            if (command == null || command.planId() == null || command.expectedVersionId() == null || command.idempotencyKey() == null) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                        "Plan, expected version and idempotency key are required.");
            }
            validateContext(context, command.organizationId());
            UUID actor = context.actor().accountId();
            lockContext(context, command.organizationId(), now);
            String fingerprint = digest(context, command);
            var replay = data.orders().byCommandKey(actor, command.idempotencyKey());
            if (replay.isPresent()) {
                String stored = data.orders().requestDigest(replay.get().orderId()).orElseThrow();
                if (!fingerprint.equals(stored)) throw conflict("This command key was already used for different terms.");
                return replay.get().order();
            }
            var intent = findIntent(context, command.organizationId());
            if (intent != null && intent.appliedOrderId() != null) throw conflict("This purchase is already applied.");
            if (intent != null && "EXCEPTION".equals(intent.state())) throw conflict("This payment context requires reconciliation.");
            PaymentOrder previous = intent == null ? null : data.orders().lockLatestOfIntent(intent.intentId())
                    .flatMap(data.orders()::row).map(PaymentOrderJpaRepository.Row::order).orElse(null);
            if (previous != null && (command.replacesOrderId() == null
                    || !command.replacesOrderId().equals(previous.orderId())
                    || !"UNPAID_TERMINAL".equals(previous.paymentStatus())
                    || previous.observedPaidAmount() == null || previous.observedPaidAmount() != 0)) {
                throw conflict("Reconcile the existing order before starting another payment.");
            }
            if (previous == null && command.replacesOrderId() != null) throw conflict("The replacement order does not match this purchase.");
            PlanTerms terms = lockCurrentTerms(command.planId(), command.expectedVersionId());
            BillingCalendar.endOfPeriod(now, terms.durationMonths(), BillingCalendar.anniversaryDay(now));
            if (command.organizationId() != null) validateRenewal(command.organizationId(), terms.employeeSeats(), now);
            UUID intentId;
            if (intent == null) {
                intentId = UUID.randomUUID();
                data.intents().insert(new SubscriptionIntentEntity(intentId, command.organizationId() == null ? "PURCHASE" : "RENEWAL",
                        command.organizationId() == null ? context.registrationId() : null, command.organizationId(), actor, now));
            } else {
                intentId = intent.intentId();
            }
            UUID id = UUID.randomUUID();
            data.orders().insert(new PaymentOrderEntity(id, intentId, actor, previous == null ? 1 : previous.attempt() + 1,
                    command.planId(), command.expectedVersionId(), terms.name(), terms.description(), terms.priceVnd(),
                    terms.currency(), terms.durationMonths(), terms.employeeSeats(), command.idempotencyKey(), fingerprint,
                    command.replacesOrderId(), now, now.plusSeconds(1800)));
            enqueue(id, "PAYMENT_CREATE", now);
            return find(id).orElseThrow();
        });
    }

    @Override
    public String applicationState(UUID orderId) {
        return data.orders().applicationState(orderId).orElseThrow();
    }

    @Override
    public Optional<PaymentOrder> find(UUID orderId) {
        return data.orders().row(orderId).map(PaymentOrderJpaRepository.Row::order);
    }

    @Override
    public Optional<PaymentOrder> findByProviderCode(long orderCode) {
        return data.orders().byProviderCode(orderCode).map(PaymentOrderJpaRepository.Row::order);
    }

    @Override
    public Optional<PaymentOrder> current(SubscriptionIdentity.Context context, UUID organizationId) {
        validateContext(context, organizationId);
        var first = PageRequest.of(0, 1);
        return (organizationId == null
                ? data.orders().latestOfRegistration(context.registrationId(), context.actor().accountId(), first)
                : data.orders().latestOfOrganization(organizationId, first))
                .stream().findFirst().map(PaymentOrderJpaRepository.Row::order);
    }

    private void lockContext(SubscriptionIdentity.Context context, UUID organizationId, Instant now) {
        if (organizationId == null) {
            data.registrations().lockById(context.registrationId());
            var owner = data.registrations().owner(context.registrationId())
                    .filter(row -> Boolean.TRUE.equals(row.accountActive()) && !Boolean.TRUE.equals(row.recoveryRequired()));
            if (owner.isEmpty() || !owner.get().accountId().equals(context.actor().accountId())
                    || !"REGISTERED".equals(owner.get().state())) throw forbidden();
        } else {
            data.organizations().lock(organizationId);
            var status = data.organizations().status(organizationId);
            if (status.isEmpty() || !"ACTIVE".equals(status.get())) throw forbidden();
            if (!data.workspaces().ready(organizationId)) throw forbidden();
            workspaces.require(context.actor(), organizationId,
                    com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Action.RENEW, now);
        }
    }

    private SubscriptionIntentJpaRepository.Open findIntent(SubscriptionIdentity.Context context, UUID organizationId) {
        var locked = organizationId == null
                ? data.intents().lockOfRegistration(context.registrationId())
                : data.intents().lockUnappliedOfOrganization(organizationId);
        return locked.stream().findFirst().flatMap(data.intents()::open).orElse(null);
    }

    private PlanTerms lockCurrentTerms(UUID planId, UUID expectedVersionId) {
        if (data.plans().lock(planId).isEmpty()) throw new SubscriptionFailure(SubscriptionFailure.Code.NOT_FOUND, "The plan does not exist.");
        var current = data.plans().current(planId).orElseThrow();
        if (!current.versionId().equals(expectedVersionId)) throw conflict("Plan terms changed. Review and confirm the latest version.");
        return new PlanTerms(current.name(), current.description(), current.priceVnd(), current.currency(),
                current.durationMonths(), current.employeeSeats());
    }

    private void validateRenewal(UUID organizationId, int seats, Instant now) {
        var subscriptions = data.subscriptions().lockOfOrganization(organizationId);
        if (subscriptions.isEmpty()) throw conflict("The organization subscription is not ready.");
        if (data.subscriptions().futurePeriods(subscriptions.getFirst(), now) > 0) throw conflict("A paid future period is already scheduled.");
        if (data.memberships().distinctEmployeeAccounts(organizationId) > seats) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.CAPACITY_EXCEEDED,
                    "Reduce used Employee seats before selecting this plan.", "employeeSeats");
        }
    }

    private void enqueue(UUID orderId, String handler, Instant now) {
        data.orders().bumpRevision(orderId);
        long revision = data.orders().revision(orderId).orElseThrow();
        UUID event = UUID.randomUUID();
        data.outbox().insert(new OutboxEventEntity(event, "SUBSCRIPTION_WORK", orderId, revision,
                Map.of("orderId", orderId.toString()), UUID.randomUUID(), now));
        data.jobs().insert(new ProcessingJobEntity(UUID.randomUUID(), event, handler, now, now));
    }

    private static void validateContext(SubscriptionIdentity.Context context, UUID organizationId) {
        if (context == null || context.actor() == null || !context.actor().accountActive()
                || !context.actor().satisfiesMfa()) throw forbidden();
        if (organizationId == null) {
            if (context.registrationId() == null) throw forbidden();
        } else if (!organizationId.equals(context.actor().organizationId())
                || !context.actor().membershipActive()
                || !context.actor().roles().contains(Role.ORGANIZATION_ADMINISTRATOR)) throw forbidden();
    }

    private static String digest(SubscriptionIdentity.Context context, Command command) {
        String value = context.actor().accountId() + ":" + context.registrationId() + ":" + command.organizationId()
                + ":" + command.planId() + ":" + command.expectedVersionId() + ":" + command.replacesOrderId();
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private static SubscriptionFailure forbidden() {
        return new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN, "The authenticated purchase or renewal context is not eligible.");
    }

    private static SubscriptionFailure conflict(String message) {
        return new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT, message);
    }
}
