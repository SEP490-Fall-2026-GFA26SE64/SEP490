package com.adaptlearngraph.assessment.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.adaptlearngraph.assessment.application.BaselineAssessmentDraftService;
import com.adaptlearngraph.assessment.application.BaselineBlueprintService;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft.PublicationState;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import com.adaptlearngraph.catalog.domain.CareerTrack;
import com.adaptlearngraph.catalog.domain.Seniority;
import com.adaptlearngraph.catalog.domain.TargetRoleDetail;
import com.adaptlearngraph.catalog.domain.TargetRoleRequirement;
import com.adaptlearngraph.catalog.domain.TargetRoleSummary;
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
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
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
    private static final String SKILL_ID = uuid(12).toString();
    private static boolean dockerAvailable;

    private Flyway flyway;
    private JdbcTemplate jdbc;
    private BaselineBlueprintStore blueprints;
    private BaselineAssessmentDraftStore drafts;
    private BaselineBlueprintService blueprintService;
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
        var namedJdbc = new NamedParameterJdbcTemplate(dataSource);
        var transactions = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        blueprints = new TransactionalBlueprintStore(
                new JdbcBaselineBlueprintStore(namedJdbc), transactions);
        drafts = new TransactionalDraftStore(
                new JdbcBaselineAssessmentDraftStore(namedJdbc), transactions);
        var actor = (BaselineBlueprintStore.ActorPort) () -> Optional.of(
                new Actor(ACTOR_ID, ORGANIZATION_ID.toString(), true, Set.of("LD_MANAGER")));
        var validation = new BaselineBlueprintValidationAdapter(catalog(), namedJdbc);
        blueprintService = new BaselineBlueprintService(actor, blueprints, validation);
        draftService = new BaselineAssessmentDraftService(actor, blueprints, drafts);
        seedIdentityAndQuestionBank();
    }

    @Test
    void migratesThroughV12AndSecondMigrationRunIsNoOp() {
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("12");
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE success", Long.class)).isEqualTo(12L);
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
        assertThat(jdbc.queryForObject("""
                SELECT total_question_count
                FROM platform.baseline_blueprint_role
                WHERE blueprint_id = ? AND blueprint_version = 2
                """, Integer.class, first.blueprintId())).isEqualTo(3);

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

    private BlueprintDraft blueprintDraft(String name) {
        return new BlueprintDraft(name, null, null, List.of(new RoleConfig(
                ROLE_ID, "Client role snapshot", true,
                new BigDecimal("0.3"), new BigDecimal("0.4"), new BigDecimal("0.3"),
                List.of(new SkillConfig(SKILL_ID, "Client skill snapshot", 1, 1, 1)))));
    }

    private TargetRoleCatalogPort catalog() {
        var detail = new TargetRoleDetail(
                ROLE_ID, "JAVA_BACKEND_P3", "Java Backend Engineer", "ENGINEERING",
                CareerTrack.PROFESSIONAL, Seniority.P3, null, List.of(),
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
        public Optional<com.adaptlearngraph.assessment.domain.BaselineBlueprint> findLatest(UUID blueprintId) {
            return delegate.findLatest(blueprintId);
        }

        @Override
        public Optional<com.adaptlearngraph.assessment.domain.BaselineBlueprint> findVersion(
                UUID blueprintId, int version) {
            return delegate.findVersion(blueprintId, version);
        }

        @Override
        public Optional<com.adaptlearngraph.assessment.domain.BaselineBlueprint> findByRequest(
                UUID actorId, String idempotencyKey) {
            return delegate.findByRequest(actorId, idempotencyKey);
        }

        @Override
        public void insert(com.adaptlearngraph.assessment.domain.BaselineBlueprint blueprint) {
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
        public Optional<com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft>
                findByGenerationRequest(UUID actorId, String idempotencyKey) {
            return delegate.findByGenerationRequest(actorId, idempotencyKey);
        }

        @Override
        public Optional<com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft>
                findByVersionId(UUID assessmentVersionId) {
            return delegate.findByVersionId(assessmentVersionId);
        }

        @Override
        public com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft insertNextVersion(NewDraft draft) {
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
    }
}
