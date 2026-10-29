package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.subscription.application.port.out.SubscriptionPlanStore;
import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import com.adaptlearngraph.subscription.domain.SubscriptionPlan;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcSubscriptionPlanStore implements SubscriptionPlanStore {
    private static final String CURRENT = """
            SELECT p.code, v.* FROM platform.subscription_plan p
            JOIN platform.subscription_plan_version v ON v.version_id = p.current_version_id
            """;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public JdbcSubscriptionPlanStore(JdbcTemplate jdbc, TransactionTemplate transactions) {
        this.jdbc = jdbc;
        this.transactions = transactions;
    }

    @Override
    public List<SubscriptionPlan> currentPlans() {
        return jdbc.query(CURRENT + " ORDER BY v.employee_seats, p.code", JdbcSubscriptionPlanStore::map);
    }

    @Override
    public SubscriptionPlan update(UUID planId, UUID expectedVersionId, PlanTerms terms, UUID actorId, Instant now) {
        return transactions.execute(status -> {
            var locked = jdbc.query("SELECT plan_id FROM platform.subscription_plan WHERE plan_id = ? FOR UPDATE",
                    (row, index) -> row.getObject("plan_id", UUID.class), planId);
            if (locked.isEmpty()) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.NOT_FOUND, "The subscription plan does not exist.");
            }
            var current = jdbc.query(CURRENT + " WHERE p.plan_id = ?",
                    JdbcSubscriptionPlanStore::map, planId).getFirst();
            if (!current.versionId().equals(expectedVersionId)) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,
                        "This plan changed. Reload its current terms before saving.", "expectedVersionId");
            }
            UUID versionId = UUID.randomUUID();
            long revision = Math.addExact(current.revision(), 1);
            jdbc.update("""
                    INSERT INTO platform.subscription_plan_version(version_id, plan_id, revision,
                        name, description, price_vnd, currency, duration_months, employee_seats,
                        created_at, created_by, creation_source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLATFORM_ADMINISTRATOR')
                    """, versionId, planId, revision, terms.name(), terms.description(), terms.priceVnd(),
                    terms.currency(), terms.durationMonths(), terms.employeeSeats(), Timestamp.from(now), actorId);
            jdbc.update("UPDATE platform.subscription_plan SET current_version_id = ? WHERE plan_id = ?", versionId, planId);
            jdbc.update("""
                    INSERT INTO platform.audit_event(audit_event_id, actor_id, action, resource_id,
                        resource_revision, occurred_at, outcome, correlation_id)
                    VALUES (?, ?, 'SUBSCRIPTION_PLAN_UPDATED', ?, ?, ?, 'SUCCEEDED', ?)
                    """, UUID.randomUUID(), actorId, planId, Long.toString(revision), Timestamp.from(now), UUID.randomUUID());
            return new SubscriptionPlan(planId, current.code(), versionId, revision, terms, now, actorId);
        });
    }

    private static SubscriptionPlan map(ResultSet row, int index) throws SQLException {
        return new SubscriptionPlan(row.getObject("plan_id", UUID.class), row.getString("code"),
                row.getObject("version_id", UUID.class), row.getLong("revision"),
                new PlanTerms(row.getString("name"), row.getString("description"), row.getLong("price_vnd"),
                        row.getString("currency"), row.getInt("duration_months"), row.getInt("employee_seats")),
                row.getTimestamp("created_at").toInstant(), row.getObject("created_by", UUID.class));
    }
}
