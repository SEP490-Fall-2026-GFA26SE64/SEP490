package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.AdaptiveAttemptStore.*;
import com.adaptlearngraph.entities.domain.AdaptiveAttempt.Scope;
import jakarta.persistence.PersistenceException;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** One non-nestable JPA boundary. Requests lock actor coordination before any parent; workers never take it. */
public final class AdaptiveAttemptJpa {
    final AdaptiveAttemptRepositories data;
    private final TransactionTemplate transactions;
    private final ThreadLocal<Scope> scope = new ThreadLocal<>();
    private final ThreadLocal<Boolean> actorCoordinated = new ThreadLocal<>();

    AdaptiveAttemptJpa(AdaptiveAttemptRepositories data, PlatformTransactionManager manager) {
        this.data = Objects.requireNonNull(data);
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
            data.locks().lock("AB-ATTEMPT-ACTOR-V1\n" + expected.organizationId() + "\n" + expected.learnerId());
            data.attempts().lockInProgress(expected.organizationId(), expected.learnerId(), expected.jobPositionId());
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

    /** Requires the scoped transaction and row-locks this exact owned parent. */
    void owned(Scope expected, UUID id) {
        require(expected);
        if (data.attempts().lockOwned(expected.organizationId(), expected.learnerId(), expected.jobPositionId(), id).isEmpty()) {
            throw new Failure(Code.FORBIDDEN);
        }
    }

    static void changed(long count) { if (count != 1) throw new Failure(Code.VERSION_CONFLICT); }

    static <T> T read(Supplier<T> work) {
        try { return work.get(); }
        catch (DataAccessException | TransactionException | PersistenceException cause) {
            Failure failure = new Failure(cause instanceof DataIntegrityViolationException ? Code.VERSION_CONFLICT : Code.DEPENDENCY_UNAVAILABLE);
            failure.initCause(cause);
            throw failure;
        }
    }
}
