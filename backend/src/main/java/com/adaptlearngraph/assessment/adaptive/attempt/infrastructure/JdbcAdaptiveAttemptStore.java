package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintStore;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt.Scope;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Supplier;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

/** V19 persistence only. No automatic registration, actor fake, current-catalog reread or deadline worker. */
public final class JdbcAdaptiveAttemptStore extends JdbcAdaptiveAttemptState {
    public JdbcAdaptiveAttemptStore(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper,
                                   PlatformTransactionManager manager, AdaptiveBlueprintStore blueprints) {
        super(new AdaptiveAttemptJdbc(jdbc, manager), new AdaptiveAttemptRows(jdbc, mapper, blueprints));
    }

    @Override public <T> T inTransaction(Scope scope, Supplier<T> work) { return db.scoped(scope, work); }
    @Override public Instant observedAt(Scope scope) {
        db.require(scope);
        return db.jdbc.queryForObject("SELECT clock_timestamp()", new MapSqlParameterSource(), (rs, n) -> rs.getTimestamp(1).toInstant());
    }
    @Override public Optional<AdaptiveAttempt> findOwned(UUID org, UUID learner, UUID id) {
        return AdaptiveAttemptJdbc.read(() -> db.jdbc.query("""
                SELECT * FROM platform.baseline_adaptive_attempt WHERE organization_id=:org AND learner_id=:learner AND attempt_id=:id
                """, new MapSqlParameterSource("org", org).addValue("learner", learner).addValue("id", id), (rs, n) -> rows.header(rs)).stream().findFirst());
    }
    private Optional<AdaptiveAttempt> find(Scope scope, UUID id, String condition) {
        return AdaptiveAttemptJdbc.read(() -> db.jdbc.query("SELECT a.* FROM platform.baseline_adaptive_attempt a WHERE a.organization_id=:org AND a.learner_id=:learner AND a.occupation_id=:occupation AND " + condition,
                AdaptiveAttemptJdbc.key(scope, id), (rs, n) -> rows.header(rs)).stream().findFirst());
    }
    @Override public Optional<Scope> findReceiptScope(UUID org, UUID learner, String key) {
        return AdaptiveAttemptJdbc.read(() -> db.jdbc.query("""
                SELECT occupation_id FROM platform.baseline_attempt_command
                WHERE organization_id=:org AND actor_id=:actor AND idempotency_key=:key
                """, new MapSqlParameterSource("org", org).addValue("actor", learner).addValue("key", key),
                (rs, row) -> new Scope(org, learner, rs.getString(1))).stream().findFirst());
    }
    @Override public Optional<AdaptiveAttempt> find(Scope scope, UUID id) { return find(scope, id, "a.attempt_id=:id"); }
    @Override public Optional<AdaptiveAttempt> findInProgress(Scope scope) { return find(scope, null, "a.state='IN_PROGRESS'"); }
    @Override public Optional<AdaptiveAttempt> findLatest(Scope scope) {
        return find(scope, null, "NOT EXISTS (SELECT 1 FROM platform.baseline_adaptive_attempt successor WHERE successor.replaces_attempt_id=a.attempt_id)");
    }
    @Override public boolean hasMasteryProducingCompletion(Scope scope) {
        return AdaptiveAttemptJdbc.read(() -> Boolean.TRUE.equals(db.jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM platform.baseline_adaptive_attempt
                WHERE organization_id=:org AND learner_id=:learner AND occupation_id=:occupation AND state IN ('SUBMITTED','AUTO_SUBMITTED'))
                """, AdaptiveAttemptJdbc.key(scope, null), Boolean.class)));
    }

    @Override public void insert(Scope scope, AdaptiveAttempt attempt, List<SkillState> skills, PresentedItem first) {
        db.require(scope);
        if (!scope.equals(attempt.scope())) throw new Failure(Code.FORBIDDEN);
        db.jdbc.update("""
                INSERT INTO platform.baseline_adaptive_attempt(attempt_id,organization_id,learner_id,occupation_id,attempt_purpose,
                    target_role_id,target_selection_revision,blueprint_id,blueprint_version,model_version_id,mastery_mapping_version_id,
                    parameter_set_id,catalog_fingerprint,max_questions,time_limit_seconds,state,revision,started_at,deadline_at,
                    finished_at,completion_reason,replaces_attempt_id,scope_policy)
                VALUES (:id,:org,:learner,:occupation,:purpose,:role,:selection,:blueprint,:version,:model,:mapping,
                    :parameters,:fingerprint,:maximum,:duration,:state,:revision,:started,:deadline,:finished,:reason,:replaces,:policy)
                """, rows.parameters(attempt));
        initialize(attempt, skills, first);
    }
    @Override public void save(Scope scope, long expectedRevision, AdaptiveAttempt next) {
        db.owned(scope, next.id());
        var current = find(scope, next.id()).orElseThrow();
        var intended = new AdaptiveAttempt(current.id(), current.scope(), current.snapshot(), next.revision(), next.status(),
                current.startedAt(), current.deadlineAt(), next.finishedAt(), current.replacesAttemptId(), next.completionReason());
        if (!intended.equals(next) || next.revision() != Math.incrementExact(expectedRevision)) throw new Failure(Code.VERSION_CONFLICT);
        AdaptiveAttemptJdbc.changed(db.jdbc.update("""
                UPDATE platform.baseline_adaptive_attempt SET state=:state,revision=:revision,finished_at=:finished,completion_reason=:reason
                WHERE organization_id=:org AND learner_id=:learner AND occupation_id=:occupation AND attempt_id=:id
                    AND revision=:expected AND state='IN_PROGRESS'
                """, rows.parameters(next).addValue("expected", expectedRevision)));
    }

    @Override public Optional<Receipt> findReceipt(UUID org, UUID learner, String key) {
        db.requireReceipt(org, learner);
        return db.jdbc.query("""
                SELECT * FROM platform.baseline_attempt_command WHERE organization_id=:org AND actor_id=:actor AND idempotency_key=:key
                """, new MapSqlParameterSource("org", org).addValue("actor", learner).addValue("key", key), (rs, n) -> {
            Receipt receipt = rows.read(rs.getString("response_payload"), Receipt.class);
            if (!receipt.scope().equals(new Scope(org, learner, rs.getString("occupation_id"))) || !receipt.idempotencyKey().equals(key)
                    || receipt.operation() != Operation.valueOf(rs.getString("operation")) || !receipt.requestHash().equals(rs.getString("request_hash"))
                    || !receipt.outcome().id().equals(rs.getObject("attempt_id", UUID.class)) || !receipt.createdAt().equals(rs.getTimestamp("created_at").toInstant())) {
                throw new IllegalStateException("Stored attempt receipt metadata mismatch");
            }
            return receipt;
        }).stream().findFirst();
    }
    @Override public void insertReceipt(Scope scope, Receipt receipt) {
        db.require(scope); db.requireReceipt(scope.organizationId(), scope.learnerId());
        if (!scope.equals(receipt.scope())) throw new Failure(Code.FORBIDDEN);
        if (!find(scope, receipt.outcome().id()).orElseThrow().equals(receipt.outcome())
                || !progress(scope, receipt.outcome().id()).equals(receipt.progress())) throw new Failure(Code.VERSION_CONFLICT);
        try {
            db.jdbc.update("""
                    INSERT INTO platform.baseline_attempt_command(organization_id,actor_id,idempotency_key,attempt_id,occupation_id,
                        operation,request_hash,response_payload,created_at)
                    VALUES (:org,:learner,:key,:id,:occupation,:operation,:hash,CAST(:payload AS jsonb),:time)
                    """, AdaptiveAttemptJdbc.key(scope, receipt.outcome().id()).addValue("key", receipt.idempotencyKey())
                    .addValue("operation", receipt.operation().name()).addValue("hash", receipt.requestHash())
                    .addValue("payload", rows.write(receipt)).addValue("time", AdaptiveAttemptRows.time(receipt.createdAt())));
        } catch (DuplicateKeyException cause) {
            Failure failure = new Failure(Code.IDEMPOTENCY_CONFLICT);
            failure.initCause(cause);
            throw failure;
        }
    }

    @Override public void withExpired(UUID org, int limit, Consumer<AdaptiveAttempt> work) {
        if (org == null || org.equals(new UUID(0, 0)) || limit < 1 || limit > 100) throw new IllegalArgumentException("Organization and bounded batch required");
        db.transaction(false, () -> {
            var claimed = db.jdbc.query("""
                    SELECT * FROM platform.baseline_adaptive_attempt WHERE organization_id=:org AND state='IN_PROGRESS'
                        AND deadline_at<=clock_timestamp() ORDER BY deadline_at,attempt_id LIMIT :limit FOR UPDATE SKIP LOCKED
                    """, new MapSqlParameterSource("org", org).addValue("limit", limit), (rs, n) -> rows.header(rs));
            claimed.forEach(attempt -> db.inScope(attempt.scope(), () -> { work.accept(attempt); return null; }));
            return null;
        });
    }
}
