package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.AdaptiveAttempt;
import com.adaptlearngraph.entities.domain.AdaptiveAttempt.Scope;
import com.adaptlearngraph.entities.BaselineAttemptCommandEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;

/** V19 persistence only. No automatic registration, actor fake, current-catalog reread or deadline worker. */
public final class JpaAdaptiveAttemptStore extends JpaAdaptiveAttemptState {
    public JpaAdaptiveAttemptStore(AdaptiveAttemptRepositories data, ObjectMapper mapper,
                                   PlatformTransactionManager manager, AdaptiveBlueprintStore blueprints) {
        super(new AdaptiveAttemptJpa(data, manager), new AdaptiveAttemptRows(data, mapper, blueprints));
    }

    @Override public <T> T inTransaction(Scope scope, Supplier<T> work) { return db.scoped(scope, work); }
    @Override public Instant observedAt(Scope scope) {
        db.require(scope);
        return AdaptiveAttemptRows.instant(db.data.attempts().clockTimestamp());
    }
    @Override public Optional<AdaptiveAttempt> findOwned(UUID org, UUID learner, UUID id) {
        return AdaptiveAttemptJpa.read(() -> first(db.data.attempts().owned(org, learner, id)));
    }
    private Optional<AdaptiveAttempt> first(List<AdaptiveAttemptJpaRepository.Row> found) {
        return found.stream().map(rows::header).toList().stream().findFirst();
    }
    @Override public Optional<Scope> findReceiptScope(UUID org, UUID learner, String key) {
        return AdaptiveAttemptJpa.read(() -> db.data.commands().jobPosition(org, learner, key).stream()
                .map(jobPosition -> new Scope(org, learner, jobPosition)).toList().stream().findFirst());
    }
    @Override public Optional<AdaptiveAttempt> find(Scope scope, UUID id) {
        return AdaptiveAttemptJpa.read(() -> first(db.data.attempts().find(scope.organizationId(), scope.learnerId(), scope.jobPositionId(), id)));
    }
    @Override public Optional<AdaptiveAttempt> findInProgress(Scope scope) {
        return AdaptiveAttemptJpa.read(() -> first(db.data.attempts().inProgress(scope.organizationId(), scope.learnerId(), scope.jobPositionId())));
    }
    @Override public Optional<AdaptiveAttempt> findLatest(Scope scope) {
        return AdaptiveAttemptJpa.read(() -> first(db.data.attempts().latest(scope.organizationId(), scope.learnerId(), scope.jobPositionId())));
    }
    @Override public boolean hasMasteryProducingCompletion(Scope scope) {
        return AdaptiveAttemptJpa.read(() -> db.data.attempts().hasMasteryProducingCompletion(scope.organizationId(), scope.learnerId(),
                scope.jobPositionId()));
    }

    @Override public void insert(Scope scope, AdaptiveAttempt attempt, List<SkillState> skills, PresentedItem first) {
        db.require(scope);
        if (!scope.equals(attempt.scope())) throw new Failure(Code.FORBIDDEN);
        db.data.attempts().insert(rows.entity(attempt));
        initialize(attempt, skills, first);
    }
    @Override public void save(Scope scope, long expectedRevision, AdaptiveAttempt next) {
        db.owned(scope, next.id());
        var current = find(scope, next.id()).orElseThrow();
        var intended = new AdaptiveAttempt(current.id(), current.scope(), current.snapshot(), next.revision(), next.status(),
                current.startedAt(), current.deadlineAt(), next.finishedAt(), current.replacesAttemptId(), next.completionReason());
        if (!intended.equals(next) || next.revision() != Math.incrementExact(expectedRevision)) throw new Failure(Code.VERSION_CONFLICT);
        AdaptiveAttemptJpa.changed(db.data.attempts().transition(next.scope().organizationId(), next.scope().learnerId(),
                next.scope().jobPositionId(), next.id(), expectedRevision, next.status().name(), next.revision(),
                next.finishedAt().orElse(null), next.completionReason().map(Enum::name).orElse(null)));
    }

    @Override public Optional<Receipt> findReceipt(UUID org, UUID learner, String key) {
        db.requireReceipt(org, learner);
        return db.data.commands().receipt(org, learner, key).stream().map(row -> {
            Receipt receipt = rows.read(row.responsePayload(), Receipt.class);
            if (!receipt.scope().equals(new Scope(org, learner, row.jobPositionId())) || !receipt.idempotencyKey().equals(key)
                    || receipt.operation() != Operation.valueOf(row.operation()) || !receipt.requestHash().equals(row.requestHash())
                    || !receipt.outcome().id().equals(row.attemptId()) || !receipt.createdAt().equals(row.createdAt())) {
                throw new IllegalStateException("Stored attempt receipt metadata mismatch");
            }
            return receipt;
        }).toList().stream().findFirst();
    }
    @Override public void insertReceipt(Scope scope, Receipt receipt) {
        db.require(scope); db.requireReceipt(scope.organizationId(), scope.learnerId());
        if (!scope.equals(receipt.scope())) throw new Failure(Code.FORBIDDEN);
        if (!find(scope, receipt.outcome().id()).orElseThrow().equals(receipt.outcome())
                || !progress(scope, receipt.outcome().id()).equals(receipt.progress())) throw new Failure(Code.VERSION_CONFLICT);
        try {
            db.data.commands().insert(new BaselineAttemptCommandEntity(scope.organizationId(), scope.learnerId(), receipt.idempotencyKey(),
                    receipt.outcome().id(), scope.jobPositionId(), receipt.operation().name(), receipt.requestHash(), rows.write(receipt),
                    receipt.createdAt()));
        } catch (DataIntegrityViolationException cause) {
            if (!PostgresErrors.isUniqueViolation(cause)) throw cause;
            Failure failure = new Failure(Code.IDEMPOTENCY_CONFLICT);
            failure.initCause(cause);
            throw failure;
        }
    }

    @Override public void withExpired(UUID org, int limit, Consumer<AdaptiveAttempt> work) {
        if (org == null || org.equals(new UUID(0, 0)) || limit < 1 || limit > 100) throw new IllegalArgumentException("Organization and bounded batch required");
        db.transaction(false, () -> {
            var ids = db.data.attempts().claimExpired(org, limit);
            Map<UUID, AdaptiveAttemptJpaRepository.Row> locked = ids.isEmpty() ? Map.of() : db.data.attempts().byIds(org, ids).stream()
                    .collect(Collectors.toMap(AdaptiveAttemptJpaRepository.Row::attemptId, Function.identity()));
            var claimed = ids.stream().map(locked::get).map(rows::header).toList();
            claimed.forEach(attempt -> db.inScope(attempt.scope(), () -> { work.accept(attempt); return null; }));
            return null;
        });
    }
}
