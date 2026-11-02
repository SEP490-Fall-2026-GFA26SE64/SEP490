package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.support.JpaTestContext;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

/** Lease semantics of the JPA catalog-import store under real PostgreSQL concurrency. */
class WorkspaceCatalogImportLeaseIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static final Instant NOW = Instant.parse("2026-11-02T08:00:00Z");
    private static JpaTestContext persistence;
    private static JdbcTemplate jdbc;
    private JpaWorkspaceCatalogImportStore store;

    @BeforeAll
    static void start() {
        POSTGRES.start();
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/workspace-migration").load().migrate();
        persistence = JpaTestContext.start(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        jdbc = new JdbcTemplate(persistence.dataSource());
    }

    @AfterAll
    static void stop() {
        persistence.close();
        POSTGRES.stop();
    }

    @BeforeEach
    void clean() {
        jdbc.update("UPDATE platform.workspace_catalog_import SET state='FAILED', lease_owner=NULL, lease_until=NULL WHERE state='PENDING'");
        store = new JpaWorkspaceCatalogImportStore(persistence.bean(WorkspaceCatalogImportJpaRepository.class),
                persistence.bean(OrganizationWorkspaceJpaRepository.class), new TransactionTemplate(persistence.transactionManager()));
    }

    @Test
    void aWorkerSkipsAJobLockedByAnotherWorkerInsteadOfWaitingOrDuplicatingIt() throws Exception {
        UUID first = job(NOW.minusSeconds(20));
        UUID second = job(NOW.minusSeconds(10));
        var locked = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var pool = Executors.newSingleThreadExecutor();
        try {
            var holder = pool.submit(() -> new TransactionTemplate(persistence.transactionManager()).execute(status -> {
                var held = persistence.bean(WorkspaceCatalogImportJpaRepository.class).lockNextDue(NOW);
                locked.countDown();
                await(release);
                status.setRollbackOnly();
                return held;
            }));
            assertThat(locked.await(10, TimeUnit.SECONDS)).isTrue();
            long started = System.nanoTime();
            var claimed = store.claim(NOW).orElseThrow();
            assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(5));
            release.countDown();
            assertThat(holder.get(10, TimeUnit.SECONDS)).contains(first);
            assertThat(claimed.organizationId()).isEqualTo(second);
            assertThat(store.claim(NOW).map(WorkspaceCatalogImportStore.Job::organizationId)).contains(first);
            assertThat(store.claim(NOW)).isEmpty();
        } finally {
            release.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void twoConcurrentWorkersNeverClaimTheSameJob() throws Exception {
        for (int round = 0; round < 10; round++) {
            clean();
            var jobs = List.of(job(NOW.minusSeconds(2)), job(NOW.minusSeconds(1)));
            var barrier = new CyclicBarrier(2);
            var pool = Executors.newFixedThreadPool(2);
            try {
                var a = pool.submit(() -> { barrier.await(); return store.claim(NOW); });
                var b = pool.submit(() -> { barrier.await(); return store.claim(NOW); });
                Optional<WorkspaceCatalogImportStore.Job> first = a.get(20, TimeUnit.SECONDS);
                Optional<WorkspaceCatalogImportStore.Job> second = b.get(20, TimeUnit.SECONDS);
                assertThat(first).isPresent();
                assertThat(second).isPresent();
                assertThat(List.of(first.get().organizationId(), second.get().organizationId()))
                        .containsExactlyInAnyOrderElementsOf(jobs);
                assertThat(first.get().lease()).isNotEqualTo(second.get().lease());
            } finally {
                pool.shutdownNow();
            }
        }
    }

    @Test
    void onlyTheCurrentLeaseOwnerCanCompleteAJob() {
        UUID organization = job(NOW.minusSeconds(1));
        var stale = store.claim(NOW).orElseThrow();
        assertThat(store.claim(NOW.plusSeconds(60))).as("leased for five minutes").isEmpty();
        var current = store.claim(NOW.plus(Duration.ofMinutes(6))).orElseThrow();
        assertThat(current.attempt()).isEqualTo(2);

        store.succeed(stale, "0.11.0", "a".repeat(64), 1, 1, NOW.plus(Duration.ofMinutes(7)));
        store.fail(stale, "STALE", NOW.plus(Duration.ofMinutes(7)));
        store.retry(stale, "STALE", NOW.plus(Duration.ofHours(1)), NOW.plus(Duration.ofMinutes(7)));
        assertThat(state(organization)).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT lease_owner FROM platform.workspace_catalog_import WHERE organization_id=?",
                UUID.class, organization)).isEqualTo(current.lease());

        store.succeed(current, "0.11.0", "a".repeat(64), 3, 2, NOW.plus(Duration.ofMinutes(8)));
        assertThat(state(organization)).isEqualTo("SUCCEEDED");
    }

    private static String state(UUID organization) {
        return jdbc.queryForObject("SELECT state FROM platform.workspace_catalog_import WHERE organization_id=?", String.class,
                organization);
    }

    private static UUID job(Instant createdAt) {
        UUID organization = UUID.randomUUID();
        UUID account = UUID.randomUUID();
        UUID registration = UUID.randomUUID();
        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, ?, 'Lease Org')", organization,
                "LEASE-" + organization.toString().substring(0, 8).toUpperCase());
        jdbc.update("INSERT INTO platform.account(account_id, identifier, normalized_identifier, password_hash) VALUES (?,?,?,?)",
                account, account + "@lease.test", account + "@lease.test", "unusable");
        jdbc.update("""
                INSERT INTO platform.organization_registration(registration_id, account_id, organization_name, workspace_slug,
                    admin_name, created_at, updated_at) VALUES (?, ?, 'Lease Org', ?, 'Lease Admin', now(), now())
                """, registration, account, "lease-" + registration);
        jdbc.update("""
                INSERT INTO platform.registration_catalog_selection(registration_id, template_version, template_sha256,
                    selected_node_ids, created_at) VALUES (?, '0.11.0', ?, ARRAY['ROLE-A'], now())
                """, registration, "b".repeat(64));
        jdbc.update("""
                INSERT INTO platform.workspace_catalog_import(organization_id, registration_id, state, next_attempt_at,
                    created_at, updated_at) VALUES (?, ?, 'PENDING', ?, ?, ?)
                """, organization, registration, java.sql.Timestamp.from(createdAt), java.sql.Timestamp.from(createdAt),
                java.sql.Timestamp.from(createdAt));
        return organization;
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await(30, TimeUnit.SECONDS);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }
}
