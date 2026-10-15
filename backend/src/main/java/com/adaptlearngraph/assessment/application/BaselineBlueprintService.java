package com.adaptlearngraph.assessment.application;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.WriteConflict;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.Objects;
import java.util.UUID;

public final class BaselineBlueprintService implements BaselineBlueprintUseCase {
    private final ActorPort actors;
    private final BaselineBlueprintStore store;
    private final BaselineBlueprintDraftValidator validator;
    private final Clock clock;

    public BaselineBlueprintService(
            ActorPort actors, BaselineBlueprintStore store, BaselineBlueprintValidationPort validation) {
        this(actors, store, validation, Clock.systemUTC());
    }

    BaselineBlueprintService(
            ActorPort actors, BaselineBlueprintStore store,
            BaselineBlueprintValidationPort validation, Clock clock) {
        this.actors = Objects.requireNonNull(actors, "actors must not be null");
        this.store = Objects.requireNonNull(store, "store must not be null");
        this.validator = new BaselineBlueprintDraftValidator(
                Objects.requireNonNull(validation, "validation must not be null"));
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    @Override
    public BaselineBlueprint create(String idempotencyKey, BlueprintDraft draft) {
        Actor actor = requireActor();
        String key = requireText(idempotencyKey, "idempotencyKey");
        String hash = hash("CREATE", null, 0, draft);
        return replay(actor, key, hash).orElseGet(() -> {
            BlueprintDraft validated = validator.validateAndNormalize(actor, draft);
            if (store.findLatestByOccupation(validated.occupationId()).isPresent()) {
                throw failure(
                        Code.VERSION_CONFLICT,
                        "This Occupation already has a baseline blueprint; revise its latest version");
            }
            return insert(new BaselineBlueprint(
                    UUID.randomUUID(), 1, validated.name(), validated.occupationId(),
                    validated.occupationNameSnapshot(), actor.accountId(), key, hash, now(), validated.roles()),
                    actor, key, hash);
        });
    }

    @Override
    public BaselineBlueprint revise(
            UUID blueprintId, int expectedLatestVersion, String idempotencyKey, BlueprintDraft draft) {
        Objects.requireNonNull(blueprintId, "blueprintId must not be null");
        if (expectedLatestVersion < 1) {
            throw new Failure(Code.INVALID_REQUEST, "expectedLatestVersion must be positive");
        }
        Actor actor = requireActor();
        String key = requireText(idempotencyKey, "idempotencyKey");
        String hash = hash("REVISE", blueprintId, expectedLatestVersion, draft);
        var replay = replay(actor, key, hash);
        if (replay.isPresent()) {
            return replay.orElseThrow();
        }
        BaselineBlueprint latest = store.findLatest(blueprintId)
                .orElseThrow(() -> failure(Code.NOT_FOUND, "Baseline blueprint was not found"));
        if (latest.version() != expectedLatestVersion) {
            throw failure(Code.VERSION_CONFLICT, "Baseline blueprint has a newer version");
        }
        BlueprintDraft validated = validator.validateAndNormalize(actor, draft);
        if (!Objects.equals(latest.occupationId(), validated.occupationId())) {
            throw failure(Code.INVALID_REQUEST, "A baseline blueprint cannot change Occupation");
        }
        return insert(new BaselineBlueprint(
                blueprintId, Math.addExact(expectedLatestVersion, 1), validated.name(), validated.occupationId(),
                validated.occupationNameSnapshot(), actor.accountId(), key, hash, now(), validated.roles()),
                actor, key, hash);
    }

    @Override
    public BaselineBlueprint getLatest(UUID blueprintId) {
        requireActor();
        return store.findLatest(Objects.requireNonNull(blueprintId, "blueprintId must not be null"))
                .orElseThrow(() -> failure(Code.NOT_FOUND, "Baseline blueprint was not found"));
    }

    @Override
    public BaselineBlueprint getLatestByOccupation(String occupationId) {
        requireActor();
        return store.findLatestByOccupation(requireText(occupationId, "occupationId"))
                .orElseThrow(() -> failure(
                        Code.NOT_FOUND, "Baseline blueprint was not found for this Occupation"));
    }

    @Override
    public BaselineBlueprint getVersion(UUID blueprintId, int version) {
        requireActor();
        if (version < 1) {
            throw failure(Code.INVALID_REQUEST, "version must be positive");
        }
        return store.findVersion(Objects.requireNonNull(blueprintId, "blueprintId must not be null"), version)
                .orElseThrow(() -> failure(Code.NOT_FOUND, "Baseline blueprint version was not found"));
    }

    private BaselineBlueprint insert(BaselineBlueprint blueprint, Actor actor, String key, String hash) {
        try {
            store.insert(blueprint);
            return blueprint;
        } catch (WriteConflict conflict) {
            return replay(actor, key, hash)
                    .orElseThrow(() -> failure(Code.VERSION_CONFLICT, "Baseline blueprint write conflicted"));
        }
    }

    private java.util.Optional<BaselineBlueprint> replay(Actor actor, String key, String requestHash) {
        return store.findByRequest(actor.accountId(), key).map(existing -> {
            if (!existing.requestHash().equals(requestHash)) {
                throw failure(Code.IDEMPOTENCY_CONFLICT, "Idempotency key was used for different content");
            }
            return existing;
        });
    }

    private Actor requireActor() {
        Actor actor = actors.currentActor()
                .orElseThrow(() -> failure(Code.UNAUTHENTICATED, "Authentication is required"));
        if (!actor.isActiveLdManager()) {
            throw failure(Code.FORBIDDEN, "Active L&D Manager role is required");
        }
        return actor;
    }

    private Instant now() {
        return Instant.now(clock).truncatedTo(ChronoUnit.MICROS);
    }

    private static String hash(String operation, UUID blueprintId, int expectedVersion, BlueprintDraft draft) {
        Objects.requireNonNull(draft, "draft must not be null");
        StringBuilder canonical = new StringBuilder();
        append(canonical, operation);
        append(canonical, blueprintId == null ? "" : blueprintId.toString());
        append(canonical, Integer.toString(expectedVersion));
        append(canonical, draft.name());
        append(canonical, draft.occupationId());
        append(canonical, draft.occupationNameSnapshot());
        draft.roles().stream().sorted(Comparator.comparing(BaselineBlueprint.RoleConfig::roleId)).forEach(role -> {
            append(canonical, role.roleId());
            append(canonical, role.roleNameSnapshot());
            append(canonical, Boolean.toString(role.enabled()));
            append(canonical, role.easyScoreWeight().stripTrailingZeros().toPlainString());
            append(canonical, role.mediumScoreWeight().stripTrailingZeros().toPlainString());
            append(canonical, role.hardScoreWeight().stripTrailingZeros().toPlainString());
            role.skills().stream().sorted(Comparator.comparing(BaselineBlueprint.SkillConfig::microSkillId))
                    .forEach(skill -> {
                        append(canonical, skill.microSkillId());
                        append(canonical, skill.microSkillNameSnapshot());
                        append(canonical, Integer.toString(skill.easyQuestionCount()));
                        append(canonical, Integer.toString(skill.mediumQuestionCount()));
                        append(canonical, Integer.toString(skill.hardQuestionCount()));
                    });
        });
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private static void append(StringBuilder target, String value) {
        String normalized = value == null ? "" : value.strip();
        target.append(normalized.length()).append(':').append(normalized).append('|');
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw failure(Code.INVALID_REQUEST, field + " must not be blank");
        }
        return value.strip();
    }

    private static Failure failure(Code code, String message) {
        return new Failure(code, message);
    }
}
