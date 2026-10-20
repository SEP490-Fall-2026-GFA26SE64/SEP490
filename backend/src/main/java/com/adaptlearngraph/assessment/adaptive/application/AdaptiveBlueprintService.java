package com.adaptlearngraph.assessment.adaptive.application;

import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintActorPort;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintActorPort.Actor;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort.Snapshot;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintPreviewPort;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintStore;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintStore.*;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.BiFunction;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/** One adaptive application path. No legacy generator, shared assessment, learner or mastery writes. */
public final class AdaptiveBlueprintService implements AdaptiveBlueprintUseCase {
    private final AdaptiveBlueprintActorPort actors;
    private final AdaptiveBlueprintStore store;
    private final AdaptiveBlueprintEligibilityPort eligibility;
    private final AdaptiveBlueprintValidator validator = new AdaptiveBlueprintValidator();
    private final AdaptiveBlueprintPreview preview;
    private final Clock clock;

    public AdaptiveBlueprintService(AdaptiveBlueprintActorPort actors, AdaptiveBlueprintStore store,
            AdaptiveBlueprintEligibilityPort eligibility, AdaptiveBlueprintPreviewPort items, Clock clock) {
        this.actors = Objects.requireNonNull(actors);
        this.store = Objects.requireNonNull(store);
        this.eligibility = Objects.requireNonNull(eligibility);
        this.preview = new AdaptiveBlueprintPreview(items);
        this.clock = Objects.requireNonNull(clock);
    }

    @Override public Workspace getWorkspace(String occupationId) {
        Scope scope = scope(requireActor(), occupationId);
        return store.inTransaction(scope, () -> {
            Snapshot eligible = resolve(scope);
            var activation = store.findActivation(scope);
            var current = activation.flatMap(Activation::current).map(id -> store.findVersion(scope, id)
                    .orElseThrow(() -> failure(Code.DEPENDENCY_UNAVAILABLE, "Current Blueprint version is unavailable")));
            int missing = (int) eligible.roles().values().stream().flatMap(role -> role.missingParameterItemVersionIds().stream()).distinct().count();
            var capacity = new CatalogCapacity(eligible.occupationName(), eligible.catalogFingerprint(), eligible.explorationItemVersionIds().size(),
                    missing, eligible.roles().entrySet().stream().collect(Collectors.toMap(entry -> entry.getKey(),
                            entry -> new RoleCapacity(entry.getValue().role(), entry.getValue().itemVersionIds().size(), entry.getValue().missingParameterItemVersionIds().size()))));
            return new Workspace(scope, capacity, store.findWorking(scope), current, activation);
        });
    }

    @Override public WorkingRevision save(Save command) {
        var fields = new ArrayList<>(List.of(Long.toString(command.expectedRevision()), command.configuration().name(),
                command.configuration().exploration().maxQuestions() + ":" + command.configuration().exploration().timeLimitSeconds()));
        new TreeMap<>(command.configuration().roles()).forEach((id, bounds) -> {
            fields.add(id); fields.add(bounds.maxQuestions() + ":" + bounds.timeLimitSeconds());
        });
        return ((Saved) execute(command.occupationId(), command.idempotencyKey(), Operation.SAVE, fields, (actor, eligible) -> {
            Scope scope = eligible.scope();
            var working = store.findWorking(scope);
            if (working.map(WorkingRevision::revision).orElse(0L) != command.expectedRevision()) {
                throw failure(Code.VERSION_CONFLICT, "Working revision changed or was closed");
            }
            validator.requireFeasible(command.configuration(), eligible);
            UUID identity = store.ensureIdentity(scope, actor.accountId());
            var next = new WorkingRevision(scope, identity, working.map(WorkingRevision::workingRevisionId).orElseGet(UUID::randomUUID),
                    Math.addExact(command.expectedRevision(), 1), command.configuration(), actor.accountId(), now());
            store.saveWorking(scope, command.expectedRevision(), next);
            return new Saved(next);
        })).working();
    }

    @Override public Preview testBlueprint(String occupationId, Configuration configuration) {
        Scope scope = scope(requireActor(), occupationId);
        Snapshot eligible = resolve(scope);
        var shortages = validator.shortages(Objects.requireNonNull(configuration), eligible);
        if (!shortages.isEmpty()) return new Preview(shortages, List.of());
        var sample = dependency(() -> preview.sample(eligible, configuration));
        var after = dependency(() -> eligibility.resolvePinned(scope, eligible.pins()))
                .orElseThrow(() -> failure(Code.BLUEPRINT_STALE, "Catalog availability changed; retry"));
        if (!eligible.equals(after)) throw failure(Code.BLUEPRINT_STALE, "Catalog eligibility changed during preview; retry");
        return new Preview(List.of(), sample);
    }

    @Override public Version finalizeBlueprint(Finalize command) {
        return ((Finalized) execute(command.occupationId(), command.idempotencyKey(), Operation.FINALIZE,
                List.of(command.workingRevisionId().toString(), Long.toString(command.expectedWorkingRevision()),
                        Long.toString(command.expectedActivationRevision())), (actor, eligible) -> {
            Scope scope = eligible.scope();
            var working = store.findWorking(scope).orElseThrow(() -> failure(Code.VERSION_CONFLICT, "Working revision closed or missing"));
            if (!working.workingRevisionId().equals(command.workingRevisionId()) || working.revision() != command.expectedWorkingRevision()) {
                throw failure(Code.VERSION_CONFLICT, "Working revision changed");
            }
            requireActivationRevision(scope, command.expectedActivationRevision());
            validator.requireFeasible(working.configuration(), eligible);
            Instant time = now();
            var roles = eligible.roles().entrySet().stream().collect(Collectors.toMap(entry -> entry.getKey(), entry -> entry.getValue().role()));
            Version version = new Version(scope, store.nextVersion(scope), working.configuration(), eligible.occupationName(),
                    eligible.catalogFingerprint(), eligible.pins(), roles, actor.accountId(), time);
            store.insertVersion(scope, version);
            var activation = new Activation(scope, Math.addExact(command.expectedActivationRevision(), 1), Optional.of(version.id()), actor.accountId(), time);
            store.saveActivation(scope, command.expectedActivationRevision(), activation);
            store.appendActivationEvent(scope, activation, Operation.FINALIZE, null);
            store.closeWorking(scope, working.workingRevisionId(), working.revision(), actor.accountId(), time);
            return new Finalized(version);
        })).version();
    }

    @Override public Activation disable(Disable command) {
        return ((Disabled) execute(command.occupationId(), command.idempotencyKey(), Operation.DISABLE,
                List.of(Long.toString(command.expectedActivationRevision()), command.reason()), (actor, eligible) -> {
            Scope scope = eligible.scope();
            var current = requireActivationRevision(scope, command.expectedActivationRevision());
            if (current.flatMap(Activation::current).isEmpty()) throw failure(Code.VERSION_CONFLICT, "Blueprint is not active");
            var next = new Activation(scope, Math.addExact(command.expectedActivationRevision(), 1), Optional.empty(), actor.accountId(), now());
            store.saveActivation(scope, command.expectedActivationRevision(), next);
            store.appendActivationEvent(scope, next, Operation.DISABLE, command.reason());
            return new Disabled(next);
        })).activation();
    }

    private Outcome execute(String occupationId, String key, Operation operation, List<String> fields, BiFunction<Actor, Snapshot, Outcome> action) {
        Actor actor = requireActor();
        Scope scope = scope(actor, occupationId);
        String hash = hash(scope, operation, fields);
        return store.inTransaction(scope, () -> {
            Snapshot eligible = resolve(scope); // Scope authorization before receipt lookup or mutation, also on retries.
            var receipt = store.findReceipt(scope.organizationId(), actor.accountId(), key);
            if (receipt.isPresent()) {
                Receipt existing = receipt.get();
                if (!scope.equals(existing.scope()) || !actor.accountId().equals(existing.actorId()) || !key.equals(existing.idempotencyKey())
                        || existing.operation() != operation || !hash.equals(existing.requestHash())) {
                    throw failure(Code.IDEMPOTENCY_CONFLICT, "Idempotency key was used for a different command");
                }
                return existing.outcome(); // Immutable original result, independent of later revision/pin/configuration changes.
            }
            Outcome outcome = action.apply(actor, eligible);
            store.insertReceipt(scope, new Receipt(scope, actor.accountId(), key, operation, hash, outcome, now()));
            return outcome;
        });
    }

    private Optional<Activation> requireActivationRevision(Scope scope, long expected) {
        var current = store.findActivation(scope);
        if (current.map(Activation::revision).orElse(0L) != expected) throw failure(Code.VERSION_CONFLICT, "Current activation changed");
        return current;
    }

    private Actor requireActor() {
        Actor actor = actors.currentActor().orElseThrow(() -> failure(Code.UNAUTHENTICATED, "Authentication required"));
        if (!actor.isActiveLdManager()) throw failure(Code.FORBIDDEN, "Active L&D Manager required");
        return actor;
    }

    private static Scope scope(Actor actor, String occupation) {
        if (occupation == null || occupation.isBlank() || !occupation.equals(occupation.strip())) throw failure(Code.INVALID_REQUEST, "Canonical Occupation required");
        return new Scope(actor.organizationId(), occupation);
    }

    private Snapshot resolve(Scope scope) {
        Snapshot snapshot = dependency(() -> eligibility.resolve(scope)).orElseThrow(() -> failure(Code.FORBIDDEN, "Occupation unavailable to actor scope"));
        if (!scope.equals(snapshot.scope())) throw failure(Code.DEPENDENCY_UNAVAILABLE, "Eligibility scope mismatch");
        return snapshot;
    }

    private static <T> T dependency(Supplier<T> work) {
        try { return work.get(); }
        catch (AdaptiveBlueprintEligibilityPort.DependencyUnavailable cause) {
            Failure failure = failure(Code.DEPENDENCY_UNAVAILABLE, "Assessment dependency unavailable");
            failure.initCause(cause);
            throw failure;
        }
    }

    private Instant now() { return clock.instant().truncatedTo(ChronoUnit.MICROS); }
    private static Failure failure(Code code, String message) { return new Failure(code, message, List.of()); }

    /** Versioned, length-prefixed UTF-8 canonical fields; unordered role maps are sorted before hashing. */
    private static String hash(Scope scope, Operation operation, List<String> fields) {
        var values = new ArrayList<>(List.of("AB-COMMAND-V1", scope.organizationId().toString(), scope.occupationId(), operation.name()));
        values.addAll(fields);
        var canonical = new StringBuilder();
        values.forEach(value -> canonical.append(value.length()).append(':').append(value));
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            digest.update(StandardCharsets.UTF_8.newEncoder().encode(CharBuffer.wrap(canonical)));
            return HexFormat.of().formatHex(digest.digest());
        } catch (CharacterCodingException malformed) { throw failure(Code.INVALID_REQUEST, "Command text must be valid Unicode"); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
