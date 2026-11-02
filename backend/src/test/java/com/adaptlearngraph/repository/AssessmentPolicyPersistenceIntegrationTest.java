package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.entities.OrganizationAssessmentPolicy.Values;
import com.adaptlearngraph.helper.AssessmentPolicyJson;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.adaptlearngraph.support.JpaTestContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

/** Organization assessment policy persistence: immutable versions, fenced activation, receipts and tenant isolation. */
class AssessmentPolicyPersistenceIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static JpaTestContext persistence;
    private static JdbcTemplate jdbc;
    private static JpaAssessmentPolicyStore store;

    @BeforeAll
    static void start() {
        POSTGRES.start();
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/workspace-migration").load().migrate();
        persistence = JpaTestContext.start(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        jdbc = new JdbcTemplate(persistence.dataSource());
        store = new JpaAssessmentPolicyStore(persistence.bean(AssessmentPolicyJpaRepository.class),
                persistence.bean(AssessmentPolicyCommandJpaRepository.class),
                persistence.bean(AssessmentPolicyActivationEventJpaRepository.class),
                new PostgresAdvisoryLocks(persistence.bean(EntityManager.class)), persistence.transactionManager(),
                new AssessmentPolicyJson(new ObjectMapper()));
    }

    @AfterAll
    static void stop() {
        persistence.close();
        POSTGRES.stop();
    }

    @Test
    void versionsAreIdempotentByConfigurationAndActivationIsRevisionFenced() {
        UUID org = organization();
        UUID actor = account(org);
        var first = store.locked(org, () -> store.save(org, actor, new Values(0.3, 0.25, 0.4, 1.0)));
        var replay = store.locked(org, () -> store.save(org, actor, new Values(0.3, 0.25, 0.4, 1.0)));
        var second = store.locked(org, () -> store.save(org, actor, new Values(0.35, 0.2, 0.5, 2.0)));
        assertThat(first.noOp()).isFalse();
        assertThat(replay.noOp()).isTrue();
        assertThat(replay.version().pin().versionId()).isEqualTo(first.version().pin().versionId());
        assertThat(first.version().version()).isEqualTo(1);
        assertThat(second.version().version()).isEqualTo(2);
        assertThat(first.version().createdAt()).isNotNull();

        assertThat(store.read(org).activationRevision()).isZero();
        assertThatThrownBy(() -> store.locked(org, () -> store.requireEffective(org))).isInstanceOf(Failure.class);
        var active = activate(org, actor, first.version().pin().versionId(), 0);
        assertThat(active.activationRevision()).isEqualTo(1);
        assertThat(activate(org, actor, first.version().pin().versionId(), 1)
                .activationRevision()).as("re-activating the current version is a no-op").isEqualTo(1);
        assertThatThrownBy(() -> activate(org, actor, second.version().pin().versionId(), 0))
                .isInstanceOf(Failure.class).hasMessageContaining("STALE_POLICY_ACTIVATION");
        activate(org, actor, second.version().pin().versionId(), 1);
        assertThat(store.locked(org, () -> store.requireEffective(org)).versionId()).isEqualTo(second.version().pin().versionId());
        assertThat(jdbc.queryForList("""
                SELECT activation_revision, new_policy_version_id,
                    coalesce(old_policy_version_id::text, 'NONE') AS old_version FROM platform.baseline_assessment_policy_activation_event
                WHERE organization_id=? ORDER BY activation_revision
                """, org)).containsExactly(
                Map.of("activation_revision", 1L, "new_policy_version_id", first.version().pin().versionId(), "old_version", "NONE"),
                Map.of("activation_revision", 2L, "old_version", first.version().pin().versionId().toString(),
                        "new_policy_version_id", second.version().pin().versionId()));

        var page = store.list(org, 0, 1);
        assertThat(page.total()).isEqualTo(2);
        assertThat(page.items()).extracting(v -> v.version()).containsExactly(2L);
        assertThat(store.list(org, 1, 1).items()).extracting(v -> v.version()).containsExactly(1L);
    }

    @Test
    void receiptsAreExactAndAudited() {
        UUID org = organization();
        UUID actor = account(org);
        UUID key = UUID.randomUUID();
        String hash = "c".repeat(64);
        store.locked(org, () -> { store.receipt(org, actor, key, "SAVE_VERSION", hash, Map.of("version", 1)); return null; });
        assertThat(store.receipt(org, actor, key, hash)).contains("{\"version\": 1}");
        assertThatThrownBy(() -> store.receipt(org, actor, key, "d".repeat(64))).isInstanceOf(Failure.class)
                .hasMessageContaining("IDEMPOTENCY_CONFLICT");
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM platform.audit_event WHERE service_name='adaptive-baseline-policy' AND resource_id=? AND correlation_id=?
                """, Integer.class, org, key)).isEqualTo(1);
    }

    @Test
    void anotherOrganizationCannotSeeOrActivateForeignVersions() {
        UUID orgA = organization();
        UUID orgB = organization();
        UUID actorA = account(orgA);
        UUID actorB = account(orgB);
        var foreign = store.locked(orgA, () -> store.save(orgA, actorA, new Values(0.3, 0.25, 0.4, 1.0)));
        assertThat(store.list(orgB, 0, 10).items()).isEmpty();
        assertThatThrownBy(() -> store.locked(orgB, () -> store.activate(orgB, actorB, UUID.randomUUID(),
                foreign.version().pin().versionId(), 0))).isInstanceOf(Failure.class).hasMessageContaining("POLICY_VERSION_NOT_FOUND");
        var own = store.locked(orgB, () -> store.save(orgB, actorB, new Values(0.3, 0.25, 0.4, 1.0)));
        assertThat(own.noOp()).as("same configuration in another organization is a separate version").isFalse();
        assertThat(store.receipt(orgB, actorA, UUID.randomUUID(), "e".repeat(64))).isEmpty();
    }

    /** As AssessmentPolicyService: the activation and its exact ACTIVATE receipt commit together. */
    private static com.adaptlearngraph.entities.OrganizationAssessmentPolicy.State activate(UUID org, UUID actor, UUID version, long revision) {
        UUID key = UUID.randomUUID();
        return store.locked(org, () -> {
            var result = store.activate(org, actor, key, version, revision);
            store.receipt(org, actor, key, "ACTIVATE", "f".repeat(64), Map.of("revision", result.activationRevision()));
            return result;
        });
    }

    private static UUID organization() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, ?, 'Policy Org')", id,
                "POLICY-" + id.toString().substring(0, 8).toUpperCase());
        return id;
    }

    private static UUID account(UUID organization) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO platform.account(account_id, organization_id, identifier, normalized_identifier, password_hash) VALUES (?,?,?,?,?)",
                id, organization, id + "@policy.test", id + "@policy.test", "unusable");
        return id;
    }
}
