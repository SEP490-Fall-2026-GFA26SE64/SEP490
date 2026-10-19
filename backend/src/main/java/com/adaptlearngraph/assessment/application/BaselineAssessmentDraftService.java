package com.adaptlearngraph.assessment.application;

import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentDraftUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.DependencyUnavailable;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.NewDraft;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.WriteConflict;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.LongSupplier;

public final class BaselineAssessmentDraftService implements BaselineAssessmentDraftUseCase {
    private final ActorPort actors;
    private final BaselineBlueprintStore blueprints;
    private final BaselineAssessmentDraftStore drafts;
    private final Clock clock;
    private final LongSupplier seeds;

    public BaselineAssessmentDraftService(
            ActorPort actors, BaselineBlueprintStore blueprints, BaselineAssessmentDraftStore drafts) {
        SecureRandom random = new SecureRandom();
        this.actors = Objects.requireNonNull(actors, "actors must not be null");
        this.blueprints = Objects.requireNonNull(blueprints, "blueprints must not be null");
        this.drafts = Objects.requireNonNull(drafts, "drafts must not be null");
        this.clock = Clock.systemUTC();
        this.seeds = random::nextLong;
    }

    BaselineAssessmentDraftService(
            ActorPort actors, BaselineBlueprintStore blueprints, BaselineAssessmentDraftStore drafts,
            Clock clock, LongSupplier seeds) {
        this.actors = actors;
        this.blueprints = blueprints;
        this.drafts = drafts;
        this.clock = clock;
        this.seeds = seeds;
    }

    @Override
    public BaselineAssessmentDraft generate(UUID blueprintId, int blueprintVersion, String idempotencyKey) {
        Objects.requireNonNull(blueprintId, "blueprintId must not be null");
        if (blueprintVersion < 1) {
            throw failure(Code.INVALID_REQUEST, "blueprintVersion must be positive");
        }
        Actor actor = requireActor();
        String key = requireText(idempotencyKey, "idempotencyKey");
        String requestHash = hashParts("GENERATE_BASELINE", blueprintId, blueprintVersion);
        try {
            var replay = replay(actor, key, requestHash);
            if (replay.isPresent()) {
                return replay.orElseThrow();
            }

            BaselineBlueprint blueprint = blueprints.findVersion(
                            actor.organizationId(), blueprintId, blueprintVersion)
                    .orElseThrow(() -> failure(Code.NOT_FOUND, "Baseline blueprint version was not found"));
            List<BaselineBlueprint.RoleConfig> participatingRoles = blueprint.roles().stream()
                    .filter(BaselineBlueprint.RoleConfig::participates)
                    .toList();
            if (participatingRoles.isEmpty()) {
                throw failure(Code.INVALID_REQUEST, "At least one Occupation role with questions is required");
            }

            Set<String> skillIds = participatingRoles.stream()
                    .flatMap(role -> role.skills().stream())
                    .filter(skill -> skill.totalQuestionCount() > 0)
                    .map(BaselineBlueprint.SkillConfig::microSkillId)
                    .collect(java.util.stream.Collectors.toUnmodifiableSet());
            long seed = seeds.getAsLong();
            var generated = BaselineAssessmentGenerator.generate(
                    blueprint, seed, drafts.findPublishedCandidates(skillIds));
            NewDraft draft = new NewDraft(
                    UUID.randomUUID(), blueprint.blueprintId(), blueprint.name(),
                    blueprint.blueprintId(), blueprint.version(), seed, actor.accountId(), now(),
                    key, requestHash, generated.contentHash(), generated.items());
            return insert(draft, actor, key, requestHash);
        } catch (DependencyUnavailable unavailable) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, unavailable.getMessage());
        }
    }

    @Override
    public BaselineAssessmentDraft get(UUID assessmentVersionId) {
        Actor actor = requireActor();
        try {
            return drafts.findByVersionId(actor.organizationId(), Objects.requireNonNull(
                            assessmentVersionId, "assessmentVersionId must not be null"))
                    .orElseThrow(() -> failure(Code.NOT_FOUND, "Baseline assessment draft was not found"));
        } catch (DependencyUnavailable unavailable) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, unavailable.getMessage());
        }
    }

    @Override
    public BaselineAssessmentDraft review(UUID assessmentVersionId, String expectedContentHash) {
        Actor actor = requireActor();
        UUID versionId = Objects.requireNonNull(
                assessmentVersionId, "assessmentVersionId must not be null");
        String contentHash = requireContentHash(expectedContentHash);
        try {
            BaselineAssessmentDraft current = find(actor, versionId);
            requireCurrentHash(current, contentHash);
            if (current.reviewedContentHash() != null) {
                return current;
            }
            drafts.review(actor.organizationId(), versionId, actor.accountId(), now(), contentHash);
            BaselineAssessmentDraft reviewed = find(actor, versionId);
            if (!contentHash.equals(reviewed.reviewedContentHash())) {
                throw failure(Code.VERSION_CONFLICT,
                        "Baseline assessment changed while it was being reviewed");
            }
            return reviewed;
        } catch (DependencyUnavailable unavailable) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, unavailable.getMessage());
        }
    }

    @Override
    public BaselineAssessmentDraft publish(UUID assessmentVersionId, String expectedContentHash) {
        Actor actor = requireActor();
        UUID versionId = Objects.requireNonNull(
                assessmentVersionId, "assessmentVersionId must not be null");
        String contentHash = requireContentHash(expectedContentHash);
        try {
            BaselineAssessmentDraft current = find(actor, versionId);
            requireCurrentHash(current, contentHash);
            if (!contentHash.equals(current.reviewedContentHash())) {
                throw failure(Code.REVIEW_REQUIRED,
                        "Review the current assessment content before publishing");
            }
            if (current.publicationState()
                    == BaselineAssessmentDraft.PublicationState.PUBLISHED) {
                return current;
            }
            drafts.publish(actor.organizationId(), versionId, contentHash);
            BaselineAssessmentDraft published = find(actor, versionId);
            if (published.publicationState()
                    != BaselineAssessmentDraft.PublicationState.PUBLISHED) {
                throw failure(Code.VERSION_CONFLICT,
                        "Baseline assessment changed while it was being published");
            }
            return published;
        } catch (DependencyUnavailable unavailable) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, unavailable.getMessage());
        }
    }

    private BaselineAssessmentDraft insert(
            NewDraft draft, Actor actor, String key, String requestHash) {
        try {
            return drafts.insertNextVersion(draft);
        } catch (WriteConflict conflict) {
            return replay(actor, key, requestHash)
                    .orElseThrow(() -> failure(Code.VERSION_CONFLICT,
                            "Baseline assessment generation conflicted; retry with a new key"));
        }
    }

    private java.util.Optional<BaselineAssessmentDraft> replay(
            Actor actor, String key, String requestHash) {
        return drafts.findByGenerationRequest(actor.accountId(), key).map(existing -> {
            if (!existing.generationRequestHash().equals(requestHash)) {
                throw failure(Code.IDEMPOTENCY_CONFLICT,
                        "Idempotency key was used for a different generation request");
            }
            return existing;
        });
    }

    private BaselineAssessmentDraft find(Actor actor, UUID assessmentVersionId) {
        return drafts.findByVersionId(actor.organizationId(), assessmentVersionId)
                .orElseThrow(() -> failure(Code.NOT_FOUND,
                        "Baseline assessment draft was not found"));
    }

    private static void requireCurrentHash(
            BaselineAssessmentDraft draft, String expectedContentHash) {
        if (!draft.contentHash().equals(expectedContentHash)) {
            throw failure(Code.VERSION_CONFLICT,
                    "Expected contentHash does not match the current assessment content");
        }
    }

    private static String requireContentHash(String value) {
        String hash = requireText(value, "contentHash");
        if (!hash.matches("[0-9a-f]{64}")) {
            throw failure(Code.INVALID_REQUEST, "contentHash must be a lowercase SHA-256 hash");
        }
        return hash;
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

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw failure(Code.INVALID_REQUEST, field + " must not be blank");
        }
        return value.strip();
    }

    private static String hashParts(Object... parts) {
        StringBuilder canonical = new StringBuilder();
        for (Object part : parts) {
            append(canonical, part);
        }
        return sha256(canonical.toString());
    }

    private static void append(StringBuilder target, Object value) {
        String text = Objects.toString(value, "").strip();
        target.append(text.length()).append(':').append(text).append('|');
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private static Failure failure(Code code, String message) {
        return new Failure(code, message);
    }

}
