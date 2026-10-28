package com.adaptlearngraph.subscription.infrastructure;

import static org.junit.jupiter.api.Assertions.*;

import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

class SubscriptionPlanPostgresIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static JdbcTemplate jdbc;
    private static JdbcSubscriptionPlanStore store;
    private static UUID administrator;

    @BeforeAll
    static void start() {
        POSTGRES.start();
        var source = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(source).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(source);
        store = new JdbcSubscriptionPlanStore(jdbc, new TransactionTemplate(new DataSourceTransactionManager(source)));
        administrator = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO platform.account(account_id, identifier, normalized_identifier, password_hash)
                VALUES (?, 'plan-editor@example.test', 'plan-editor@example.test', 'test-only-unusable')
                """, administrator);
    }

    @AfterAll
    static void stop() { POSTGRES.stop(); }

    @Test
    void editsAllCommercialFieldsAndPreservesHistoricalVersionAndAudit() {
        var before = store.currentPlans().stream().filter(plan -> plan.code().equals("starter")).findFirst().orElseThrow();
        var now = Instant.parse("2026-10-22T12:00:00Z");
        var terms = new PlanTerms("Updated Starter", "Updated description", 5_000_000, "VND", 2, 25);
        var updated = store.update(before.planId(), before.versionId(), terms, administrator, now);
        assertEquals(before.planId(), updated.planId());
        assertNotEquals(before.versionId(), updated.versionId());
        assertEquals(before.revision() + 1, updated.revision());
        assertEquals(terms, updated.terms());
        assertEquals(administrator, updated.createdBy());
        assertEquals(now, updated.createdAt());
        assertEquals(updated, store.currentPlans().stream()
                .filter(plan -> plan.planId().equals(before.planId())).findFirst().orElseThrow());
        var historical = jdbc.queryForObject("""
                SELECT * FROM platform.subscription_plan_version WHERE version_id = ?
                """, (row, index) -> new PlanTerms(row.getString("name"), row.getString("description"),
                row.getLong("price_vnd"), row.getString("currency"), row.getInt("duration_months"),
                row.getInt("employee_seats")), before.versionId());
        assertEquals(before.terms(), historical);
        assertEquals(1, jdbc.queryForObject("""
                SELECT count(*) FROM platform.audit_event WHERE actor_id = ?
                    AND action = 'SUBSCRIPTION_PLAN_UPDATED' AND resource_id = ?
                    AND resource_revision = ? AND occurred_at = ? AND outcome = 'SUCCEEDED'
                """, Integer.class, administrator, before.planId(), Long.toString(updated.revision()), Timestamp.from(now)));
    }

    @Test
    void concurrentExpectedVersionEditsHaveOneWinnerAndOneExplicitConflict() throws Exception {
        var before = store.currentPlans().stream().filter(plan -> plan.code().equals("growth")).findFirst().orElseThrow();
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var operation = (java.util.concurrent.Callable<Boolean>) () -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Concurrency test did not start.");
                try {
                    store.update(before.planId(), before.versionId(),
                            new PlanTerms("Concurrent Growth", "Updated description", 12_250_000, "VND", 1, 50),
                            administrator, Instant.now());
                    return true;
                } catch (SubscriptionFailure failure) {
                    assertEquals(SubscriptionFailure.Code.CONFLICT, failure.code());
                    return false;
                }
            };
            var first = executor.submit(operation);
            var second = executor.submit(operation);
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            assertNotEquals(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS));
        }
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM platform.subscription_plan_version WHERE plan_id = ?",
                Integer.class, before.planId()));
    }

    @Test
    void missingPlanIsNotReplacedByACreatedPlan() {
        var failure = assertThrows(SubscriptionFailure.class, () ->
                store.update(UUID.randomUUID(), UUID.randomUUID(),
                        new PlanTerms("Not created", "Description", 1, "VND", 1, 1), administrator, Instant.now()));
        assertEquals(SubscriptionFailure.Code.NOT_FOUND, failure.code());
        assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM platform.subscription_plan", Integer.class));
    }
}
