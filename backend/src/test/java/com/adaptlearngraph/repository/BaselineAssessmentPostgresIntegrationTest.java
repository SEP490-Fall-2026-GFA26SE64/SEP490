package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.adaptlearngraph.services.BaselineAssessmentDraftService;
import com.adaptlearngraph.services.BaselineBlueprintCapacityService;
import com.adaptlearngraph.services.BaselineBlueprintService;
import com.adaptlearngraph.services.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.repository.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.repository.BaselineOccupationCatalogPort.CatalogOccupation;
import com.adaptlearngraph.repository.BaselineOccupationCatalogPort.CatalogRole;
import com.adaptlearngraph.repository.BaselineOccupationCatalogPort.CatalogSkill;
import com.adaptlearngraph.services.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.services.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.entities.domain.BaselineAssessmentDraft.PublicationState;
import com.adaptlearngraph.entities.domain.BaselineAssessmentDraft;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.ActiveRelease;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.AssessmentVersionRef;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.BlueprintVersionRef;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.CandidateState;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.OpenCandidate;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.Scope;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.SeriesSnapshot;
import com.adaptlearngraph.repository.BaselineAssessmentDraftStore.CloneCandidate;
import com.adaptlearngraph.repository.BaselineAssessmentDraftStore.NewDraft;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore.AssessmentVersionRecord;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore.CloseWorkingRevision;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore.CommandReceipt;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore.NewWorkingRevision;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore.SaveWorkingRevision;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore.Transition;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore.Update;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore.WorkingRevisionRecord;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore.WorkingRevisionState;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.function.Supplier;
import com.adaptlearngraph.entities.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.entities.domain.BaselineBlueprint.SkillConfig;
import com.adaptlearngraph.entities.domain.CareerTrack;
import com.adaptlearngraph.entities.domain.TargetRoleDetail;
import com.adaptlearngraph.entities.domain.TargetRoleRequirement;
import com.adaptlearngraph.entities.domain.TargetRoleSummary;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

/** REQ-002-F02 disposable PostgreSQL integration; never uses the development Compose volume. */
class BaselineAssessmentPostgresIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static final UUID ORGANIZATION_ID = uuid(1);
    private static final UUID ACTOR_ID = uuid(2);
    private static final UUID QUESTION_BANK_ID = uuid(3);
    private static final String ROLE_ID = uuid(11).toString();
    private static final String ZERO_ROLE_ID = uuid(13).toString();
    private static final String SKILL_ID = uuid(12).toString();
    private static final String ZERO_SKILL_ID = uuid(14).toString();
    private static final String OCCUPATION_ID = uuid(15).toString();
    private static boolean dockerAvailable;

    private Flyway flyway;
    private JdbcTemplate jdbc;
    private BaselineBlueprintStore blueprints;
    private BaselineAssessmentDraftStore drafts;
    private BaselineAssessmentDraftStore draftStore;
    private BaselineAssessmentManagementStore management;
    private TransactionTemplate storeTransactions;
    private BaselineAnswerReviewStore answerReviews;
    private BaselineBlueprintService blueprintService;
    private BaselineBlueprintCapacityService capacityService;
    private BaselineAssessmentDraftService draftService;

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

    private static com.adaptlearngraph.support.JpaTestContext persistence;

    @BeforeEach
    void migrateAndSeedDisposableDatabase() {
        assumeTrue(dockerAvailable, "Docker Desktop Linux engine is required for baseline integration");
        var dataSource = new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        var reset = new JdbcTemplate(dataSource);
        reset.execute("DROP SCHEMA IF EXISTS platform CASCADE");
        reset.execute("DROP TABLE IF EXISTS public.flyway_schema_history");
        flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load();
        flyway.migrate();

        jdbc = new JdbcTemplate(dataSource);
        if (persistence != null) persistence.close();
        persistence = com.adaptlearngraph.support.JpaTestContext.start(dataSource);
        blueprints = new TransactionalBlueprintStore(
                new JpaBaselineBlueprintStore(persistence.bean(BaselineBlueprintJpaRepository.class),
                        persistence.bean(BaselineBlueprintVersionJpaRepository.class),
                        persistence.bean(BaselineBlueprintRoleJpaRepository.class),
                        persistence.bean(BaselineBlueprintSkillJpaRepository.class)),
                new TransactionTemplate(persistence.transactionManager()));
        storeTransactions = new TransactionTemplate(persistence.transactionManager());
        draftStore = new JpaBaselineAssessmentDraftStore(persistence.bean(ItemVersionJpaRepository.class),
                persistence.bean(AssessmentVersionJpaRepository.class), persistence.bean(AssessmentItemJpaRepository.class),
                persistence.bean(BaselineAssessmentSeriesJpaRepository.class),
                persistence.bean(BaselineBlueprintJpaRepository.class),
                persistence.bean(BaselineBlueprintVersionJpaRepository.class));
        management = new JpaBaselineAssessmentManagementStore(persistence.bean(BaselineAssessmentSeriesJpaRepository.class),
                persistence.bean(BaselineBlueprintWorkingRevisionJpaRepository.class),
                persistence.bean(BaselineAssessmentTransitionJpaRepository.class),
                persistence.bean(BaselineManagementCommandJpaRepository.class),
                persistence.bean(BaselineBlueprintJpaRepository.class),
                new PostgresAdvisoryLocks(persistence.bean(jakarta.persistence.EntityManager.class)), new ObjectMapper());
        drafts = new TransactionalDraftStore(draftStore, storeTransactions);
        answerReviews = new JpaBaselineAnswerReviewStore(persistence.bean(AssessmentVersionJpaRepository.class),
                persistence.bean(BaselineAnswerRevealAuditJpaRepository.class));
        var actor = (BaselineBlueprintStore.ActorPort) () -> Optional.of(
                new Actor(ACTOR_ID, ORGANIZATION_ID.toString(), true, Set.of("LD_MANAGER")));
        var validation = new BaselineBlueprintValidationAdapter(catalog(), occupationCatalog(),
                persistence.bean(ItemVersionJpaRepository.class));
        blueprintService = new BaselineBlueprintService(actor, blueprints, validation);
        capacityService = new BaselineBlueprintCapacityService(
                actor, occupationCatalog(), validation);
        draftService = new BaselineAssessmentDraftService(actor, blueprints, drafts);
        seedIdentityAndQuestionBank();
    }

    @Test
    void migratesThroughV47AndSecondMigrationRunIsNoOp() {
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("47");
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE success", Long.class)).isEqualTo(47L);
    }

    @Test
    void workingRevisionAndTransitionTriggersReadTheirOwnActorColumns() {
        var blueprint = blueprintService.create("trigger-blueprint", blueprintDraft("Trigger blueprint"));
        jdbc.update("""
                INSERT INTO platform.baseline_assessment_series(
                    organization_id, occupation_id, blueprint_id)
                VALUES (?, ?, ?)
                """, ORGANIZATION_ID, OCCUPATION_ID, blueprint.blueprintId());

        UUID workingId = uuid(902);
        jdbc.update("""
                INSERT INTO platform.baseline_blueprint_working_revision(
                    working_revision_id, organization_id, occupation_id, blueprint_id,
                    name, occupation_name_snapshot, roles, created_by, updated_by)
                VALUES (?, ?, ?, ?, 'Working', 'Software Engineering', '[]'::jsonb, ?, ?)
                """, workingId, ORGANIZATION_ID, OCCUPATION_ID, blueprint.blueprintId(), ACTOR_ID, ACTOR_ID);
        jdbc.update("""
                INSERT INTO platform.baseline_assessment_transition(
                    organization_id, occupation_id, series_revision, transition, actor_id, occurred_at,
                    working_revision_id)
                VALUES (?, ?, 2, 'WORKING_REVISION_STARTED', ?, now(), ?)
                """, ORGANIZATION_ID, OCCUPATION_ID, ACTOR_ID, workingId);

        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM platform.baseline_blueprint_working_revision
                WHERE working_revision_id = ? AND updated_by = ?
                """, Long.class, workingId, ACTOR_ID)).isOne();
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM platform.baseline_assessment_transition
                WHERE working_revision_id = ? AND actor_id = ?
                """, Long.class, workingId, ACTOR_ID)).isOne();

        UUID otherOrganization = uuid(903);
        UUID otherActor = uuid(904);
        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, 'OTHER_TRIGGER', 'Other')",
                otherOrganization);
        jdbc.update("""
                INSERT INTO platform.account(
                    account_id, organization_id, identifier, normalized_identifier, password_hash)
                VALUES (?, ?, 'other-trigger-actor', 'other-trigger-actor', 'not-a-login')
                """, otherActor, otherOrganization);
        assertThatThrownBy(() -> jdbc.update("""
                UPDATE platform.baseline_blueprint_working_revision
                SET updated_by = ? WHERE working_revision_id = ?
                """, otherActor, workingId))
                .hasMessageContaining("Baseline management actor is outside the series organization");
        assertThat(jdbc.queryForObject("""
                SELECT updated_by FROM platform.baseline_blueprint_working_revision
                WHERE working_revision_id = ?
                """, UUID.class, workingId)).isEqualTo(ACTOR_ID);
    }

    @Test
    void answerRevealIsTenantScopedAndAppendsOneAuditRow() {
        var blueprint = blueprintService.create("answer-blueprint", blueprintDraft("Answer review"));
        var assessment = draftService.generate(blueprint.blueprintId(), 1, "answer-assessment");
        jdbc.update("""
                INSERT INTO platform.baseline_assessment_series(
                    organization_id, occupation_id, blueprint_id, pending_blueprint_version,
                    open_assessment_version_id)
                VALUES (?, ?, ?, 1, ?)
                """, ORGANIZATION_ID, OCCUPATION_ID, blueprint.blueprintId(), assessment.assessmentVersionId());

        UUID otherOrganizationId = uuid(901);
        jdbc.update("""
                INSERT INTO platform.organization(organization_id, code, name)
                VALUES (?, 'ORG_OTHER', 'Other Organization')
                """, otherOrganizationId);

        assertThatThrownBy(() -> answerReviews.revealAndAudit(
                otherOrganizationId, assessment.assessmentVersionId(), ACTOR_ID, Instant.now()))
                .isInstanceOf(BaselineAnswerReviewStore.NotFound.class);
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM platform.baseline_answer_reveal_audit", Long.class)).isZero();

        Instant revealedAt = Instant.parse("2026-10-17T08:30:00Z");
        var answers = answerReviews.revealAndAudit(
                ORGANIZATION_ID, assessment.assessmentVersionId(), ACTOR_ID, revealedAt);

        assertThat(answers).hasSize(3).allSatisfy(item ->
                assertThat(item.protectedKeyJson()).contains("correctOption"));
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM platform.baseline_answer_reveal_audit
                WHERE organization_id = ? AND assessment_version_id = ?
                  AND actor_id = ? AND item_count = 3
                """, Long.class, ORGANIZATION_ID, assessment.assessmentVersionId(), ACTOR_ID)).isOne();
    }

    @Test
    void persistsVersionedBlueprintAndIdempotentGenerationWithUtcTimestamps() {
        var first = blueprintService.create("create-key", blueprintDraft("Baseline v1"));
        var replay = blueprintService.create("create-key", blueprintDraft("Baseline v1"));
        var second = blueprintService.revise(
                first.blueprintId(), 1, "revise-key", blueprintDraft("Baseline v2"));

        assertThat(replay).isEqualTo(first);
        assertThat(second.version()).isEqualTo(2);
        assertThat(blueprints.findVersion(first.blueprintId(), 1)).contains(first);
        assertThat(blueprints.findLatest(first.blueprintId())).contains(second);
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM platform.baseline_blueprint_version", Long.class)).isEqualTo(2L);
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM platform.baseline_blueprint", Long.class)).isOne();
        assertThat(blueprints.findLatestByOccupation(OCCUPATION_ID)).contains(second);
        assertThat(jdbc.queryForObject("""
                SELECT total_question_count
                FROM platform.baseline_blueprint_role
                WHERE blueprint_id = ? AND blueprint_version = 2 AND role_id = ?
                """, Integer.class, first.blueprintId(), ROLE_ID)).isEqualTo(3);
        assertThat(jdbc.queryForObject("""
                SELECT total_question_count
                FROM platform.baseline_blueprint_role
                WHERE blueprint_id = ? AND blueprint_version = 2 AND role_id = ?
                """, Integer.class, first.blueprintId(), ZERO_ROLE_ID)).isZero();

        var generated = draftService.generate(first.blueprintId(), 2, "generate-key");
        var generationReplay = draftService.generate(first.blueprintId(), 2, "generate-key");

        assertThat(generationReplay.assessmentVersionId()).isEqualTo(generated.assessmentVersionId());
        assertThat(generated.items()).hasSize(3);
        assertThat(generated.items()).extracting(item -> item.prompt())
                .contains("Latest EASY question", "MEDIUM question", "HARD question")
                .doesNotContain("Old EASY question");
        assertThat(generated.items()).allSatisfy(item ->
                assertThat(item.responseSchemaJson()).doesNotContain("correctOption", "protected"));
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM platform.assessment_version", Long.class)).isOne();
    }

    @Test
    void databaseAndServiceRejectSecondLogicalBlueprintForOccupation() {
        var first = blueprintService.create("create-one", blueprintDraft("Baseline one"));

        assertThatThrownBy(() -> blueprintService.create("create-two", blueprintDraft("Baseline two")))
                .isInstanceOfSatisfying(Failure.class,
                        failure -> assertThat(failure.code()).isEqualTo(Code.VERSION_CONFLICT));
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM platform.baseline_blueprint", Long.class)).isOne();
        assertThat(blueprints.findLatestByOccupation(OCCUPATION_ID)).contains(first);
    }

    @Test
    void readsCurrentPublishedCapacityWithoutCountingSupersededItemVersions() {
        var capacity = capacityService.getAvailableCapacity(OCCUPATION_ID);

        assertThat(capacity.catalogVersion()).isEqualTo("test-v1");
        assertThat(capacity.roles()).hasSize(2);
        assertThat(capacity.roles().stream()
                .filter(role -> role.roleId().equals(ROLE_ID))
                .findFirst().orElseThrow().skills()).singleElement().satisfies(skill -> {
                    assertThat(skill.availableEasy()).isOne();
                    assertThat(skill.availableMedium()).isOne();
                    assertThat(skill.availableHard()).isOne();
                });
        assertThat(capacity.roles().stream()
                .filter(role -> role.roleId().equals(ZERO_ROLE_ID))
                .findFirst().orElseThrow().skills()).singleElement().satisfies(skill -> {
                    assertThat(skill.availableEasy()).isZero();
                    assertThat(skill.availableMedium()).isZero();
                    assertThat(skill.availableHard()).isZero();
                });
    }

    @Test
    void reviewAndPublishPersistExactHashAndDatabaseFreezesHeaderAndManifest() {
        var blueprint = blueprintService.create("create-key", blueprintDraft("Baseline"));
        var generated = draftService.generate(blueprint.blueprintId(), 1, "generate-key");

        var reviewed = draftService.review(generated.assessmentVersionId(), generated.contentHash());

        assertThat(reviewed.publicationState()).isEqualTo(PublicationState.DRAFT);
        assertThat(reviewed.reviewedBy()).isEqualTo(ACTOR_ID);
        assertThat(reviewed.reviewedContentHash()).isEqualTo(generated.contentHash());
        assertThat(reviewed.reviewedAt()).isNotNull();
        assertThatThrownBy(() -> jdbc.update("""
                UPDATE platform.assessment_item
                SET scoring_weight = scoring_weight + 0.01
                WHERE assessment_version_id = ? AND item_position = 1
                """, generated.assessmentVersionId()))
                .isInstanceOfSatisfying(DataAccessException.class, failure ->
                        assertThat(failure.getMostSpecificCause())
                                .hasMessageContaining("Reviewed assessment item set is immutable"));

        var published = draftService.publish(generated.assessmentVersionId(), generated.contentHash());

        assertThat(published.publicationState()).isEqualTo(PublicationState.PUBLISHED);
        assertThat(draftService.publish(generated.assessmentVersionId(), generated.contentHash()))
                .isEqualTo(published);
        assertThatThrownBy(() -> jdbc.update("""
                UPDATE platform.assessment_version
                SET title = 'forbidden mutation'
                WHERE assessment_version_id = ?
                """, generated.assessmentVersionId()))
                .isInstanceOfSatisfying(DataAccessException.class, failure ->
                        assertThat(failure.getMostSpecificCause())
                                .hasMessageContaining("Published assessment definitions are immutable"));
    }

    @Test
    void managementStorePersistsScopedLifecycleWithCompareAndSetTransitionsAndReceipts() {
        var blueprint = blueprintService.create("management-blueprint", blueprintDraft("Managed blueprint"));
        UUID blueprintId = blueprint.blueprintId();
        var scope = new Scope(ORGANIZATION_ID, OCCUPATION_ID);
        UUID otherOrganization = uuid(905);
        UUID otherActor = uuid(906);
        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, 'ORG_MANAGE', 'Other')",
                otherOrganization);
        jdbc.update("""
                INSERT INTO platform.account(
                    account_id, organization_id, identifier, normalized_identifier, password_hash)
                VALUES (?, ?, 'other-manager', 'other-manager', 'not-a-login')
                """, otherActor, otherOrganization);

        assertThat(management.findByScope(scope)).isEmpty();
        SeriesSnapshot created = tx(() -> management.lockOrCreate(scope, blueprintId));
        assertThat(created).isEqualTo(new SeriesSnapshot(scope, blueprintId, 1, null, null, null, null));
        assertThat(tx(() -> management.lockOrCreate(scope, blueprintId))).isEqualTo(created);
        assertThat(management.findByScope(scope)).contains(created);
        assertThatThrownBy(() -> tx(() -> management.lockOrCreate(scope, uuid(907))))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class)
                .hasMessageContaining("another blueprint identity");
        assertThatThrownBy(() -> tx(() -> management.lockOrCreate(
                new Scope(otherOrganization, OCCUPATION_ID), blueprintId)))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class)
                .hasMessageContaining("does not belong");
        assertThat(management.findBlueprintVersions(scope)).singleElement().satisfies(version -> {
            assertThat(version.blueprintId()).isEqualTo(blueprintId);
            assertThat(version.version()).isOne();
            assertThat(version.name()).isEqualTo("Managed blueprint");
            assertThat(version.createdAt()).isNotNull();
        });
        assertThat(management.findBlueprintVersions(new Scope(otherOrganization, OCCUPATION_ID))).isEmpty();

        Instant started = Instant.parse("2026-10-17T08:00:00.123456Z");
        UUID workingId = uuid(910);
        List<RoleConfig> roles = List.of(new RoleConfig(
                ROLE_ID, "Client role snapshot", true,
                new BigDecimal("0.2"), new BigDecimal("0.3"), new BigDecimal("0.5"),
                List.of(new SkillConfig(SKILL_ID, "Client skill snapshot", 1, 1, 1))));
        var inserted = tx(() -> management.insertWorkingRevision(new NewWorkingRevision(
                workingId, scope, blueprintId, 1, "Working draft", "Software Engineering", roles, ACTOR_ID, started)));
        assertThat(inserted).isEqualTo(new WorkingRevisionRecord(workingId, scope, blueprintId, 1, 1, "Working draft",
                "Software Engineering", roles, WorkingRevisionState.OPEN, started, started));
        assertThatThrownBy(() -> tx(() -> management.insertWorkingRevision(new NewWorkingRevision(
                uuid(911), scope, blueprintId, null, "Second draft", "Software Engineering", roles, ACTOR_ID, started))))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class)
                .hasMessageContaining("already exists");

        assertThat(tx(() -> management.update(new Update(scope, 1, workingId, null, null, null,
                Transition.WORKING_REVISION_STARTED, ACTOR_ID, started, null))))
                .isEqualTo(new SeriesSnapshot(scope, blueprintId, 2, workingId, null, null, null));
        assertThatThrownBy(() -> tx(() -> management.update(new Update(scope, 1, workingId, null, null, null,
                Transition.WORKING_REVISION_SAVED, ACTOR_ID, started, null))))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class)
                .hasMessageContaining("stale");
        assertThatThrownBy(() -> tx(() -> management.insertWorkingRevision(new NewWorkingRevision(
                uuid(912), scope, blueprintId, 1, "Third draft", "Software Engineering", roles, ACTOR_ID, started))))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class)
                .hasMessageContaining("pending baseline change");

        Instant saved = started.plusSeconds(60);
        var savedRecord = tx(() -> management.saveWorkingRevision(new SaveWorkingRevision(scope, workingId, 1,
                "Working draft v2", "Software Engineering v2", roles, ACTOR_ID, saved)));
        assertThat(savedRecord).isEqualTo(new WorkingRevisionRecord(workingId, scope, blueprintId, 1, 2,
                "Working draft v2", "Software Engineering v2", roles, WorkingRevisionState.OPEN, started, saved));
        assertThatThrownBy(() -> tx(() -> management.saveWorkingRevision(new SaveWorkingRevision(scope, workingId, 1,
                "Stale", "Software Engineering", roles, ACTOR_ID, saved))))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class)
                .hasMessageContaining("stale or closed");
        assertThat(management.findScopeByWorkingRevision(ORGANIZATION_ID, workingId)).contains(scope);
        assertThat(management.findScopeByWorkingRevision(otherOrganization, workingId)).isEmpty();
        assertThat(management.findWorkingRevision(scope, workingId)).contains(savedRecord);
        assertThat(management.findWorkingRevision(new Scope(ORGANIZATION_ID, "other-occupation"), workingId)).isEmpty();
        assertThatThrownBy(() -> txRun(() -> management.closeWorkingRevision(new CloseWorkingRevision(
                scope, workingId, 2, WorkingRevisionState.ABANDONED, ACTOR_ID, saved))))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class)
                .hasMessageContaining("working pointer");

        Instant abandoned = saved.plusSeconds(60);
        assertThat(tx(() -> management.update(new Update(scope, 2, null, null, null, null,
                Transition.PENDING_CHANGE_ABANDONED, ACTOR_ID, abandoned, "  Replaced  "))))
                .isEqualTo(new SeriesSnapshot(scope, blueprintId, 3, null, null, null, null));
        txRun(() -> management.closeWorkingRevision(new CloseWorkingRevision(
                scope, workingId, 2, WorkingRevisionState.ABANDONED, ACTOR_ID, abandoned)));
        assertThat(management.findWorkingRevision(scope, workingId)).contains(new WorkingRevisionRecord(workingId, scope,
                blueprintId, 1, 3, "Working draft v2", "Software Engineering v2", roles,
                WorkingRevisionState.ABANDONED, started, abandoned));
        assertThat(jdbc.queryForObject("""
                SELECT closed_at FROM platform.baseline_blueprint_working_revision WHERE working_revision_id = ?
                """, Timestamp.class, workingId).toInstant()).isEqualTo(abandoned);
        assertThatThrownBy(() -> txRun(() -> management.closeWorkingRevision(new CloseWorkingRevision(
                scope, workingId, 3, WorkingRevisionState.FINALIZED, ACTOR_ID, abandoned))))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class);

        var generated = draftService.generate(blueprintId, 1, "management-generate");
        UUID assessmentId = generated.assessmentVersionId();
        assertThat(management.findScopeByAssessment(ORGANIZATION_ID, assessmentId)).contains(scope);
        assertThat(management.findScopeByAssessment(otherOrganization, assessmentId)).isEmpty();
        var pending = new BlueprintVersionRef(blueprintId, 1);
        var reference = new AssessmentVersionRef(assessmentId, generated.version(), pending);
        var open = new OpenCandidate(reference, CandidateState.DRAFT, 1, generated.contentHash());
        assertThat(tx(() -> management.update(new Update(scope, 3, null, pending, open, null,
                Transition.ASSESSMENT_DRAFT_OPENED, ACTOR_ID, abandoned, null))))
                .isEqualTo(new SeriesSnapshot(scope, blueprintId, 4, null, pending, open, null));
        assertThat(tx(() -> draftStore.review(ORGANIZATION_ID.toString(), assessmentId, ACTOR_ID, abandoned,
                generated.contentHash()))).isTrue();
        assertThat(management.findByScope(scope)).get()
                .extracting(series -> series.openCandidate().state()).isEqualTo(CandidateState.REVIEWED);
        assertThat(tx(() -> draftStore.publish(ORGANIZATION_ID.toString(), assessmentId, generated.contentHash())))
                .isTrue();
        var active = new ActiveRelease(reference);
        assertThat(tx(() -> management.update(new Update(scope, 4, null, null, null, active,
                Transition.ACTIVE_ASSESSMENT_SWITCHED, ACTOR_ID, abandoned, null))))
                .isEqualTo(new SeriesSnapshot(scope, blueprintId, 5, null, null, null, active));
        assertThat(management.findAssessmentVersions(scope)).containsExactly(new AssessmentVersionRecord(
                assessmentId, generated.version(), 1, "PUBLISHED", "CLOSED", false, generated.contentHash(),
                generated.createdAt()));
        tx(() -> management.update(new Update(scope, 5, null, null, null, null,
                Transition.ACTIVE_ASSESSMENT_DISABLED, ACTOR_ID, abandoned, "Retired")));
        assertThat(management.findAssessmentVersions(scope)).singleElement()
                .extracting(AssessmentVersionRecord::disabled).isEqualTo(true);
        assertThat(management.findAssessmentVersions(new Scope(otherOrganization, OCCUPATION_ID))).isEmpty();
        assertThat(jdbc.queryForList("""
                SELECT series_revision || ':' || transition || ':' || coalesce(reason, '-') || ':'
                       || coalesce(previous_working_revision_id::text, '-') || ':' || coalesce(working_revision_id::text, '-')
                       || ':' || coalesce(pending_blueprint_version::text, '-') || ':'
                       || coalesce(open_assessment_version_id::text, '-') || ':'
                       || coalesce(previous_active_assessment_version_id::text, '-') || ':'
                       || coalesce(active_assessment_version_id::text, '-') || ':' || actor_id || ':'
                       || to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US')
                FROM platform.baseline_assessment_transition
                WHERE organization_id = ? AND occupation_id = ?
                ORDER BY series_revision
                """, String.class, ORGANIZATION_ID, OCCUPATION_ID)).containsExactly(
                "2:WORKING_REVISION_STARTED:-:-:" + workingId + ":-:-:-:-:" + ACTOR_ID + ":2026-10-17T08:00:00.123456",
                "3:PENDING_CHANGE_ABANDONED:Replaced:" + workingId + ":-:-:-:-:-:" + ACTOR_ID
                        + ":2026-10-17T08:02:00.123456",
                "4:ASSESSMENT_DRAFT_OPENED:-:-:-:1:" + assessmentId + ":-:-:" + ACTOR_ID + ":2026-10-17T08:02:00.123456",
                "5:ACTIVE_ASSESSMENT_SWITCHED:-:-:-:-:-:-:" + assessmentId + ":" + ACTOR_ID
                        + ":2026-10-17T08:02:00.123456",
                "6:ACTIVE_ASSESSMENT_DISABLED:Retired:-:-:-:-:" + assessmentId + ":-:" + ACTOR_ID
                        + ":2026-10-17T08:02:00.123456");

        Instant receivedAt = Instant.parse("2026-10-17T09:00:00.654321Z");
        var receipt = new CommandReceipt(scope, ACTOR_ID, "management-command", "ASSESSMENT_DISABLE",
                "a".repeat(64), "{\"ok\": true}", receivedAt);
        assertThat(management.findCommand(ACTOR_ID, "management-command")).isEmpty();
        txRun(() -> management.insertCommand(receipt));
        assertThat(management.findCommand(ACTOR_ID, "management-command")).contains(receipt);
        assertThat(management.findCommand(otherActor, "management-command")).isEmpty();
        assertThatThrownBy(() -> txRun(() -> management.insertCommand(receipt)))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class)
                .hasMessageContaining("Idempotency key already exists");

        var secondScope = new Scope(ORGANIZATION_ID, uuid(16).toString());
        UUID secondBlueprint = uuid(920);
        var bootstrapped = tx(() -> management.createAndLock(secondScope, secondBlueprint, ACTOR_ID, receivedAt));
        assertThat(bootstrapped).isEqualTo(new SeriesSnapshot(secondScope, secondBlueprint, 1, null, null, null, null));
        assertThat(jdbc.queryForObject("SELECT created_at FROM platform.baseline_blueprint WHERE blueprint_id = ?",
                Timestamp.class, secondBlueprint).toInstant()).isEqualTo(receivedAt);
        assertThat(tx(() -> management.createAndLock(secondScope, secondBlueprint, ACTOR_ID, receivedAt)))
                .isEqualTo(bootstrapped);
        assertThatThrownBy(() -> tx(() -> management.createAndLock(secondScope, uuid(921), ACTOR_ID, receivedAt)))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class)
                .hasMessageContaining("already have a blueprint identity");
        assertThatThrownBy(() -> tx(() -> management.createAndLock(
                new Scope(ORGANIZATION_ID, uuid(17).toString()), uuid(922), otherActor, receivedAt)))
                .isInstanceOf(BaselineAssessmentManagementStore.WriteConflict.class)
                .hasMessageContaining("does not belong");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM platform.baseline_blueprint WHERE blueprint_id = ?",
                Long.class, uuid(922))).isZero();
    }

    @Test
    void draftStoreEditsClosesAndClonesCandidatesOnlyWithinTheOrganization() {
        var blueprint = blueprintService.create("edit-blueprint", blueprintDraft("Editable"));
        var generated = draftService.generate(blueprint.blueprintId(), 1, "edit-generate");
        UUID replacement = uuid(105);
        insertItem(replacement, uuid(204), 1, "Replacement EASY question", "EASY", "5".repeat(64));
        String organization = ORGANIZATION_ID.toString();
        String otherOrganization = uuid(930).toString();
        UUID id = generated.assessmentVersionId();

        assertThat(draftStore.findByVersionId(organization, id)).contains(generated);
        assertThat(draftStore.findByVersionId(otherOrganization, id)).isEmpty();
        assertThat(tx(() -> draftStore.review(otherOrganization, id, ACTOR_ID, Instant.now(), generated.contentHash())))
                .isFalse();
        assertThat(tx(() -> draftStore.publish(otherOrganization, id, generated.contentHash()))).isFalse();

        UUID otherActor = uuid(931);
        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, 'ORG_EDIT', 'Other')",
                UUID.fromString(otherOrganization));
        jdbc.update("""
                INSERT INTO platform.account(
                    account_id, organization_id, identifier, normalized_identifier, password_hash)
                VALUES (?, ?, 'other-editor', 'other-editor', 'not-a-login')
                """, otherActor, UUID.fromString(otherOrganization));
        assertThatThrownBy(() -> tx(() -> draftStore.insertNextVersion(new NewDraft(uuid(932), generated.assessmentId(),
                "Foreign", blueprint.blueprintId(), 1, 7L, otherActor, Instant.now(), "foreign-generate",
                "7".repeat(64), "8".repeat(64), List.of()))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("outside the trusted organization");

        BaselineAssessmentDraft.Item easySlot = generated.items().stream()
                .filter(item -> item.difficulty().equals("EASY")).findFirst().orElseThrow();
        List<UUID> reordered = new ArrayList<>(generated.items().stream()
                .map(BaselineAssessmentDraft.Item::itemVersionId).toList());
        Collections.reverse(reordered);
        reordered.set(reordered.indexOf(easySlot.itemVersionId()), replacement);
        assertThatThrownBy(() -> tx(() -> draftStore.updateManifest(otherOrganization, id, 1, "Edited", reordered)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> tx(() -> draftStore.updateManifest(organization, id, 1, "Edited",
                reordered.subList(0, 2))))
                .isInstanceOf(IllegalArgumentException.class);

        var edited = tx(() -> draftStore.updateManifest(organization, id, 1, "  Edited title ", reordered));
        assertThat(edited.title()).isEqualTo("Edited title");
        assertThat(edited.draftRevision()).isEqualTo(2);
        assertThat(edited.contentHash()).isNotEqualTo(generated.contentHash()).hasSize(64);
        assertThat(edited.items()).extracting(BaselineAssessmentDraft.Item::itemVersionId)
                .containsExactlyElementsOf(reordered);
        assertThat(edited.items()).extracting(BaselineAssessmentDraft.Item::position).containsExactly(1, 2, 3);
        assertThat(edited.items()).filteredOn(item -> item.itemVersionId().equals(replacement)).singleElement()
                .satisfies(item -> {
                    assertThat(item.roleId()).isEqualTo(easySlot.roleId());
                    assertThat(item.roleNameSnapshot()).isEqualTo(easySlot.roleNameSnapshot());
                    assertThat(item.scoringWeight()).isEqualTo(easySlot.scoringWeight());
                    assertThat(item.prompt()).isEqualTo("Replacement EASY question");
                });
        assertThat(draftStore.findByVersionId(organization, id)).contains(edited);
        assertThatThrownBy(() -> tx(() -> draftStore.updateManifest(organization, id, 1, "Stale", reordered)))
                .isInstanceOf(BaselineAssessmentDraftStore.WriteConflict.class);

        assertThatThrownBy(() -> txRun(() -> draftStore.closeCandidate(otherOrganization, id)))
                .isInstanceOf(BaselineAssessmentDraftStore.WriteConflict.class);
        txRun(() -> draftStore.closeCandidate(organization, id));
        assertThat(jdbc.queryForObject("""
                SELECT baseline_candidate_state FROM platform.assessment_version WHERE assessment_version_id = ?
                """, String.class, id)).isEqualTo("CLOSED");
        assertThatThrownBy(() -> txRun(() -> draftStore.closeCandidate(organization, id)))
                .isInstanceOf(BaselineAssessmentDraftStore.WriteConflict.class);

        Instant clonedAt = Instant.parse("2026-10-18T10:15:30.123456Z");
        UUID cloneId = uuid(940);
        assertThatThrownBy(() -> tx(() -> draftStore.cloneAsOpenCandidate(new CloneCandidate(
                otherOrganization, id, uuid(941), ACTOR_ID, clonedAt, "clone-other", "6".repeat(64)))))
                .isInstanceOf(IllegalArgumentException.class);
        var clone = tx(() -> draftStore.cloneAsOpenCandidate(new CloneCandidate(
                organization, id, cloneId, ACTOR_ID, clonedAt, " clone-key ", "6".repeat(64))));
        assertThat(clone).isEqualTo(new BaselineAssessmentDraft(cloneId, edited.assessmentId(), 2, "Edited title",
                edited.blueprintId(), edited.blueprintVersion(), edited.generationSeed(), ACTOR_ID, clonedAt,
                "6".repeat(64), edited.contentHash(), 1, PublicationState.DRAFT, null, null, null, edited.items()));
        assertThat(jdbc.queryForObject("""
                SELECT generation_idempotency_key || ':' || baseline_candidate_state || ':' || scoring_version || ':'
                       || coalesce(pass_threshold::text, '-') || ':' || purpose
                FROM platform.assessment_version WHERE assessment_version_id = ?
                """, String.class, cloneId)).isEqualTo("clone-key:OPEN:BASELINE_BLUEPRINT_WEIGHT_V1:-:BASELINE");
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM platform.assessment_item WHERE assessment_version_id = ? AND required
                """, Long.class, cloneId)).isEqualTo(3L);
        assertThatThrownBy(() -> tx(() -> draftStore.cloneAsOpenCandidate(new CloneCandidate(
                organization, id, uuid(942), ACTOR_ID, clonedAt, "clone-key", "6".repeat(64)))))
                .isInstanceOf(BaselineAssessmentDraftStore.WriteConflict.class);
    }

    private <T> T tx(Supplier<T> work) {
        return storeTransactions.execute(status -> work.get());
    }

    private void txRun(Runnable work) {
        storeTransactions.executeWithoutResult(status -> work.run());
    }

    private BlueprintDraft blueprintDraft(String name) {
        return new BlueprintDraft(name, OCCUPATION_ID, "Client occupation", List.of(
                new RoleConfig(
                        ROLE_ID, "Client role snapshot", true,
                        new BigDecimal("0.2"), new BigDecimal("0.3"), new BigDecimal("0.5"),
                        List.of(new SkillConfig(SKILL_ID, "Client skill snapshot", 1, 1, 1))),
                new RoleConfig(
                        ZERO_ROLE_ID, "Client zero role", true,
                        new BigDecimal("0.2"), new BigDecimal("0.3"), new BigDecimal("0.5"),
                        List.of(new SkillConfig(ZERO_SKILL_ID, "Client zero skill", 0, 0, 0)))));
    }

    private TargetRoleCatalogPort catalog() {
        var detail = new TargetRoleDetail(
                ROLE_ID, "JAVA_BACKEND_P3", "Java Backend Engineer", "ENGINEERING",
                CareerTrack.PROFESSIONAL, null, List.of(),
                List.of(new TargetRoleRequirement(SKILL_ID, "JAVA_CORE", "Java Core", 0.8)));
        return new TargetRoleCatalogPort() {
            @Override
            public List<TargetRoleSummary> findAvailableRoles(String organizationId, Criteria criteria) {
                return ORGANIZATION_ID.toString().equals(organizationId) ? List.of() : List.of();
            }

            @Override
            public Optional<TargetRoleDetail> findAvailableRole(String organizationId, String roleId) {
                return ORGANIZATION_ID.toString().equals(organizationId) && ROLE_ID.equals(roleId)
                        ? Optional.of(detail)
                        : Optional.empty();
            }
        };
    }

    private BaselineOccupationCatalogPort occupationCatalog() {
        return new BaselineOccupationCatalogPort() {
            @Override
            public List<CatalogOccupationSummary> findAvailableOccupations(String organizationId) {
                return List.of(new CatalogOccupationSummary(
                        OCCUPATION_ID, "Software Engineering", "test-v1", 2));
            }

            @Override
            public Optional<CatalogOccupation> findAvailableOccupation(
                    String organizationId, String occupationId) {
                if (!ORGANIZATION_ID.toString().equals(organizationId)
                        || !OCCUPATION_ID.equals(occupationId)) {
                    return Optional.empty();
                }
                return Optional.of(new CatalogOccupation(
                        OCCUPATION_ID, "Software Engineering", "test-v1", List.of(
                                new CatalogRole(ROLE_ID, "Java Backend Engineer", "role-v1",
                                        List.of(new CatalogSkill(SKILL_ID, "Java Core", "skill-v1"))),
                                new CatalogRole(ZERO_ROLE_ID, "Platform Engineer", "role-v1",
                                        List.of(new CatalogSkill(
                                                ZERO_SKILL_ID, "Platform Operations", "skill-v1"))))));
            }
        };
    }

    private void seedIdentityAndQuestionBank() {
        jdbc.update("""
                INSERT INTO platform.organization(organization_id, code, name)
                VALUES (?, 'ORG_ALPHA', 'Organization Alpha')
                """, ORGANIZATION_ID);
        jdbc.update("""
                INSERT INTO platform.account(
                    account_id, organization_id, identifier, normalized_identifier, password_hash)
                VALUES (?, ?, 'ld-manager', 'ld-manager', 'not-a-login')
                """, ACTOR_ID, ORGANIZATION_ID);
        jdbc.update("""
                INSERT INTO platform.question_bank(question_bank_id, name, created_by)
                VALUES (?, 'Baseline integration bank', ?)
                """, QUESTION_BANK_ID, ACTOR_ID);
        insertItem(uuid(101), uuid(201), 1, "Old EASY question", "EASY", "1".repeat(64));
        insertItem(uuid(102), uuid(201), 2, "Latest EASY question", "EASY", "2".repeat(64));
        insertItem(uuid(103), uuid(202), 1, "MEDIUM question", "MEDIUM", "3".repeat(64));
        insertItem(uuid(104), uuid(203), 1, "HARD question", "HARD", "4".repeat(64));
    }

    private void insertItem(
            UUID itemVersionId, UUID itemId, int version, String prompt,
            String difficulty, String contentHash) {
        jdbc.update("""
                INSERT INTO platform.item_version(
                    item_version_id, item_id, version, question_bank_id, prompt,
                    response_schema, protected_key, publication_state, content_hash,
                    micro_skill_id, micro_skill_name_snapshot, difficulty)
                VALUES (?, ?, ?, ?, ?, '{"type":"single-choice","options":["A","B"]}'::jsonb,
                    '{"correctOption":"A"}'::jsonb, 'PUBLISHED', ?, ?, 'Java Core', ?)
                """, itemVersionId, itemId, version, QUESTION_BANK_ID, prompt,
                contentHash, SKILL_ID, difficulty);
    }

    private static UUID uuid(long value) {
        return new UUID(0L, value);
    }

    private static final class TransactionalBlueprintStore implements BaselineBlueprintStore {
        private final BaselineBlueprintStore delegate;
        private final TransactionTemplate transactions;

        private TransactionalBlueprintStore(BaselineBlueprintStore delegate, TransactionTemplate transactions) {
            this.delegate = delegate;
            this.transactions = transactions;
        }

        @Override
        public Optional<com.adaptlearngraph.entities.domain.BaselineBlueprint> findLatest(UUID blueprintId) {
            return delegate.findLatest(blueprintId);
        }

        @Override
        public Optional<com.adaptlearngraph.entities.domain.BaselineBlueprint> findVersion(
                UUID blueprintId, int version) {
            return delegate.findVersion(blueprintId, version);
        }

        @Override
        public Optional<com.adaptlearngraph.entities.domain.BaselineBlueprint> findLatestByOccupation(
                String occupationId) {
            return delegate.findLatestByOccupation(occupationId);
        }

        @Override
        public Optional<com.adaptlearngraph.entities.domain.BaselineBlueprint> findByRequest(
                UUID actorId, String idempotencyKey) {
            return delegate.findByRequest(actorId, idempotencyKey);
        }

        @Override
        public void insert(com.adaptlearngraph.entities.domain.BaselineBlueprint blueprint) {
            transactions.executeWithoutResult(status -> delegate.insert(blueprint));
        }
    }

    private static final class TransactionalDraftStore implements BaselineAssessmentDraftStore {
        private final BaselineAssessmentDraftStore delegate;
        private final TransactionTemplate transactions;

        private TransactionalDraftStore(BaselineAssessmentDraftStore delegate, TransactionTemplate transactions) {
            this.delegate = delegate;
            this.transactions = transactions;
        }

        @Override
        public List<CandidateItem> findPublishedCandidates(Set<String> microSkillIds) {
            return delegate.findPublishedCandidates(microSkillIds);
        }

        @Override
        public Optional<com.adaptlearngraph.entities.domain.BaselineAssessmentDraft>
                findByGenerationRequest(UUID actorId, String idempotencyKey) {
            return delegate.findByGenerationRequest(actorId, idempotencyKey);
        }

        @Override
        public Optional<com.adaptlearngraph.entities.domain.BaselineAssessmentDraft>
                findByVersionId(UUID assessmentVersionId) {
            return delegate.findByVersionId(assessmentVersionId);
        }

        @Override
        public com.adaptlearngraph.entities.domain.BaselineAssessmentDraft insertNextVersion(NewDraft draft) {
            return transactions.execute(status -> delegate.insertNextVersion(draft));
        }

        @Override
        public boolean review(
                UUID assessmentVersionId, UUID reviewerId, Instant reviewedAt, String expectedContentHash) {
            return Boolean.TRUE.equals(transactions.execute(status ->
                    delegate.review(assessmentVersionId, reviewerId, reviewedAt, expectedContentHash)));
        }

        @Override
        public boolean publish(UUID assessmentVersionId, String expectedContentHash) {
            return Boolean.TRUE.equals(transactions.execute(status ->
                    delegate.publish(assessmentVersionId, expectedContentHash)));
        }

        @Override
        public com.adaptlearngraph.entities.domain.BaselineAssessmentDraft updateManifest(
                String organizationId, UUID assessmentVersionId, long expectedDraftRevision,
                String title, List<UUID> orderedItemVersionIds) {
            return transactions.execute(status -> delegate.updateManifest(
                    organizationId, assessmentVersionId, expectedDraftRevision, title, orderedItemVersionIds));
        }

        @Override
        public void closeCandidate(String organizationId, UUID assessmentVersionId) {
            transactions.executeWithoutResult(status -> delegate.closeCandidate(organizationId, assessmentVersionId));
        }

        @Override
        public com.adaptlearngraph.entities.domain.BaselineAssessmentDraft cloneAsOpenCandidate(
                CloneCandidate candidate) {
            return transactions.execute(status -> delegate.cloneAsOpenCandidate(candidate));
        }
    }
}
