package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.AdaptiveAttemptStore.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt.Scope;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** One non-nestable boundary. Requests lock actor coordination before any parent; workers never take it. */
final class AdaptiveAttemptJdbc {
    final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final ThreadLocal<Scope> scope = new ThreadLocal<>();
    private final ThreadLocal<Boolean> actorCoordinated = new ThreadLocal<>();

    AdaptiveAttemptJdbc(NamedParameterJdbcTemplate jdbc, PlatformTransactionManager manager) {
        this.jdbc = Objects.requireNonNull(jdbc);
        transactions = new TransactionTemplate(Objects.requireNonNull(manager));
        transactions.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    <T> T transaction(boolean actor, Supplier<T> work) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Use one attempt transaction boundary");
        actorCoordinated.set(actor);
        try { return read(() -> transactions.execute(status -> work.get())); }
        finally { scope.remove(); actorCoordinated.remove(); }
    }

    <T> T scoped(Scope expected, Supplier<T> work) {
        return transaction(true, () -> {
            jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(:coordination,0))",
                    new MapSqlParameterSource("coordination", "AB-ATTEMPT-ACTOR-V1\n" + expected.organizationId() + "\n" + expected.learnerId()), (rs, n) -> true);
            jdbc.query("SELECT attempt_id FROM platform.baseline_adaptive_attempt WHERE organization_id=:org AND learner_id=:learner AND occupation_id=:occupation AND state='IN_PROGRESS' FOR UPDATE",
                    key(expected, null), (rs, n) -> rs.getObject(1, UUID.class));
            return inScope(expected, work);
        });
    }

    <T> T inScope(Scope expected, Supplier<T> work) {
        scope.set(expected);
        try { return work.get(); } finally { scope.remove(); }
    }

    void require(Scope expected) {
        if (!expected.equals(scope.get()) || !TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Operation requires its scoped attempt transaction");
        }
    }

    void requireReceipt(UUID organization, UUID learner) {
        Scope held = scope.get();
        if (held == null || !Boolean.TRUE.equals(actorCoordinated.get())
                || !held.organizationId().equals(organization) || !held.learnerId().equals(learner)) {
            throw new IllegalStateException("Receipt requires request actor coordination");
        }
        require(held);
    }

    MapSqlParameterSource owned(Scope expected, UUID id) {
        require(expected);
        var params = key(expected, id);
        if (jdbc.query("SELECT attempt_id FROM platform.baseline_adaptive_attempt WHERE organization_id=:org AND learner_id=:learner AND occupation_id=:occupation AND attempt_id=:id FOR UPDATE",
                params, (rs, n) -> true).isEmpty()) throw new Failure(Code.FORBIDDEN);
        return params;
    }

    static MapSqlParameterSource key(Scope scope, UUID id) {
        return new MapSqlParameterSource("org", scope.organizationId()).addValue("learner", scope.learnerId())
                .addValue("occupation", scope.occupationId()).addValue("id", id);
    }

    static void changed(int count) { if (count != 1) throw new Failure(Code.VERSION_CONFLICT); }

    static <T> T read(Supplier<T> work) {
        try { return work.get(); }
        catch (DataAccessException | TransactionException cause) {
            Failure failure = new Failure(cause instanceof DataIntegrityViolationException ? Code.VERSION_CONFLICT : Code.DEPENDENCY_UNAVAILABLE);
            failure.initCause(cause);
            throw failure;
        }
    }
}
