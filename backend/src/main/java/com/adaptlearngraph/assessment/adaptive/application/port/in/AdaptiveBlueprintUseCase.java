package com.adaptlearngraph.assessment.adaptive.application.port.in;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Activation;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Configuration;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.RoleSnapshot;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Scope;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Version;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.WorkingRevision;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** REQ-002-F02. Actor/organization and technical versions are always resolved by the server. */
public interface AdaptiveBlueprintUseCase {
    Workspace getWorkspace(String occupationId);

    WorkingRevision save(Save command);

    /** Read-like: no command receipt, history, version, attempt or mastery writes. */
    Preview testBlueprint(String occupationId, Configuration configuration);

    /** Version, current pointer, activation event and command receipt commit atomically. */
    Version finalizeBlueprint(Finalize command);

    Activation disable(Disable command);

    /** expectedRevision=0 creates the sole working revision; positive revisions update it. */
    record Save(String occupationId, long expectedRevision, String idempotencyKey,
                Configuration configuration) {
        public Save {
            validateCommand(occupationId, idempotencyKey, expectedRevision);
            Objects.requireNonNull(configuration, "configuration");
        }
    }

    /** expectedActivationRevision=0 means no activation row exists yet. */
    record Finalize(String occupationId, UUID workingRevisionId, long expectedWorkingRevision,
                    long expectedActivationRevision, String idempotencyKey) {
        public Finalize {
            validateCommand(occupationId, idempotencyKey, expectedActivationRevision);
            Objects.requireNonNull(workingRevisionId, "workingRevisionId");
            if (expectedWorkingRevision < 1) throw new IllegalArgumentException("Working revision required");
        }
    }

    record Disable(String occupationId, long expectedActivationRevision,
                   String idempotencyKey, String reason) {
        public Disable {
            validateCommand(occupationId, idempotencyKey, expectedActivationRevision);
            if (expectedActivationRevision < 1) throw new IllegalArgumentException("Activation required");
            if (reason == null || reason.isBlank()) throw new IllegalArgumentException("Reason required");
        }
    }

    private static void validateCommand(String occupationId, String key, long revision) {
        if (occupationId == null || occupationId.isBlank() || !occupationId.equals(occupationId.strip())
                || key == null || key.isBlank() || revision < 0) {
            throw new IllegalArgumentException("Occupation, idempotency key and valid revision required");
        }
    }

    /** Capacity is authorized with the workspace; no raw eligibility/item IDs are exposed. */
    record CatalogCapacity(String occupationName, String catalogFingerprint, int explorationCapacity,
                           int explorationMissingParameterCount, Map<String, RoleCapacity> roles) {
        public CatalogCapacity {
            Objects.requireNonNull(occupationName); Objects.requireNonNull(catalogFingerprint);
            roles = Map.copyOf(roles);
            if (explorationCapacity < 0 || explorationMissingParameterCount < 0) throw new IllegalArgumentException("Invalid capacity");
        }
    }

    record RoleCapacity(RoleSnapshot snapshot, int eligibleCapacity, int missingParameterCount) {
        public RoleCapacity {
            Objects.requireNonNull(snapshot);
            if (eligibleCapacity < 0 || missingParameterCount < 0) throw new IllegalArgumentException("Invalid capacity");
        }
    }

    record Workspace(Scope scope, CatalogCapacity capacity, Optional<WorkingRevision> working,
                     Optional<Version> current, Optional<Activation> activation) {
        public Workspace {
            Objects.requireNonNull(scope, "scope");
            Objects.requireNonNull(capacity, "capacity");
            Objects.requireNonNull(working, "working");
            Objects.requireNonNull(current, "current");
            Objects.requireNonNull(activation, "activation");
            if (working.filter(value -> !value.scope().equals(scope)).isPresent()
                    || current.filter(value -> !value.scope().equals(scope)).isPresent()
                    || activation.filter(value -> !value.scope().equals(scope)).isPresent()) {
                throw new IllegalArgumentException("Workspace scope mismatch");
            }
            if (!current.map(Version::id).equals(activation.flatMap(Activation::current))) {
                throw new IllegalArgumentException("Current version must match activation");
            }
        }
    }

    /** roleId is empty for exploration. Missing parameter coverage is distinct from item capacity. */
    record Shortage(Optional<String> roleId, ShortageKind kind, int required, int available) {
        public Shortage {
            Objects.requireNonNull(roleId, "roleId");
            Objects.requireNonNull(kind, "kind");
            if (required < 1 || available < 0 || available >= required) {
                throw new IllegalArgumentException("A shortage requires available < required");
            }
        }
    }

    enum ShortageKind { ITEM_CAPACITY, PARAMETER_COVERAGE }

    /** Answer-safe allowlist, never a generic protected payload or estimator state. */
    record SampleItem(UUID itemVersionId, String microSkillId, String prompt,
                      Map<String, String> options, SelectionReason reason) {
        public SampleItem {
            Objects.requireNonNull(itemVersionId, "itemVersionId");
            Objects.requireNonNull(microSkillId, "microSkillId");
            Objects.requireNonNull(prompt, "prompt");
            options = Map.copyOf(options);
            Objects.requireNonNull(reason, "reason");
        }
    }

    enum SelectionReason { SKILL_COVERAGE, ITEM_INFORMATION }

    record Preview(List<Shortage> shortages, List<SampleItem> sample) {
        public Preview {
            shortages = List.copyOf(shortages);
            sample = List.copyOf(sample);
        }

        public boolean feasible() { return shortages.isEmpty(); }
    }

    enum Code {
        UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_REQUEST, CATALOG_REFERENCE_INVALID,
        BLUEPRINT_STALE, INSUFFICIENT_CAPACITY, PARAMETER_COVERAGE_MISSING,
        VERSION_CONFLICT, IDEMPOTENCY_CONFLICT, DEPENDENCY_UNAVAILABLE
    }

    final class Failure extends RuntimeException {
        private final Code code;
        private final List<Shortage> shortages;

        public Failure(Code code, String message, List<Shortage> shortages) {
            super(message);
            this.code = Objects.requireNonNull(code, "code");
            this.shortages = List.copyOf(shortages);
        }

        public Code code() { return code; }
        public List<Shortage> shortages() { return shortages; }
    }
}
