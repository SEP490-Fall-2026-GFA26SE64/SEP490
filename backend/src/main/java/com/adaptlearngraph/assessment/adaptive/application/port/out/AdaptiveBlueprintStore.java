package com.adaptlearngraph.assessment.adaptive.application.port.out;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Activation;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Scope;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Version;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionId;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.WorkingRevision;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/** Tenant-scoped persistence boundary. No unscoped legacy fallback methods. */
public interface AdaptiveBlueprintStore {
    /**
     * Runs atomically, serializing scope coordination before child reads/writes.
     * The first write must serialize even when an activation row does not exist.
     * All methods called by work share the transaction; exceptions roll back every write.
     */
    <T> T inTransaction(Scope scope, Supplier<T> work);

    /** Inside the scoped transaction: reuse the stable identity or create it for this trusted actor. */
    UUID ensureIdentity(Scope scope, UUID actorId);

    /** Allocate under the same scope lock over the shared fixed/adaptive version registry. */
    VersionId nextVersion(Scope scope);

    Optional<WorkingRevision> findWorking(Scope scope);
    Optional<Activation> findActivation(Scope scope);
    Optional<Version> findVersion(Scope scope, VersionId versionId);

    /**
     * Tenant + actor + key identity, including reuse across Occupations. Check receipt.scope and
     * request hash before replay; another Occupation must conflict rather than create a new command.
     * Lookup happens after actor authorization and before any mutation.
     */
    Optional<Receipt> findReceipt(UUID organizationId, UUID actorId, String idempotencyKey);

    /** Compare-and-set; expectedRevision=0 means insert, never overwrite another open revision. */
    void saveWorking(Scope scope, long expectedRevision, WorkingRevision next);
    void closeWorking(Scope scope, UUID workingRevisionId, long expectedRevision,
                      UUID actorId, Instant closedAt);
    void insertVersion(Scope scope, Version version);

    /** Compare-and-set; expectedRevision=0 requires an absent activation row. */
    void saveActivation(Scope scope, long expectedRevision, Activation next);

    /** Append event and receipt in the same transaction as the version/current-pointer write. */
    void appendActivationEvent(Scope scope, Activation next, Operation operation, String reason);
    void insertReceipt(Scope scope, Receipt receipt);

    enum Operation { SAVE, FINALIZE, DISABLE }

    /** Typed immutable response snapshot: later edits must not change an exact replay. */
    sealed interface Outcome permits Saved, Finalized, Disabled {}
    record Saved(WorkingRevision working) implements Outcome {
        public Saved { Objects.requireNonNull(working, "working"); }
    }
    record Finalized(Version version) implements Outcome {
        public Finalized { Objects.requireNonNull(version, "version"); }
    }
    record Disabled(Activation activation) implements Outcome {
        public Disabled { Objects.requireNonNull(activation, "activation"); }
    }
    record Receipt(Scope scope, UUID actorId, String idempotencyKey, Operation operation,
                   String requestHash, Outcome outcome, Instant createdAt) {
        public Receipt {
            Objects.requireNonNull(scope, "scope");
            Objects.requireNonNull(actorId, "actorId");
            if (idempotencyKey == null || idempotencyKey.isBlank()) {
                throw new IllegalArgumentException("Idempotency key is required");
            }
            Objects.requireNonNull(operation, "operation");
            if (requestHash == null || !requestHash.matches("[0-9a-f]{64}")) {
                throw new IllegalArgumentException("SHA-256 request hash is required");
            }
            Objects.requireNonNull(outcome, "outcome");
            Objects.requireNonNull(createdAt, "createdAt");
            if (!(operation == Operation.SAVE && outcome instanceof Saved
                    || operation == Operation.FINALIZE && outcome instanceof Finalized
                    || operation == Operation.DISABLE && outcome instanceof Disabled)) {
                throw new IllegalArgumentException("Command operation and outcome must match");
            }
            Scope outcomeScope = switch (outcome) {
                case Saved saved -> saved.working().scope();
                case Finalized finalized -> finalized.version().scope();
                case Disabled disabled -> disabled.activation().scope();
            };
            if (!scope.equals(outcomeScope)) throw new IllegalArgumentException("Receipt scope mismatch");
        }
    }
}
