package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.BillingCalendar;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.entities.domain.PaymentOrder;
import com.adaptlearngraph.entities.PaymentOrderEntity;
import com.adaptlearngraph.entities.domain.PlanTerms;
import com.adaptlearngraph.entities.domain.SeatAddonPricing;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;

/** JPA adapter for {@link PaymentOrderStore}: idempotent order creation serialized by registration/organization locks. */
public final class JpaPaymentOrderStore implements PaymentOrderStore {
    private static final String RENEWAL = "RENEWAL";
    private static final String SEAT_ADDON = "SEAT_ADDON";
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
            if (command.organizationId() != null && data.orders().unresolved(command.organizationId(), List.of(SEAT_ADDON))) {
                throw conflict("Finish the pending additional seat payment before renewing.");
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
            int addonSeats = 0;
            long addonAmount = 0;
            if (command.organizationId() != null) {
                UUID subscription = lockSubscription(command.organizationId());
                if (data.subscriptions().futurePeriods(subscription, now) > 0) throw conflict("A paid future period is already scheduled.");
                boolean samePlan = data.subscriptions().latestPaidPeriod(command.organizationId(), PageRequest.of(0, 1)).stream()
                        .findFirst().map(row -> command.planId().equals(row.planId())).orElse(false);
                addonSeats = samePlan ? data.subscriptions().desiredAddonSeats(subscription).orElse(0) : 0;
                if (command.expectedAddonSeats() != null && command.expectedAddonSeats() != addonSeats) {
                    throw conflict("Additional Employee seats changed. Review the renewal total.");
                }
                if (addonSeats > 0) addonAmount = SeatAddonPricing.fullPeriod(terms.priceVnd(), terms.employeeSeats(), addonSeats);
                if (data.memberships().distinctEmployeeAccounts(command.organizationId()) > terms.employeeSeats() + addonSeats) {
                    throw new SubscriptionFailure(SubscriptionFailure.Code.CAPACITY_EXCEEDED,
                            "Reduce used Employee seats before selecting this plan.", "employeeSeats");
                }
            }
            UUID intentId;
            if (intent == null) {
                intentId = UUID.randomUUID();
                data.intents().insert(new SubscriptionIntentEntity(intentId, command.organizationId() == null ? "PURCHASE" : RENEWAL,
                        command.organizationId() == null ? context.registrationId() : null, command.organizationId(), actor, now));
            } else {
                intentId = intent.intentId();
            }
            UUID id = UUID.randomUUID();
            data.orders().insert(new PaymentOrderEntity(id, intentId, actor, previous == null ? 1 : previous.attempt() + 1,
                    command.planId(), command.expectedVersionId(), terms.name(), terms.description(), terms.priceVnd() + addonAmount,
                    terms.currency(), terms.durationMonths(), terms.employeeSeats() + addonSeats, command.idempotencyKey(), fingerprint,
                    command.replacesOrderId(), now, now.plusSeconds(1800), addonSeats, addonAmount, null, null));
            enqueue(id, "PAYMENT_CREATE", now);
            return find(id).orElseThrow();
        });
    }

    @Override
    public SeatAddonQuote quoteSeatAddon(SubscriptionIdentity.Context context, UUID organizationId, String target, int seats,
            Instant clockNow) {
        Instant now = clockNow.truncatedTo(ChronoUnit.SECONDS);
        return transactions.execute(transaction -> {
            if (organizationId == null) throw forbidden();
            validateContext(context, organizationId);
            checkOrganization(context, organizationId, now);
            UUID subscription = data.subscriptions().subscriptionOf(organizationId)
                    .orElseThrow(() -> conflict("The organization subscription is not ready."));
            return price(organizationId, subscription, target, seats, clockNow);
        });
    }

    @Override
    public PaymentOrder createSeatAddon(SubscriptionIdentity.Context context, SeatAddonCommand command, Instant clockNow) {
        Instant now = clockNow.truncatedTo(ChronoUnit.SECONDS);
        return transactions.execute(transaction -> {
            if (command == null || command.organizationId() == null) throw forbidden();
            if (command.idempotencyKey() == null || command.expectedAmountVnd() == null) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, "Seats, quoted amount and idempotency key are required.");
            }
            UUID organization = command.organizationId();
            validateContext(context, organization);
            UUID actor = context.actor().accountId();
            lockContext(context, organization, now);
            String fingerprint = digest(context, command);
            var replay = data.orders().byCommandKey(actor, command.idempotencyKey());
            if (replay.isPresent()) {
                String stored = data.orders().requestDigest(replay.get().orderId()).orElseThrow();
                if (!fingerprint.equals(stored)) throw conflict("This command key was already used for different terms.");
                return replay.get().order();
            }
            UUID subscription = lockSubscription(organization);
            if (data.orders().unresolvedChange(organization)) {
                throw conflict("Finish the pending renewal or additional seat payment first.");
            }
            var quote = price(organization, subscription, command.target(), command.seats(), clockNow);
            // Prorated prices only fall over time, so a later order never charges more than the confirmed quote.
            if (quote.amountVnd() > command.expectedAmountVnd()) throw conflict("The seat price changed. Review the new quote.");
            var period = data.subscriptions().paidPeriod(subscription, quote.periodId()).orElseThrow();
            var intent = data.intents().lockUnappliedOfOrganization(organization, SEAT_ADDON).stream().findFirst()
                    .flatMap(data.intents()::open).orElse(null);
            PaymentOrder previous = intent == null ? null : data.orders().lockLatestOfIntent(intent.intentId())
                    .flatMap(data.orders()::row).map(PaymentOrderJpaRepository.Row::order).orElse(null);
            if (previous != null && (!"UNPAID_TERMINAL".equals(previous.paymentStatus())
                    || previous.observedPaidAmount() == null || previous.observedPaidAmount() != 0)) {
                throw conflict("Finish the pending renewal or additional seat payment first.");
            }
            UUID intentId = intent == null ? UUID.randomUUID() : intent.intentId();
            if (intent == null) {
                data.intents().insert(new SubscriptionIntentEntity(intentId, SEAT_ADDON, null, organization, actor, now));
            }
            UUID id = UUID.randomUUID();
            String name = period.name() + " +" + quote.seats() + " seats";
            String description = ("INCREASE".equals(quote.kind()) ? "Additional Employee seats for the current period"
                    : "Additional Employee seats for the scheduled period");
            data.orders().insert(new PaymentOrderEntity(id, intentId, actor, previous == null ? 1 : previous.attempt() + 1,
                    period.planId(), period.planVersionId(), name, description, quote.amountVnd(), period.currency(),
                    period.durationMonths(), quote.seats(), command.idempotencyKey(), fingerprint,
                    previous == null ? null : previous.orderId(), now, now.plusSeconds(1800), quote.seats(), quote.amountVnd(),
                    quote.kind(), quote.periodId()));
            enqueue(id, "PAYMENT_CREATE", now);
            return find(id).orElseThrow();
        });
    }

    @Override
    public int changeDesiredAddonSeats(SubscriptionIdentity.Context context, UUID organizationId, int desired, int expected,
            Instant clockNow) {
        Instant now = clockNow.truncatedTo(ChronoUnit.SECONDS);
        return transactions.execute(transaction -> {
            if (organizationId == null) throw forbidden();
            if (desired < 0) throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                    "Additional seats cannot be negative.", "desiredAddonSeats");
            validateContext(context, organizationId);
            lockContext(context, organizationId, now);
            UUID subscription = lockSubscription(organizationId);
            int current = data.subscriptions().desiredAddonSeats(subscription).orElse(0);
            if (current != expected) throw conflict("Additional seats changed. Review the latest subscription.");
            if (desired == current) return current;
            if (desired > current) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                        "Purchase additional seats to increase them.", "desiredAddonSeats");
            }
            if (data.orders().unresolvedChange(organizationId)) {
                throw conflict("Finish the pending renewal or additional seat payment first.");
            }
            var latest = data.subscriptions().latestPaidPeriod(organizationId, PageRequest.of(0, 1)).stream().findFirst()
                    .map(JpaSubscriptionWorkspaceStore::paidPeriod)
                    .orElseThrow(() -> conflict("The organization has no paid subscription period."));
            if (data.memberships().distinctEmployeeAccounts(organizationId) > latest.terms().employeeSeats() + desired) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.CAPACITY_EXCEEDED,
                        "Deactivate Employee accounts before reducing additional seats.", "desiredAddonSeats");
            }
            data.subscriptions().updateDesiredAddonSeats(subscription, desired);
            data.subscriptions().bumpRevision(subscription);
            data.audit().insert(new com.adaptlearngraph.entities.AuditEventEntity(UUID.randomUUID(), context.actor().accountId(),
                    null, "SUBSCRIPTION_ADDON_SEATS_REDUCED", organizationId, null, now, "SUCCEEDED", UUID.randomUUID()));
            return desired;
        });
    }

    // Periods start at the untruncated apply instant, so selection must not use the second-truncated audit time.
    private SeatAddonQuote price(UUID organizationId, UUID subscription, String target, int seats, Instant now) {
        var periods = data.subscriptions().openPeriods(organizationId, now).stream().map(JpaSubscriptionWorkspaceStore::paidPeriod).toList();
        if ("CURRENT".equals(target)) {
            var current = periods.stream().filter(p -> !p.startsAt().isAfter(now)).findFirst()
                    .orElseThrow(() -> conflict("An active subscription period is required to add seats."));
            if (!SeatAddonPricing.validQuantity(seats)) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, "Choose between "
                        + SeatAddonPricing.MIN_SEATS + " and " + SeatAddonPricing.MAX_SEATS + " seats.", "seats");
            }
            var plan = current.terms();
            return new SeatAddonQuote("CURRENT", "INCREASE", current.periodId(), plan.name(), current.startsAt(), current.endsAt(),
                    seats, SeatAddonPricing.perSeat(plan.priceVnd(), plan.employeeSeats()),
                    SeatAddonPricing.prorated(plan.priceVnd(), plan.employeeSeats(), seats, current.startsAt(), current.endsAt(), now));
        }
        if ("SCHEDULED".equals(target)) {
            var next = periods.stream().filter(p -> p.startsAt().isAfter(now)).findFirst()
                    .orElseThrow(() -> conflict("No paid future period is scheduled."));
            int shortfall = Math.max(0, data.subscriptions().desiredAddonSeats(subscription).orElse(0) - next.addonSeats());
            if (shortfall == 0) throw conflict("The scheduled period already includes every additional seat.");
            if (seats != shortfall) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                        "The scheduled period needs exactly " + shortfall + " additional seat(s).", "seats");
            }
            var plan = next.terms();
            return new SeatAddonQuote("SCHEDULED", "SHORTFALL", next.periodId(), plan.name(), next.startsAt(), next.endsAt(),
                    seats, SeatAddonPricing.perSeat(plan.priceVnd(), plan.employeeSeats()),
                    SeatAddonPricing.fullPeriod(plan.priceVnd(), plan.employeeSeats(), seats));
        }
        throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, "Choose the current or scheduled period.", "target");
    }

    private UUID lockSubscription(UUID organizationId) {
        var subscriptions = data.subscriptions().lockOfOrganization(organizationId);
        if (subscriptions.isEmpty()) throw conflict("The organization subscription is not ready.");
        return subscriptions.getFirst();
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
                : data.orders().latestOfOrganization(organizationId, RENEWAL, first))
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
            checkOrganization(context, organizationId, now);
        }
    }

    private void checkOrganization(SubscriptionIdentity.Context context, UUID organizationId, Instant now) {
        var status = data.organizations().status(organizationId);
        if (status.isEmpty() || !"ACTIVE".equals(status.get())) throw forbidden();
        if (!data.workspaces().ready(organizationId)) throw forbidden();
        workspaces.require(context.actor(), organizationId,
                com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Action.RENEW, now);
    }

    private SubscriptionIntentJpaRepository.Open findIntent(SubscriptionIdentity.Context context, UUID organizationId) {
        var locked = organizationId == null
                ? data.intents().lockOfRegistration(context.registrationId())
                : data.intents().lockUnappliedOfOrganization(organizationId, RENEWAL);
        return locked.stream().findFirst().flatMap(data.intents()::open).orElse(null);
    }

    private PlanTerms lockCurrentTerms(UUID planId, UUID expectedVersionId) {
        if (data.plans().lock(planId).isEmpty()) throw new SubscriptionFailure(SubscriptionFailure.Code.NOT_FOUND, "The plan does not exist.");
        var current = data.plans().current(planId).orElseThrow();
        if (!current.versionId().equals(expectedVersionId)) throw conflict("Plan terms changed. Review and confirm the latest version.");
        return new PlanTerms(current.name(), current.description(), current.priceVnd(), current.currency(),
                current.durationMonths(), current.employeeSeats());
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
                + ":" + command.planId() + ":" + command.expectedVersionId() + ":" + command.replacesOrderId()
                + (command.expectedAddonSeats() == null ? "" : ":addon=" + command.expectedAddonSeats());
        return sha256(value);
    }

    private static String digest(SubscriptionIdentity.Context context, SeatAddonCommand command) {
        return sha256(context.actor().accountId() + ":" + command.organizationId() + ":" + SEAT_ADDON + ":" + command.target()
                + ":" + command.seats() + ":" + command.expectedAmountVnd());
    }

    private static String sha256(String value) {
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
