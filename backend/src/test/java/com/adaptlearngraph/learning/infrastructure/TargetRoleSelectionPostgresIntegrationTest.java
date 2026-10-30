package com.adaptlearngraph.learning.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import com.adaptlearngraph.catalog.domain.CareerTrack;
import com.adaptlearngraph.catalog.domain.Seniority;
import com.adaptlearngraph.catalog.domain.TargetRoleDetail;
import com.adaptlearngraph.catalog.domain.TargetRoleRequirement;
import com.adaptlearngraph.catalog.domain.TargetRoleSummary;
import com.adaptlearngraph.learning.application.TargetRoleSelectionException;
import com.adaptlearngraph.learning.application.TargetRoleSelectionException.Code;
import com.adaptlearngraph.learning.application.TargetRoleSelectionService;
import com.adaptlearngraph.learning.application.TargetSelectionCommandProcessor;
import com.adaptlearngraph.learning.application.port.in.ChooseTargetRoleCommand;
import com.adaptlearngraph.learning.application.port.out.PathwayArchivePort;
import com.adaptlearngraph.learning.application.port.out.TargetRoleSelectionCatalogPort;
import com.adaptlearngraph.learning.application.port.out.TargetRoleSelectionCatalogPort.SelectableTargetRole;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionActorPort.SelectionActor;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.PendingSelectionRequest;
import com.adaptlearngraph.learning.domain.TargetRoleSelection;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

/** REQ-001-F02 T4 disposable-PostgreSQL integration tests; never uses the development volume. */
class TargetRoleSelectionPostgresIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static final UUID ORGANIZATION_A = uuid(1);
    private static final UUID ORGANIZATION_B = uuid(2);
    private static final UUID LEARNER_ID = uuid(3);
    private static final UUID ROLE_A_ID = uuid(11);
    private static final UUID ROLE_B_ID = uuid(12);
    private static final UUID ROLE_C_ID = uuid(13);
    private static final UUID ROLE_A_REF = uuid(21);
    private static final UUID ROLE_B_REF = uuid(22);
    private static final UUID ROLE_C_REF = uuid(23);
    private static final UUID RELEASE_ID = uuid(31);
    private static final Instant NOW = Instant.parse("2026-10-02T05:00:00Z");
    private static final OffsetDateTime DATABASE_NOW = OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC);
    private static final String HASH_A = "a".repeat(64);
    private static final String HASH_B = "b".repeat(64);
    private static boolean dockerAvailable;

    private JdbcTemplate jdbc;
    private NamedParameterJdbcTemplate namedJdbc;
    private ObjectMapper objectMapper;
    private JdbcTargetSelectionPersistence store;
    private JdbcTargetSelectionEventAdapter events;
    private TransactionTemplateSelectionTransactionAdapter transactions;
    private JdbcProvisionalPathwayArchiveAdapter pathways;
    private AtomicLong identifiers;

    @BeforeAll
    static void startPostgresWhenDockerIsAvailable() {
        dockerAvailable = DockerClientFactory.instance().isDockerAvailable();
        if (dockerAvailable) {
            POSTGRES.start();
        }
    }

    @AfterAll
    static void stopPostgres() {
        if (POSTGRES.isRunning()) {
            POSTGRES.stop();
        }
    }

    @BeforeEach
    void migrateAndSeedDisposableDatabase() {
        assumeTrue(dockerAvailable, "Docker Desktop Linux engine is required for T4");
        var dataSource = new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        var reset = new JdbcTemplate(dataSource);
        reset.execute("DROP SCHEMA IF EXISTS platform CASCADE");
        reset.execute("DROP TABLE IF EXISTS public.flyway_schema_history");
        var flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load();
        flyway.migrate();

        jdbc = new JdbcTemplate(dataSource);
        namedJdbc = new NamedParameterJdbcTemplate(dataSource);
        objectMapper = new ObjectMapper().findAndRegisterModules();
        var rowMapper = new JdbcTargetSelectionRowMapper(objectMapper);
        store = new JdbcTargetSelectionPersistence(namedJdbc, rowMapper, objectMapper);
        events = new JdbcTargetSelectionEventAdapter(namedJdbc, objectMapper);
        transactions = new TransactionTemplateSelectionTransactionAdapter(
                new DataSourceTransactionManager(dataSource));
        pathways = new JdbcProvisionalPathwayArchiveAdapter(namedJdbc);
        identifiers = new AtomicLong(10_000);
        seedIdentityAndCatalog();
    }

    @Test
    void persistsInitialNoOpChangeAndHistoricalReplayWithAtomicRevisionAuditAndOutbox() throws Exception {
        var service = service(pathways, fixedCatalog());
        var initial = new ChooseTargetRoleCommand(ROLE_A_ID, null, "initial-key");

        var first = service.chooseTargetRole(initial);
        var noOp = service.chooseTargetRole(
                new ChooseTargetRoleCommand(ROLE_A_ID, null, "noop-key"));
        var changed = service.chooseTargetRole(
                new ChooseTargetRoleCommand(ROLE_B_ID, first.selection().selectionId(), "change-key"));
        var historicalReplay = service.chooseTargetRole(initial);

        assertThat(first.changed()).isTrue();
        assertThat(noOp.changed()).isFalse();
        assertThat(changed.changed()).isTrue();
        assertThat(changed.selection().targetRevision()).isEqualTo(2);
        assertThat(historicalReplay.changed()).isTrue();
        assertThat(historicalReplay.selection().selectionId())
                .isEqualTo(first.selection().selectionId());
        assertThat(historicalReplay.selection().roleSnapshot())
                .isEqualTo(first.selection().roleSnapshot());
        assertThat(historicalReplay.selection().targetRevision()).isEqualTo(1);
        assertThat(historicalReplay.selection().endedAt()).isEqualTo(NOW);
        assertThat(count("platform.target_selection")).isEqualTo(2);
        assertThat(countWhere("platform.target_selection", "ended_at IS NULL")).isOne();
        assertThat(count("platform.target_selection_request")).isEqualTo(3);
        assertThat(count("platform.audit_event")).isEqualTo(2);
        assertThat(count("platform.outbox_event")).isEqualTo(2);
        assertThat(jdbc.queryForObject(
                "SELECT target_revision FROM platform.learner_state WHERE learner_id = ?",
                Long.class, LEARNER_ID)).isEqualTo(2L);
        assertThat(jdbc.queryForObject(
                "SELECT result_changed FROM platform.target_selection_request WHERE idempotency_key = 'noop-key'",
                Boolean.class)).isFalse();

        var payload = objectMapper.readTree(jdbc.queryForObject(
                "SELECT payload::text FROM platform.outbox_event WHERE source_revision = 2",
                String.class));
        assertThat(payload.get("payloadVersion").asInt()).isOne();
        assertThat(payload.get("organizationId").asText()).isEqualTo(ORGANIZATION_A.toString());
        assertThat(payload.get("previousSelectionId").asText())
                .isEqualTo(first.selection().selectionId().toString());
        assertThat(payload.get("selectionId").asText())
                .isEqualTo(changed.selection().selectionId().toString());

        assertCode(Code.IDEMPOTENCY_CONFLICT, () -> service.chooseTargetRole(
                new ChooseTargetRoleCommand(ROLE_C_ID, null, "initial-key")));
        assertThat(count("platform.audit_event")).isEqualTo(2);
        assertThat(count("platform.outbox_event")).isEqualTo(2);
    }

    @Test
    void databaseConstraintsAndConcurrentClaimsKeepOneActiveSelectionAndOneRequest() throws Exception {
        var service = service(pathways, fixedCatalog());
        var initial = service.chooseTargetRole(
                new ChooseTargetRoleCommand(ROLE_A_ID, null, "initial-key"));
        var duplicateActive = new TargetRoleSelection(
                uuid(400), LEARNER_ID, ROLE_B_REF, snapshot(ROLE_B_ID), NOW, null, 2);

        assertThatThrownBy(() -> store.insertSelection(duplicateActive))
                .isInstanceOf(DataIntegrityViolationException.class);

        var start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> firstClaim = () -> claimAfter(start, uuid(401));
            Callable<Boolean> secondClaim = () -> claimAfter(start, uuid(402));
            var firstFuture = executor.submit(firstClaim);
            var secondFuture = executor.submit(secondClaim);
            start.countDown();

            assertThat(List.of(firstFuture.get(10, TimeUnit.SECONDS), secondFuture.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
        } finally {
            executor.shutdownNow();
        }

        assertThat(countWhere(
                "platform.target_selection_request", "idempotency_key = 'concurrent-key'"))
                .isOne();
        assertThat(countWhere("platform.target_selection", "ended_at IS NULL")).isOne();
        assertThat(store.findActiveSelection(LEARNER_ID).orElseThrow().selectionId())
                .isEqualTo(initial.selection().selectionId());
    }

    @Test
    void serializesCompetingChangesAndRejectsTheStaleLoser() throws Exception {
        var service = service(pathways, fixedCatalog());
        var initial = service.chooseTargetRole(
                new ChooseTargetRoleCommand(ROLE_A_ID, null, "initial-key"));
        var expected = initial.selection().selectionId();
        var start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(outcomeAfter(
                    start, service, new ChooseTargetRoleCommand(ROLE_B_ID, expected, "change-b")));
            var second = executor.submit(outcomeAfter(
                    start, service, new ChooseTargetRoleCommand(ROLE_C_ID, expected, "change-c")));
            start.countDown();
            var outcomes = List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));

            assertThat(outcomes).filteredOn(TargetRoleSelectionResultOrError::succeeded).hasSize(1);
            assertThat(outcomes).filteredOn(outcome -> outcome.code() == Code.STALE_SELECTION).hasSize(1);
        } finally {
            executor.shutdownNow();
        }

        assertThat(countWhere("platform.target_selection", "ended_at IS NULL")).isOne();
        assertThat(count("platform.audit_event")).isEqualTo(2);
        assertThat(count("platform.outbox_event")).isEqualTo(2);
        assertThat(jdbc.queryForObject(
                "SELECT target_revision FROM platform.learner_state WHERE learner_id = ?",
                Long.class, LEARNER_ID)).isEqualTo(2L);
    }

    @Test
    void pathwayDependencyFailureRollsBackClaimAndAllSelectionWrites() {
        var service = service(pathways, fixedCatalog());
        var initial = service.chooseTargetRole(
                new ChooseTargetRoleCommand(ROLE_A_ID, null, "initial-key"));
        PathwayArchivePort failingPathway = (learnerId, selectionId, archivedAt) -> {
            throw new PathwayArchivePort.PathwayArchiveException(
                    "injected pathway failure", new IllegalStateException("offline"));
        };
        var failingService = service(failingPathway, fixedCatalog());

        assertCode(Code.DEPENDENCY_UNAVAILABLE, () -> failingService.chooseTargetRole(
                new ChooseTargetRoleCommand(
                        ROLE_B_ID, initial.selection().selectionId(), "rollback-key")));

        assertThat(countWhere(
                "platform.target_selection_request", "idempotency_key = 'rollback-key'"))
                .isZero();
        assertThat(countWhere("platform.target_selection", "ended_at IS NULL")).isOne();
        assertThat(store.findActiveSelection(LEARNER_ID).orElseThrow().selectionId())
                .isEqualTo(initial.selection().selectionId());
        assertThat(count("platform.audit_event")).isOne();
        assertThat(count("platform.outbox_event")).isOne();
        assertThat(jdbc.queryForObject(
                "SELECT target_revision FROM platform.learner_state WHERE learner_id = ?",
                Long.class, LEARNER_ID)).isEqualTo(1L);
    }

    @Test
    void provisionalPathwayAdapterArchivesMatchingPathwayAndRejectsMismatchedSelection() {
        var selection = service(pathways, fixedCatalog()).chooseTargetRole(
                new ChooseTargetRoleCommand(ROLE_A_ID, null, "initial-key")).selection();
        seedPublishedPathway(selection.selectionId());

        assertThatThrownBy(() -> pathways.archiveCurrentPathway(LEARNER_ID, uuid(999), NOW))
                .isInstanceOf(PathwayArchivePort.PathwayArchiveException.class);
        assertThat(jdbc.queryForObject(
                "SELECT status FROM platform.pathway_revision", String.class))
                .isEqualTo("PUBLISHED_CURRENT");

        assertThat(pathways.archiveCurrentPathway(LEARNER_ID, selection.selectionId(), NOW))
                .isEqualTo(PathwayArchivePort.ArchiveOutcome.ARCHIVED);
        assertThat(jdbc.queryForObject(
                "SELECT status FROM platform.pathway_revision", String.class))
                .isEqualTo("SUPERSEDED");
        assertThat(pathways.archiveCurrentPathway(LEARNER_ID, selection.selectionId(), NOW))
                .isEqualTo(PathwayArchivePort.ArchiveOutcome.NO_PATHWAY);
    }

    @Test
    void f01BridgeUsesTrustedOrganizationAndRequiresOnePublishedPostgresReference() {
        var catalog = new RecordingF01Catalog();
        var adapter = new F01TargetRoleSelectionCatalogAdapter(catalog, namedJdbc);

        var available = adapter.findSelectableRole(ORGANIZATION_A, ROLE_A_ID).orElseThrow();

        assertThat(catalog.organizationId).isEqualTo(ORGANIZATION_A.toString());
        assertThat(catalog.roleId).isEqualTo(ROLE_A_ID.toString());
        assertThat(available.catalogReferenceId()).isEqualTo(ROLE_A_REF);
        assertThat(available.snapshot()).isEqualTo(snapshot(ROLE_A_ID));

        catalog.availableOrganization = ORGANIZATION_B;
        assertThat(adapter.findSelectableRole(ORGANIZATION_A, ROLE_A_ID)).isEmpty();

        catalog.availableOrganization = ORGANIZATION_A;
        insertCatalogReference(uuid(299), ROLE_A_ID, uuid(399));
        assertThatThrownBy(() -> adapter.findSelectableRole(ORGANIZATION_A, ROLE_A_ID))
                .isInstanceOf(TargetRoleSelectionCatalogPort.CatalogUnavailableException.class)
                .hasMessageContaining("does not uniquely match");
    }

    private TargetRoleSelectionService service(
            PathwayArchivePort pathwayPort,
            TargetRoleSelectionCatalogPort catalog) {
        var actor = (com.adaptlearngraph.learning.application.port.out.TargetSelectionActorPort) () ->
                Optional.of(new SelectionActor(
                        LEARNER_ID, ORGANIZATION_A, true, Set.of("EMPLOYEE")));
        Supplier<UUID> ids = () -> new UUID(9L, identifiers.incrementAndGet());
        var processor = new TargetSelectionCommandProcessor(
                learnerId -> false,
                pathwayPort,
                events,
                store,
                Clock.fixed(NOW, ZoneOffset.UTC),
                ids);
        return new TargetRoleSelectionService(actor, catalog, store, transactions, processor);
    }

    private TargetRoleSelectionCatalogPort fixedCatalog() {
        Map<UUID, SelectableTargetRole> roles = Map.of(
                ROLE_A_ID, new SelectableTargetRole(ROLE_A_REF, snapshot(ROLE_A_ID)),
                ROLE_B_ID, new SelectableTargetRole(ROLE_B_REF, snapshot(ROLE_B_ID)),
                ROLE_C_ID, new SelectableTargetRole(ROLE_C_REF, snapshot(ROLE_C_ID)));
        return (organizationId, roleId) -> ORGANIZATION_A.equals(organizationId)
                ? Optional.ofNullable(roles.get(roleId))
                : Optional.empty();
    }

    private boolean claimAfter(CountDownLatch start, UUID requestId) throws InterruptedException {
        start.await(10, TimeUnit.SECONDS);
        return store.claimRequest(new PendingSelectionRequest(
                requestId, LEARNER_ID, "concurrent-key", HASH_A, NOW));
    }

    private static Callable<TargetRoleSelectionResultOrError> outcomeAfter(
            CountDownLatch start,
            TargetRoleSelectionService service,
            ChooseTargetRoleCommand command) {
        return () -> {
            start.await(10, TimeUnit.SECONDS);
            try {
                service.chooseTargetRole(command);
                return new TargetRoleSelectionResultOrError(true, null);
            } catch (TargetRoleSelectionException failure) {
                return new TargetRoleSelectionResultOrError(false, failure.code());
            }
        };
    }

    private void seedIdentityAndCatalog() {
        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, 'ORG_A', 'Org A')",
                ORGANIZATION_A);
        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, 'ORG_B', 'Org B')",
                ORGANIZATION_B);
        jdbc.update("""
                INSERT INTO platform.account(
                    account_id, organization_id, identifier, normalized_identifier, password_hash)
                VALUES (?, ?, 'learner-a', 'learner-a', 'not-a-login')
                """, LEARNER_ID, ORGANIZATION_A);
        jdbc.update("INSERT INTO platform.learner_state(learner_id) VALUES (?)", LEARNER_ID);
        jdbc.update("""
                INSERT INTO platform.catalog_release(
                    release_id, source_revision, manifest_hash, source_event_id, confirmed_at)
                VALUES (?, 1, ?, ?, ?)
                """, RELEASE_ID, HASH_A, uuid(32), DATABASE_NOW);
        insertCatalogReference(ROLE_A_REF, ROLE_A_ID, uuid(111));
        insertCatalogReference(ROLE_B_REF, ROLE_B_ID, uuid(112));
        insertCatalogReference(ROLE_C_REF, ROLE_C_ID, uuid(113));
        jdbc.update("""
                UPDATE platform.catalog_guard
                SET state = 'OPEN', release_id = ?, manifest_hash = ?, updated_at = ?
                WHERE guard_id = 1
                """, RELEASE_ID, HASH_A, DATABASE_NOW);
    }

    private void insertCatalogReference(UUID referenceId, UUID roleId, UUID versionId) {
        jdbc.update("""
                INSERT INTO platform.catalog_reference(
                    catalog_ref_id, entity_id, version_id, release_id, kind, source_hash, confirmed_at)
                VALUES (?, ?, ?, ?, 'TARGET_ROLE', ?, ?)
                """, referenceId, roleId, versionId, RELEASE_ID, HASH_A, DATABASE_NOW);
    }

    private void seedPublishedPathway(UUID selectionId) {
        UUID policy = uuid(501);
        UUID model = uuid(502);
        UUID stream = uuid(503);
        UUID profile = uuid(504);
        UUID progress = uuid(505);
        UUID recommendationVersion = uuid(506);
        UUID recommendationRun = uuid(507);
        UUID pathwayRevision = uuid(508);
        jdbc.update("""
                INSERT INTO platform.evidence_policy_version(
                    policy_version_id, policy_name, version, configuration, configuration_hash)
                VALUES (?, 'T4 policy', 1, '{}'::jsonb, ?)
                """, policy, HASH_A);
        jdbc.update("""
                INSERT INTO platform.model_version(
                    model_version_id, algorithm, version, parameter_hash, configuration, artifact_ref)
                VALUES (?, 'T4 model', '1', ?, '{}'::jsonb, 'fixture')
                """, model, HASH_A);
        jdbc.update("""
                INSERT INTO platform.processing_stream(
                    processing_stream_id, learner_id, model_version_id, policy_version_id)
                VALUES (?, ?, ?, ?)
                """, stream, LEARNER_ID, model, policy);
        jdbc.update("""
                INSERT INTO platform.profile_revision(
                    profile_revision_id, learner_id, processing_stream_id, model_version_id,
                    policy_version_id, revision_number, evidence_watermark, status)
                VALUES (?, ?, ?, ?, ?, 1, 0, 'COMPLETE')
                """, profile, LEARNER_ID, stream, model, policy);
        jdbc.update("""
                INSERT INTO platform.progress_revision(
                    progress_revision_id, learner_id, revision_number, activity_snapshot, snapshot_hash)
                VALUES (?, ?, 1, '[]'::jsonb, ?)
                """, progress, LEARNER_ID, HASH_A);
        jdbc.update("""
                INSERT INTO platform.recommendation_version(
                    recommendation_version_id, algorithm, version, contract_version,
                    configuration, artifact_hash)
                VALUES (?, 'T4 recommendation', '1', '1', '{}'::jsonb, ?)
                """, recommendationVersion, HASH_A);
        jdbc.update("""
                INSERT INTO platform.recommendation_run(
                    recommendation_run_id, learner_id, selection_id, profile_revision_id,
                    progress_revision_id, catalog_release_id, availability_revision,
                    policy_version_id, model_version_id, recommendation_version_id,
                    seed, input_hash, frozen_input, status)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, ?, '{}'::jsonb, 'SUCCEEDED')
                """, recommendationRun, LEARNER_ID, selectionId, profile, progress, RELEASE_ID,
                policy, model, recommendationVersion, HASH_A);
        jdbc.update("""
                INSERT INTO platform.pathway_revision(
                    pathway_revision_id, pathway_id, recommendation_run_id, learner_id,
                    selection_id, revision, content_hash, status, validation_status)
                VALUES (?, ?, ?, ?, ?, 1, ?, 'GENERATED', 'VALID')
                """, pathwayRevision, uuid(509), recommendationRun, LEARNER_ID, selectionId, HASH_B);
        jdbc.update("""
                INSERT INTO platform.pathway_approval(
                    approval_id, pathway_revision_id, administrator_id, approved_hash)
                VALUES (?, ?, ?, ?)
                """, uuid(510), pathwayRevision, LEARNER_ID, HASH_B);
        jdbc.update("""
                UPDATE platform.pathway_revision
                SET status = 'PUBLISHED_CURRENT', published_at = ?
                WHERE pathway_revision_id = ?
                """, DATABASE_NOW, pathwayRevision);
    }

    private long count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
    }

    private long countWhere(String table, String condition) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM " + table + " WHERE " + condition, Long.class);
    }

    private static TargetRoleSnapshot snapshot(UUID roleId) {
        String suffix = roleId.equals(ROLE_A_ID) ? "A" : roleId.equals(ROLE_B_ID) ? "B" : "C";
        return new TargetRoleSnapshot(
                roleId, "ROLE_" + suffix, "Role " + suffix,
                TargetRoleSnapshot.CareerTrack.PROFESSIONAL,
                TargetRoleSnapshot.Seniority.P3);
    }

    private static TargetRoleDetail detail(UUID roleId) {
        return new TargetRoleDetail(
                roleId.toString(), "ROLE_A", "Role A", "ENGINEERING",
                CareerTrack.PROFESSIONAL, Seniority.P3, null, List.of(),
                List.of(new TargetRoleRequirement("skill-a", "SKILL_A", "Skill A", 0.8)));
    }

    private static void assertCode(Code code, ThrowingCall call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(TargetRoleSelectionException.class,
                        failure -> assertThat(failure.code()).isEqualTo(code));
    }

    private static UUID uuid(long value) {
        return new UUID(0L, value);
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void run();
    }

    private record TargetRoleSelectionResultOrError(boolean succeeded, Code code) {}

    private static final class RecordingF01Catalog implements TargetRoleCatalogPort {
        private UUID availableOrganization = ORGANIZATION_A;
        private String organizationId;
        private String roleId;

        @Override
        public List<TargetRoleSummary> findAvailableRoles(String organizationId, Criteria criteria) {
            throw new UnsupportedOperationException("T4 resolves one role only");
        }

        @Override
        public Optional<TargetRoleDetail> findAvailableRole(String organizationId, String roleId) {
            this.organizationId = organizationId;
            this.roleId = roleId;
            return availableOrganization.toString().equals(organizationId)
                    ? Optional.of(detail(UUID.fromString(roleId)))
                    : Optional.empty();
        }
    }
}
