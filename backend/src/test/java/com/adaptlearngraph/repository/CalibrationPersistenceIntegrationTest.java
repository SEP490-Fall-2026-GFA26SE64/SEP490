package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.entities.domain.Calibration.*;
import com.adaptlearngraph.entities.domain.CalibrationPolicy;
import com.adaptlearngraph.helper.CalibrationJson;
import com.adaptlearngraph.repository.CalibrationPorts.Grant;
import com.adaptlearngraph.repository.PromotionPorts.Command;
import com.adaptlearngraph.support.JpaTestContext;
import com.adaptlearngraph.utility.AdaptiveIrtPolicy;
import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

/** Calibration run lease lifecycle, candidate sealing/loading and atomic scoped promotion against the real V18/V28 schema. */
class CalibrationPersistenceIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static final String SKILL = "calibration-fixture-skill";
    private static JpaTestContext persistence;
    private static JdbcTemplate jdbc;
    private static CalibrationJson json;
    private static JpaCalibrationStore store;
    private static JpaParameterPromotionStore promotion;

    @BeforeAll
    static void start() {
        POSTGRES.start();
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/workspace-migration").load().migrate();
        persistence = JpaTestContext.start(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        jdbc = new JdbcTemplate(persistence.dataSource());
        json = new CalibrationJson(CalibrationPolicy.syntheticV2());
        var runs = persistence.bean(IrtCalibrationRunJpaRepository.class);
        var pins = persistence.bean(IrtCalibrationPinJpaRepository.class);
        var sets = persistence.bean(IrtTechnicalVersionJpaRepository.class);
        store = new JpaCalibrationStore(persistence.dataSource(), runs, pins, sets, persistence.bean(IrtItemParameterJpaRepository.class),
                new PostgresAdvisoryLocks(persistence.bean(EntityManager.class)), json, persistence.transactionManager());
        promotion = new JpaParameterPromotionStore(store, runs, pins, sets, persistence.bean(IrtEffectiveParameterSelectionJpaRepository.class),
                persistence.bean(IrtParameterPromotionCommandJpaRepository.class), persistence.bean(AuditEventJpaRepository.class), json);
    }

    @AfterAll
    static void stop() {
        persistence.close();
        POSTGRES.stop();
    }

    @Test
    void concurrentWorkersNeverClaimTheSameRunAndStaleOwnersCannotCompleteOrFail() throws Exception {
        var fixture = fixture();
        Scope scope = fixture.scope();
        var reserved = store.transaction(scope, () -> store.reserve(fixture.envelope()));
        assertThat(reserved.status()).isEqualTo(Status.PENDING);
        assertThatThrownBy(() -> store.transaction(scope, () -> store.reserve(fixture.envelope())))
                .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(Code.CONFLICT));

        UUID first = UUID.randomUUID(), second = UUID.randomUUID();
        var start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        List<Future<Run>> claims = new ArrayList<>();
        try {
            for (UUID token : List.of(first, second)) {
                Callable<Run> claim = () -> {
                    start.await();
                    return store.transaction(scope, () -> store.claim(scope, reserved.id(), token));
                };
                claims.add(executor.submit(claim));
            }
            start.countDown();
            var winners = new ArrayList<Run>();
            int conflicts = 0;
            for (var claim : claims) {
                try {
                    winners.add(claim.get());
                } catch (java.util.concurrent.ExecutionException failed) {
                    assertThat(failed.getCause()).isInstanceOfSatisfying(Failure.class,
                            failure -> assertThat(failure.code()).isEqualTo(Code.CONFLICT));
                    conflicts++;
                }
            }
            assertThat(winners).hasSize(1);
            assertThat(conflicts).isEqualTo(1);
            Run claimed = winners.getFirst();
            assertThat(claimed.status()).isEqualTo(Status.RUNNING);
            UUID owner = UUID.fromString((String) claimed.diagnostics().get("workerToken"));
            UUID stale = owner.equals(first) ? second : first;

            assertThatThrownBy(() -> store.transaction(scope, () -> store.complete(scope, reserved.id(), stale, fixture.result())))
                    .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(Code.CONFLICT));
            assertThatThrownBy(() -> store.transaction(scope, () -> store.fail(scope, reserved.id(), stale, Code.TIMEOUT, Map.of())))
                    .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(Code.CONFLICT));
            assertThat(jdbc.queryForMap("""
                    SELECT status,diagnostics->>'workerToken' AS token,output_parameter_set_id FROM platform.irt_calibration_run
                    WHERE calibration_run_id=?
                    """, reserved.id())).containsEntry("status", "RUNNING").containsEntry("token", owner.toString())
                    .containsEntry("output_parameter_set_id", null);

            var failed = store.transaction(scope, () -> store.fail(scope, reserved.id(), owner, Code.NON_CONVERGENCE, Map.of("detail", "x")));
            assertThat(failed.status()).isEqualTo(Status.FAILED);
            assertThat(failed.diagnostics()).containsEntry("reason", "NON_CONVERGENCE").containsEntry("detail", "x");
            assertThat(failed.completedAt()).isAfterOrEqualTo(failed.startedAt());
            assertThatThrownBy(() -> store.transaction(scope, () -> store.complete(scope, reserved.id(), owner, fixture.result())))
                    .as("a terminal run cannot be completed by its former owner")
                    .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(Code.CONFLICT));
            assertThat(store.transaction(scope, () -> store.fail(scope, reserved.id(), stale, Code.TIMEOUT, Map.of())).status())
                    .as("fail reconciles an already terminal run").isEqualTo(Status.FAILED);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void cancellationOfPendingAndRunningRunsAndScopeIsolation() {
        var fixture = fixture();
        Scope scope = fixture.scope();
        var pending = store.transaction(scope, () -> store.reserve(fixture.envelope()));
        var cancelled = store.transaction(scope, () -> store.cancel(scope, pending.id()));
        assertThat(cancelled.status()).isEqualTo(Status.FAILED);
        assertThat(cancelled.diagnostics()).containsEntry("reason", "CANCELLED");

        var other = fixture(UUID.randomUUID());
        var running = store.transaction(other.scope(), () -> {
            store.reserve(other.envelope());
            return store.claim(other.scope(), other.envelope().request().runId(), UUID.randomUUID());
        });
        var requested = store.transaction(other.scope(), () -> store.cancel(other.scope(), running.id()));
        assertThat(requested.status()).isEqualTo(Status.RUNNING);
        assertThat(requested.diagnostics()).containsEntry("cancelRequested", true);
        UUID owner = UUID.fromString((String) requested.diagnostics().get("workerToken"));
        assertThatThrownBy(() -> store.transaction(other.scope(), () -> store.complete(other.scope(), running.id(), owner, other.result())))
                .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(Code.CANCELLED));
        assertThatThrownBy(() -> store.transaction(other.scope(), () -> store.recoverExpired(other.scope(), running.id())))
                .as("an unexpired lease is not recoverable")
                .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(Code.CONFLICT));

        Scope foreign = new Scope(UUID.randomUUID(), scope.bankId(), scope.modelId());
        assertThat(store.transaction(foreign, () -> store.find(foreign, pending.id()))).as("organization-scoped find").isEmpty();
        assertThatThrownBy(() -> store.find(scope, pending.id())).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void completedCandidateRoundTripsAndPromotesAtomicallyWithReceiptAndAudit() {
        var fixture = fixture();
        Scope scope = fixture.scope();
        var grant = new Grant(fixture.actor(), scope);
        var inputs = new JpaCalibrationInputSource(persistence.bean(IrtCalibrationPinJpaRepository.class),
                (g, expected) -> fixture.bank(), (g, reference, hash) -> fixture.dataset(), json);
        var input = inputs.load(grant, fixture.envelope().request());
        assertThat(input.modelPin()).isEqualTo(fixture.envelope().modelPin());

        UUID worker = UUID.randomUUID();
        UUID runId = fixture.envelope().request().runId();
        store.transaction(scope, () -> {
            inputs.revalidate(grant, fixture.envelope().request(), input);
            store.reserve(fixture.envelope());
            return store.claim(scope, runId, worker);
        });
        var completed = store.transaction(scope, () -> store.complete(scope, runId, worker, fixture.result()));
        assertThat(completed.status()).isEqualTo(Status.SUCCEEDED);
        assertThat(completed.outputId()).isNotNull();
        assertThat(completed.diagnostics()).containsEntry("runtimeCompatibility", "COMPATIBLE")
                .containsEntry("operationalPromotionEligible", false);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM platform.irt_item_parameter WHERE parameter_set_id=?", Long.class,
                completed.outputId())).isEqualTo(2L);

        var candidate = store.transaction(scope, () -> store.candidate(scope, completed.outputId()));
        assertThat(candidate.status()).isEqualTo("CANDIDATE");
        assertThat(candidate.source()).isEqualTo("CALIBRATED");
        assertThat(candidate.result().items()).isEqualTo(fixture.result().items());
        assertThat(candidate.parameterHash()).isEqualTo(completed.diagnostics().get("parameterHash"));
        assertThat(candidate.createdAt()).isNotNull();
        assertThat(candidate.activatedBy()).isNull();
        Scope foreign = new Scope(UUID.randomUUID(), scope.bankId(), scope.modelId());
        assertThatThrownBy(() -> store.transaction(foreign, () -> store.candidate(foreign, completed.outputId())))
                .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(Code.NOT_FOUND));

        var command = new Command(scope, candidate.id(), candidate.parameterHash(), fixture.configurationHash(), "a".repeat(64), 0, null,
                "promote-" + runId, "Fixture promotion");
        String requestHash = json.hash(command);
        var selection = promotion.transaction(scope, () -> {
            assertThat(promotion.receipt(grant, command.idempotencyKey())).isEmpty();
            assertThat(promotion.effective(scope)).isEmpty();
            var loaded = promotion.candidate(scope, command.candidateId());
            promotion.validatePins(command, loaded);
            return promotion.promote(grant, command, loaded, requestHash);
        });
        assertThat(selection.revision()).isEqualTo(1);
        assertThat(selection.parameterSetId()).isEqualTo(candidate.id());

        var receipt = promotion.transaction(scope, () -> promotion.receipt(grant, command.idempotencyKey())).orElseThrow();
        assertThat(receipt.requestHash()).isEqualTo(requestHash);
        assertThat(receipt.outcome()).isEqualTo(selection);
        assertThat(promotion.transaction(scope, () -> promotion.effective(scope))).contains(selection);
        assertThat(promotion.transaction(scope, () -> promotion.receipt(new Grant(fixture.foreignActor(), scope), command.idempotencyKey())))
                .as("receipts are actor scoped").isEmpty();
        assertThat(store.transaction(scope, () -> store.candidate(scope, candidate.id())).status()).isEqualTo("PROMOTED");
        assertThat(jdbc.queryForMap("""
                SELECT action,resource_id,resource_revision,outcome FROM platform.audit_event WHERE resource_id=? AND action='IRT_PARAMETER_PROMOTED'
                """, candidate.id())).containsEntry("resource_revision", "1").containsEntry("outcome", "SUCCEEDED");

        assertThatThrownBy(() -> promotion.transaction(scope, () -> promotion.promote(grant,
                new Command(scope, candidate.id(), candidate.parameterHash(), fixture.configurationHash(), "a".repeat(64), 0, null,
                        "promote-again-" + runId, "Fixture promotion"), candidate, requestHash)))
                .as("state-guarded promotion of a non-candidate set")
                .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(Code.CONFLICT));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM platform.irt_parameter_promotion_command WHERE parameter_set_id=?", Long.class,
                candidate.id())).as("a rejected promotion leaves no receipt").isEqualTo(1L);
    }

    @Test
    void workerLeaseIsGlobalAndReleasedOnClose() {
        var lease = store.acquireWorker();
        try {
            assertThatThrownBy(store::acquireWorker)
                    .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(Code.RESOURCE_LIMIT));
        } finally {
            lease.close();
        }
        store.acquireWorker().close();
    }

    record Fixture(Scope scope, UUID actor, UUID foreignActor, String configurationHash, Bank bank, Dataset dataset, Envelope envelope,
            Result result) {}

    private static Fixture fixture() {
        return fixture(UUID.randomUUID());
    }

    private static Fixture fixture(UUID runId) {
        UUID org = UUID.randomUUID(), actor = UUID.randomUUID(), foreignActor = UUID.randomUUID(), bankId = UUID.randomUUID(),
                model = UUID.randomUUID();
        Instant approvedAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
        jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,?,'Calibration Org')", org,
                "CAL-" + org.toString().substring(0, 8).toUpperCase());
        for (UUID account : List.of(actor, foreignActor)) {
            jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?,?)",
                    account, org, account + "@calibration.test", account + "@calibration.test", "unusable");
        }
        jdbc.update("""
                INSERT INTO platform.model_version(model_version_id,algorithm,version,parameter_hash,configuration,artifact_ref,approved_by,approved_at)
                VALUES (?,'IRT_3PL',?,?,CAST(? AS jsonb),'test:calibration',?,?)
                """, model, "calibration-" + model, "a".repeat(64), json.write(AdaptiveIrtPolicy.referenceModelV1()), actor, Timestamp.from(approvedAt));
        String configurationHash = json.hash(json.tree(jdbc.queryForObject(
                "SELECT configuration::text FROM platform.model_version WHERE model_version_id=?", String.class, model)));
        jdbc.update("INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,'Calibration bank',?)", bankId, actor);
        var pins = new ArrayList<ItemPin>();
        for (int i = 0; i < 2; i++) {
            UUID item = UUID.randomUUID();
            String schema = json.write(Map.of("type", "SINGLE_CHOICE", "options", List.of(Map.of("id", "a", "text", "A"), Map.of("id", "b", "text", "B"))));
            String key = json.write(Map.of("correctOptionId", "a"));
            String content = jdbc.queryForObject("""
                    SELECT jsonb_build_object('itemVersionId',CAST(? AS uuid),'itemId',CAST(? AS uuid),'version',1,
                      'microSkillId',CAST(? AS text),'microSkillName',CAST(? AS text),'difficulty','EASY',
                      'prompt',CAST(? AS text),'responseSchema',CAST(? AS jsonb),'protectedKey',CAST(? AS jsonb),
                      'publicationState','PUBLISHED','questionBankId',CAST(? AS uuid))::text
                    """, String.class, item, item, SKILL, SKILL, "Calibration question " + i, schema, key, bankId);
            String hash = json.hash(json.tree(content));
            jdbc.update("""
                    INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,
                      protected_key,publication_state,content_hash,micro_skill_id,micro_skill_name_snapshot,difficulty)
                    VALUES (?,?,1,?,?,CAST(? AS jsonb),CAST(? AS jsonb),'PUBLISHED',?,?,?,'EASY')
                    """, item, item, bankId, "Calibration question " + i, schema, key, hash, SKILL, SKILL);
            pins.add(new ItemPin(item, item, 1, SKILL, hash));
        }
        // Candidate content is read back in (skill, item id text) order, which is the order the parameter hash covers.
        pins.sort(Comparator.comparing(ItemPin::skillId).thenComparing(pin -> pin.itemVersionId().toString()));
        var source = new Source(bankId, "calibration-v1", "1".repeat(64), "2".repeat(64), "3".repeat(64));
        var bank = new Bank(source, pins.stream().map(pin -> new Item(pin, List.of("a", "b", "c", "d"), "a")).toList());
        var dataset = new Dataset(Origin.ACTUAL_PILOT, "calibration-fixture", null, "4".repeat(64),
                List.of(new SkillResponses(SKILL, pins.stream().map(ItemPin::itemVersionId).toList(), List.of())));
        String datasetHash = json.hash(dataset);
        var scope = new Scope(org, bankId, model);
        var request = new Request(runId, scope, source, "dataset:calibration-fixture", datasetHash, configurationHash, "a".repeat(64),
                json.algorithmHash());
        var modelPin = new ModelPin(model, "IRT_3PL", "calibration-" + model, "a".repeat(64), configurationHash, "test:calibration", actor,
                approvedAt);
        var envelope = new Envelope(2, actor, request, pins, Origin.ACTUAL_PILOT, "4".repeat(64), null, modelPin);
        var items = pins.stream().map(pin -> new ItemFit(pin, 1.25, -0.5, .25, 1000, 600, .6, .6, 0, "UNAVAILABLE_NOT_VALIDATED", false))
                .toList();
        var result = new Result(Origin.ACTUAL_PILOT, CalibrationPolicy.syntheticV2().algorithm(), json.algorithmHash(), datasetHash,
                "4".repeat(64), null, items, List.of(new SkillFit(SKILL, 1000, 5, -700, -690, 1e-7, 1e-4, true)), 25);
        return new Fixture(scope, actor, foreignActor, configurationHash, bank, dataset, envelope, result);
    }
}
