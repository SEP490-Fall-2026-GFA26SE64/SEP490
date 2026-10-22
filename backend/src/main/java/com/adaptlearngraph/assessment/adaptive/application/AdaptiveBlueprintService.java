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

    @Override public AdaptiveBlueprintListing.Page list(AdaptiveBlueprintListing.Query query) {
        Actor actor = requireActor();
        var granted = actors.authorizedOccupations(actor);
        if (query.occupationId() != null && !granted.contains(query.occupationId())) throw failure(Code.FORBIDDEN, "Occupation unavailable to actor scope");
        return store.list(actor.organizationId(), granted, query);
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
                            entry -> new RoleCapacity(entry.getValue().role(), entry.getValue().itemVersionIds().size(), entry.getValue().missingParameterItemVersionIds().size()))),
                    occupationCapacity(eligible));
            return new Workspace(scope, capacity, store.findWorking(scope), current, activation, readiness(scope, current));
        });
    }

    private AdmissionReadiness readiness(Scope scope, Optional<Version> current) {
        if (current.isEmpty()) return AdmissionReadiness.NO_ACTIVE;
        Version version = current.orElseThrow();
        if (version.configuration().occupationBounds() == null) return AdmissionReadiness.CONFIGURATION_UPDATE_REQUIRED;
        var pinned = dependency(() -> eligibility.resolvePinned(scope, version.pins()));
        if (pinned.isEmpty()) return AdmissionReadiness.BLUEPRINT_STALE;
        Snapshot eligible = pinned.orElseThrow();
        var roles = eligible.roles().entrySet().stream().collect(Collectors.toMap(entry -> entry.getKey(), entry -> entry.getValue().role()));
        if (!scope.equals(eligible.scope()) || !version.pins().equals(eligible.pins())) throw failure(Code.DEPENDENCY_UNAVAILABLE, "Readiness scope/pins mismatch");
        if (!version.catalogFingerprint().equals(eligible.catalogFingerprint()) || !version.roles().equals(roles)) return AdmissionReadiness.BLUEPRINT_STALE;
        return validator.shortages(version.configuration(), eligible).isEmpty() ? AdmissionReadiness.READY : AdmissionReadiness.INFEASIBLE;
    }

    @Override public WorkingRevision save(Save command) { return saveResult(command).working(); }

    @Override public SaveResult saveResult(Save command) {
        var fields = new ArrayList<>(List.of(Long.toString(command.expectedRevision())));
        fields.addAll(configurationFields(command.configuration()));
        if (command.expectedWorkingRevisionId() != null) {
            fields.add("DRAFT-IDENTITY-CAS-V2"); fields.add(command.expectedWorkingRevisionId().toString());
        }
        Saved saved = (Saved) execute(command.occupationId(), command.idempotencyKey(), Operation.SAVE, fields, (actor, scope) -> {
            var working = store.findWorking(scope);
            if (working.map(WorkingRevision::revision).orElse(0L) != command.expectedRevision()) {
                throw failure(Code.VERSION_CONFLICT, "Working revision changed or was closed");
            }
            requireCommon(command.configuration()); // Legacy SAVE hashes remain replayable before this write-only guard.
            if (command.expectedRevision() > 0 && (command.expectedWorkingRevisionId() == null
                    || working.filter(value -> value.workingRevisionId().equals(command.expectedWorkingRevisionId())).isEmpty())
                    || command.expectedRevision() == 0 && command.expectedWorkingRevisionId() != null) {
                throw failure(Code.VERSION_CONFLICT, "Draft identity changed; refresh before saving");
            }
            if (working.filter(value -> value.configuration().occupationBounds() == null).isPresent()) {
                throw failure(Code.VERSION_CONFLICT, "Confirm conversion of the legacy Draft before saving common bounds");
            }
            if (working.filter(value -> value.configuration().equals(command.configuration())).isPresent()) {
                return new Saved(working.orElseThrow(), true);
            }
            Snapshot eligible = resolve(scope);
            validator.requireFeasible(command.configuration(), eligible);
            requireUnchanged(eligible);
            UUID identity = store.ensureIdentity(scope, actor.accountId());
            var next = new WorkingRevision(scope, identity, working.map(WorkingRevision::workingRevisionId).orElseGet(UUID::randomUUID),
                    Math.addExact(command.expectedRevision(), 1), command.configuration(), actor.accountId(), now());
            store.saveWorking(scope, command.expectedRevision(), next);
            return new Saved(next);
        });
        return new SaveResult(saved.working(), saved.noOp());
    }

    @Override public WorkingRevision convertLegacyDraft(ConvertLegacyDraft command) {
        var fields = new ArrayList<>(List.of(command.workingRevisionId().toString(), Long.toString(command.expectedWorkingRevision())));
        fields.addAll(configurationFields(command.configuration()));
        return ((Converted) execute(command.occupationId(), command.idempotencyKey(), Operation.CONVERT, fields, (actor, scope) -> {
            Snapshot eligible = resolve(scope);
            WorkingRevision original = requireWorking(scope, command.workingRevisionId(), command.expectedWorkingRevision());
            if (original.configuration().occupationBounds() != null) {
                throw failure(Code.VERSION_CONFLICT, "Only a legacy Draft can be converted");
            }
            requireCommon(command.configuration());
            validator.requireFeasible(command.configuration(), eligible);
            requireUnchanged(eligible);
            Instant time = now();
            var next = new WorkingRevision(scope, original.blueprintId(), UUID.randomUUID(), 1,
                    command.configuration(), actor.accountId(), time);
            store.archiveLegacyWorking(scope, original.workingRevisionId(), original.revision(), actor.accountId(), time);
            store.saveWorking(scope, 0, next);
            return new Converted(original, next);
        })).working();
    }

    @Override public Preview previewSaved(PreviewSaved command) {
        Scope scope = scope(requireActor(), command.occupationId());
        return store.inTransaction(scope, () -> {
            Snapshot eligible = resolve(scope);
            WorkingRevision working = requireWorking(scope, command.workingRevisionId(), command.expectedWorkingRevision());
            requireCommon(working.configuration());
            return preview(eligible, working.configuration());
        });
    }

    @Override public Preview testBlueprint(String occupationId, Configuration configuration) {
        Scope scope = scope(requireActor(), occupationId);
        Snapshot eligible = resolve(scope);
        return preview(eligible, Objects.requireNonNull(configuration));
    }

    private Preview preview(Snapshot eligible, Configuration configuration) {
        var shortages = validator.shortages(Objects.requireNonNull(configuration), eligible);
        if (!shortages.isEmpty()) return new Preview(shortages, List.of());
        var sample = dependency(() -> preview.sample(eligible, configuration));
        requireUnchanged(eligible);
        return new Preview(List.of(), sample);
    }

    private void requireUnchanged(Snapshot eligible) {
        var after = dependency(() -> eligibility.resolvePinned(eligible.scope(), eligible.pins()))
                .orElseThrow(() -> failure(Code.BLUEPRINT_STALE, "Catalog availability changed; retry"));
        if (!eligible.equals(after)) throw failure(Code.BLUEPRINT_STALE, "Catalog eligibility changed; retry");
    }

    @Override public Version finalizeBlueprint(Finalize command) {
        var fields = new ArrayList<>(List.of(command.workingRevisionId().toString(), Long.toString(command.expectedWorkingRevision()),
                Long.toString(command.expectedActivationRevision())));
        confirmationFields(fields, command.currentConfirmed(), command.expectedCurrent());
        return ((Finalized) execute(command.occupationId(), command.idempotencyKey(), Operation.FINALIZE, fields, (actor, scope) -> {
            var working = store.findWorking(scope).orElseThrow(() -> failure(Code.VERSION_CONFLICT, "Working revision closed or missing"));
            if (!working.workingRevisionId().equals(command.workingRevisionId()) || working.revision() != command.expectedWorkingRevision()) {
                throw failure(Code.VERSION_CONFLICT, "Working revision changed");
            }
            requireCommon(working.configuration());
            var current = requireActivationRevision(scope, command.expectedActivationRevision());
            requireConfirmedCurrent(current, command.currentConfirmed(), command.expectedCurrent());
            Snapshot eligible = resolve(scope);
            validator.requireFeasible(working.configuration(), eligible);
            requireUnchanged(eligible);
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
        var fields = new ArrayList<>(List.of(Long.toString(command.expectedActivationRevision()), command.reason()));
        confirmationFields(fields, command.currentConfirmed(), command.expectedCurrent());
        return ((Disabled) execute(command.occupationId(), command.idempotencyKey(), Operation.DISABLE, fields, (actor, scope) -> {
            var current = requireActivationRevision(scope, command.expectedActivationRevision());
            requireConfirmedCurrent(current, command.currentConfirmed(), command.expectedCurrent());
            if (current.flatMap(Activation::current).isEmpty()) throw failure(Code.VERSION_CONFLICT, "Blueprint is not active");
            var next = new Activation(scope, Math.addExact(command.expectedActivationRevision(), 1), Optional.empty(), actor.accountId(), now());
            store.saveActivation(scope, command.expectedActivationRevision(), next);
            store.appendActivationEvent(scope, next, Operation.DISABLE, command.reason());
            return new Disabled(next);
        })).activation();
    }

    private Outcome execute(String occupationId, String key, Operation operation, List<String> fields, BiFunction<Actor, Scope, Outcome> action) {
        Actor actor = requireActor();
        Scope scope = scope(actor, occupationId);
        String hash = hash(scope, operation, fields);
        return store.inTransaction(scope, () -> {
            // Reauthorize persisted actor and server scope grants even on immutable receipt replay.
            Actor refreshed = requireActor();
            if (!actor.accountId().equals(refreshed.accountId()) || !scope.equals(scope(refreshed, occupationId))) {
                throw failure(Code.FORBIDDEN, "Actor scope changed");
            }
            var receipt = store.findReceipt(scope.organizationId(), actor.accountId(), key);
            if (receipt.isPresent()) {
                Receipt existing = receipt.get();
                if (!scope.equals(existing.scope()) || !actor.accountId().equals(existing.actorId()) || !key.equals(existing.idempotencyKey())
                        || existing.operation() != operation || !hash.equals(existing.requestHash())) {
                    throw failure(Code.IDEMPOTENCY_CONFLICT, "Idempotency key was used for a different command");
                }
                return existing.outcome(); // Immutable original result, independent of later revision/pin/configuration changes.
            }
            Outcome outcome = action.apply(actor, scope);
            store.insertReceipt(scope, new Receipt(scope, actor.accountId(), key, operation, hash, outcome, now()));
            return outcome;
        });
    }

    private static void confirmationFields(List<String> fields, boolean confirmed, VersionId expected) {
        if (confirmed) {
            fields.add("OCCUPATION-LIFECYCLE-V2");
            fields.add(expected == null ? "NONE" : expected.blueprintId() + ":" + expected.version());
        }
    }

    private static void requireConfirmedCurrent(Optional<Activation> activation, boolean confirmed, VersionId expected) {
        if (!confirmed) throw failure(Code.INVALID_REQUEST, "Confirm the current version or explicit none before changing availability");
        if (!activation.flatMap(Activation::current).equals(Optional.ofNullable(expected))) {
            throw failure(Code.VERSION_CONFLICT, "Current version changed; refresh and confirm the replacement target");
        }
    }

    private Optional<Activation> requireActivationRevision(Scope scope, long expected) {
        var current = store.findActivation(scope);
        if (current.map(Activation::revision).orElse(0L) != expected) throw failure(Code.VERSION_CONFLICT, "Current activation changed");
        return current;
    }

    private WorkingRevision requireWorking(Scope scope, UUID id, long revision) {
        var working = store.findWorking(scope).orElseThrow(() -> failure(Code.VERSION_CONFLICT, "Working revision closed or missing"));
        if (!working.workingRevisionId().equals(id) || working.revision() != revision) {
            throw failure(Code.VERSION_CONFLICT, "Working revision changed");
        }
        return working;
    }

    private static void requireCommon(Configuration configuration) {
        if (configuration.occupationBounds() == null) {
            throw failure(Code.INVALID_REQUEST, "New commands require explicit common Occupation bounds; convert the legacy Draft");
        }
    }

    private static OccupationCapacity occupationCapacity(Snapshot eligible) {
        var coverage = eligible.coverage();
        if (coverage == null) return null;
        int skills = (int) eligible.roles().values().stream().flatMap(role -> role.role().skills().keySet().stream()).distinct().count();
        return new OccupationCapacity(eligible.explorationItemVersionIds().size(), skills, coverage.minimumPerSkill(),
                (long) skills * coverage.minimumPerSkill(), coverage.modelMaxResponses());
    }

    private static List<String> configurationFields(Configuration configuration) {
        if (configuration.occupationBounds() != null) {
            return List.of("FULL-OCCUPATION-COMMAND-V2", configuration.name(),
                    configuration.occupationBounds().maxQuestions() + ":" + configuration.occupationBounds().timeLimitSeconds());
        }
        // Preserve the original V1 canonical fields exactly for authorized legacy receipt replay.
        var fields = new ArrayList<>(List.of(configuration.name(),
                configuration.exploration().maxQuestions() + ":" + configuration.exploration().timeLimitSeconds()));
        new TreeMap<>(configuration.roles()).forEach((id, bounds) -> {
            fields.add(id); fields.add(bounds.maxQuestions() + ":" + bounds.timeLimitSeconds());
        });
        return fields;
    }

    private Actor requireActor() {
        Actor actor = actors.currentActor().orElseThrow(() -> failure(Code.UNAUTHENTICATED, "Authentication required"));
        if (!actor.isActiveLdManager()) throw failure(Code.FORBIDDEN, "Active L&D Manager required");
        return actor;
    }

    private Scope scope(Actor actor, String occupation) {
        if (occupation == null || occupation.isBlank() || !occupation.equals(occupation.strip())) throw failure(Code.INVALID_REQUEST, "Canonical Occupation required");
        if (!actors.authorizedOccupations(actor).contains(occupation)) throw failure(Code.FORBIDDEN, "Occupation unavailable to actor scope");
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
