package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.subscription.application.port.out.PaymentOrderStore;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.domain.BillingCalendar;
import com.adaptlearngraph.subscription.domain.PaymentOrder;
import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcPaymentOrderStore implements PaymentOrderStore {
    private static final String ORDERS = """
            SELECT o.*, i.kind, i.registration_id, i.organization_id, i.owner_account_id
            FROM platform.payment_order o JOIN platform.subscription_intent i USING (intent_id)
            """;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public JdbcPaymentOrderStore(JdbcTemplate jdbc, TransactionTemplate transactions) {
        this.jdbc = jdbc;
        this.transactions = transactions;
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
            var replay = jdbc.query(ORDERS + " WHERE o.created_by = ? AND o.idempotency_key = ?",
                    JdbcPaymentOrderStore::map, actor, command.idempotencyKey());
            if (!replay.isEmpty()) {
                String stored = jdbc.queryForObject("SELECT request_digest FROM platform.payment_order WHERE order_id = ?",
                        String.class, replay.getFirst().orderId());
                if (!fingerprint.equals(stored)) throw conflict("This command key was already used for different terms.");
                return replay.getFirst();
            }
            var intent = findIntent(context, command.organizationId());
            if (intent != null && intent.appliedOrderId() != null) throw conflict("This purchase is already applied.");
            if (intent != null && "EXCEPTION".equals(intent.state())) throw conflict("This payment context requires reconciliation.");
            PaymentOrder previous = intent == null ? null : jdbc.query(ORDERS
                    + " WHERE o.intent_id = ? ORDER BY o.attempt DESC LIMIT 1 FOR UPDATE OF o",
                    JdbcPaymentOrderStore::map, intent.id()).stream().findFirst().orElse(null);
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
            if (intent == null) {
                intent = new Intent(UUID.randomUUID(), "OPEN", null);
                jdbc.update("""
                        INSERT INTO platform.subscription_intent(intent_id, kind, registration_id, organization_id,
                            owner_account_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, intent.id(), command.organizationId() == null ? "PURCHASE" : "RENEWAL",
                        command.organizationId() == null ? context.registrationId() : null, command.organizationId(),
                        actor, Timestamp.from(now), Timestamp.from(now));
            }
            UUID id = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO platform.payment_order(order_id, intent_id, created_by, attempt,
                        plan_id, plan_version_id, name, description, price_vnd, currency, duration_months, employee_seats,
                        idempotency_key, request_digest, supersedes_order_id, created_at, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, id, intent.id(), actor, previous == null ? 1 : previous.attempt() + 1,
                    command.planId(), command.expectedVersionId(), terms.name(), terms.description(), terms.priceVnd(),
                    terms.currency(), terms.durationMonths(), terms.employeeSeats(), command.idempotencyKey(), fingerprint,
                    command.replacesOrderId(), Timestamp.from(now), Timestamp.from(now.plusSeconds(1800)));
            enqueue(id, "PAYMENT_CREATE", now);
            return find(id).orElseThrow();
        });
    }

    @Override
    public String applicationState(UUID orderId) {
        return jdbc.query("""
                SELECT CASE WHEN i.state='EXCEPTION' THEN 'EXCEPTION' ELSE coalesce(a.state,'NOT_APPLIED') END
                FROM platform.payment_order o JOIN platform.subscription_intent i USING(intent_id)
                LEFT JOIN platform.payment_application a ON a.order_id=o.order_id WHERE o.order_id=?
                """, (rs,i)->rs.getString(1),orderId).stream().findFirst().orElseThrow();
    }

    @Override
    public Optional<PaymentOrder> find(UUID orderId) {
        return jdbc.query(ORDERS + " WHERE o.order_id = ?", JdbcPaymentOrderStore::map, orderId).stream().findFirst();
    }

    @Override
    public Optional<PaymentOrder> findByProviderCode(long orderCode) {
        return jdbc.query(ORDERS + " WHERE o.provider_order_code = ?", JdbcPaymentOrderStore::map, orderCode).stream().findFirst();
    }

    @Override
    public Optional<PaymentOrder> current(SubscriptionIdentity.Context context, UUID organizationId) {
        validateContext(context, organizationId);
        return organizationId == null
                ? jdbc.query(ORDERS + " WHERE i.registration_id = ? AND i.owner_account_id = ? ORDER BY o.created_at DESC, o.attempt DESC LIMIT 1",
                        JdbcPaymentOrderStore::map, context.registrationId(), context.actor().accountId()).stream().findFirst()
                : jdbc.query(ORDERS + " WHERE i.organization_id = ? ORDER BY o.created_at DESC, o.attempt DESC LIMIT 1",
                        JdbcPaymentOrderStore::map, organizationId).stream().findFirst();
    }

    private void lockContext(SubscriptionIdentity.Context context, UUID organizationId, Instant now) {
        if (organizationId == null) {
            var rows = jdbc.query("""
                    SELECT r.account_id, r.state FROM platform.organization_registration r
                    JOIN platform.account a USING(account_id)
                    WHERE r.registration_id = ? AND a.active AND NOT r.recovery_required
                    FOR UPDATE OF r
                    """, (row, index) -> new RegistrationOwner(row.getObject("account_id", UUID.class), row.getString("state")),
                    context.registrationId());
            if (rows.isEmpty() || !rows.getFirst().account().equals(context.actor().accountId())
                    || !"REGISTERED".equals(rows.getFirst().state())) throw forbidden();
        } else {
            var statuses = jdbc.query("SELECT status FROM platform.organization WHERE organization_id = ? FOR UPDATE",
                    (row, index) -> row.getString(1), organizationId);
            if (statuses.isEmpty() || !"ACTIVE".equals(statuses.getFirst())) throw forbidden();
            Boolean ready = jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM platform.organization_workspace WHERE organization_id = ? AND setup_state = 'READY')
                    """, Boolean.class, organizationId);
            if (!Boolean.TRUE.equals(ready)) throw forbidden();
            new JdbcSubscriptionWorkspaceStore(jdbc, transactions).require(context.actor(), organizationId,
                    com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Action.RENEW, now);
        }
    }

    private Intent findIntent(SubscriptionIdentity.Context context, UUID organizationId) {
        String condition = organizationId == null ? "registration_id = ?" : "organization_id = ? AND state <> 'APPLIED'";
        return jdbc.query("SELECT intent_id, state, applied_order_id FROM platform.subscription_intent WHERE "
                        + condition + " FOR UPDATE", (row, index) -> new Intent(row.getObject("intent_id", UUID.class),
                        row.getString("state"), row.getObject("applied_order_id", UUID.class)),
                organizationId == null ? context.registrationId() : organizationId).stream().findFirst().orElse(null);
    }

    private PlanTerms lockCurrentTerms(UUID planId, UUID expectedVersionId) {
        var versions = jdbc.query("SELECT current_version_id FROM platform.subscription_plan WHERE plan_id = ? FOR UPDATE",
                (row, index) -> row.getObject(1, UUID.class), planId);
        if (versions.isEmpty()) throw new SubscriptionFailure(SubscriptionFailure.Code.NOT_FOUND, "The plan does not exist.");
        if (!versions.getFirst().equals(expectedVersionId)) throw conflict("Plan terms changed. Review and confirm the latest version.");
        return jdbc.queryForObject("SELECT * FROM platform.subscription_plan_version WHERE version_id = ?",
                (row, index) -> terms(row), expectedVersionId);
    }

    private void validateRenewal(UUID organizationId, int seats, Instant now) {
        var subscriptions = jdbc.query("SELECT subscription_id FROM platform.subscription WHERE organization_id = ? FOR UPDATE",
                (row, index) -> row.getObject(1, UUID.class), organizationId);
        if (subscriptions.isEmpty()) throw conflict("The organization subscription is not ready.");
        int future = jdbc.queryForObject("""
                SELECT count(*) FROM platform.subscription_period WHERE subscription_id = ? AND starts_at > ?
                """, Integer.class, subscriptions.getFirst(), Timestamp.from(now));
        if (future > 0) throw conflict("A paid future period is already scheduled.");
        int used = jdbc.queryForObject("""
                SELECT count(DISTINCT a.account_id) FROM platform.account a
                JOIN platform.organization_membership m ON m.account_id = a.account_id
                JOIN platform.organization_membership_role r USING (membership_id)
                WHERE m.organization_id = ? AND a.active AND m.active AND r.role_code = 'EMPLOYEE'
                """, Integer.class, organizationId);
        if (used > seats) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.CAPACITY_EXCEEDED,
                    "Reduce used Employee seats before selecting this plan.", "employeeSeats");
        }
    }

    private void enqueue(UUID orderId, String handler, Instant now) {
        Long revision = jdbc.queryForObject("UPDATE platform.payment_order SET revision = revision + 1 WHERE order_id = ? RETURNING revision",
                Long.class, orderId);
        UUID event = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO platform.outbox_event(event_id, event_type, aggregate_id, source_revision, payload, correlation_id, created_at)
                VALUES (?, 'SUBSCRIPTION_WORK', ?, ?, jsonb_build_object('orderId', ?::text), ?, ?)
                """, event, orderId, revision, orderId.toString(), UUID.randomUUID(), Timestamp.from(now));
        jdbc.update("""
                INSERT INTO platform.processing_job(job_id, event_id, handler, next_retry_at, created_at)
                VALUES (?, ?, ?, ?, ?)
                """, UUID.randomUUID(), event, handler, Timestamp.from(now), Timestamp.from(now));
    }

    private static void validateContext(SubscriptionIdentity.Context context, UUID organizationId) {
        if (context == null || context.actor() == null || !context.actor().accountActive()
                || !context.actor().mfaVerified()) throw forbidden();
        if (organizationId == null) {
            if (context.registrationId() == null) throw forbidden();
        } else if (!organizationId.equals(context.actor().organizationId())
                || !context.actor().membershipActive()
                || !context.actor().roles().contains(Role.ORGANIZATION_ADMINISTRATOR)) throw forbidden();
    }

    private static String digest(SubscriptionIdentity.Context context, Command command) {
        String data = context.actor().accountId() + ":" + context.registrationId() + ":" + command.organizationId()
                + ":" + command.planId() + ":" + command.expectedVersionId() + ":" + command.replacesOrderId();
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    static PaymentOrder map(ResultSet row, int index) throws SQLException {
        Object paid = row.getObject("observed_paid_amount");
        return new PaymentOrder(row.getObject("order_id", UUID.class), row.getObject("intent_id", UUID.class),
                row.getString("kind"), row.getObject("registration_id", UUID.class), row.getObject("organization_id", UUID.class),
                row.getObject("owner_account_id", UUID.class), row.getObject("plan_id", UUID.class),
                row.getObject("plan_version_id", UUID.class), terms(row), row.getLong("provider_order_code"),
                row.getString("payment_status"), row.getString("payment_link_id"), row.getString("checkout_url"),
                paid == null ? null : ((Number) paid).longValue(), instant(row, "created_at"), instant(row, "expires_at"),
                instant(row, "paid_at"), row.getString("failure_code"), row.getInt("attempt"));
    }

    private static PlanTerms terms(ResultSet row) throws SQLException {
        return new PlanTerms(row.getString("name"), row.getString("description"), row.getLong("price_vnd"),
                row.getString("currency"), row.getInt("duration_months"), row.getInt("employee_seats"));
    }
    private static Instant instant(ResultSet row, String field) throws SQLException {
        Timestamp value = row.getTimestamp(field);
        return value == null ? null : value.toInstant();
    }
    private static SubscriptionFailure forbidden() {
        return new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN, "The authenticated purchase or renewal context is not eligible.");
    }
    private static SubscriptionFailure conflict(String message) {
        return new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT, message);
    }
    private record Intent(UUID id, String state, UUID appliedOrderId) {}
    private record RegistrationOwner(UUID account, String state) {}
}
