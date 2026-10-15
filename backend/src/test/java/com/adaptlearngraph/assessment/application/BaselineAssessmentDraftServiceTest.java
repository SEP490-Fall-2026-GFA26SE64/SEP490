package com.adaptlearngraph.assessment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.CandidateItem;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.Difficulty;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.NewDraft;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft.Item;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft.PublicationState;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** REQ-002-F02 generation/review/publish policy; adapters are deterministic fakes. */
class BaselineAssessmentDraftServiceTest {
    private static final UUID ACTOR_ID = uuid(101);
    private static final UUID BLUEPRINT_ID = uuid(201);
    private static final String ROLE_ID = "role-java";
    private static final String SKILL_ID = "skill-java";
    private static final Instant NOW = Instant.parse("2026-10-14T16:00:00Z");

    @Test
    void generatesExactManifestWithDifficultyWeightsAndPinnedMetadata() {
        var fixture = new Fixture();

        BaselineAssessmentDraft generated = fixture.service.generate(BLUEPRINT_ID, 1, "generate-1");

        assertThat(generated.version()).isOne();
        assertThat(generated.blueprintId()).isEqualTo(BLUEPRINT_ID);
        assertThat(generated.blueprintVersion()).isOne();
        assertThat(generated.generationSeed()).isEqualTo(42L);
        assertThat(generated.createdBy()).isEqualTo(ACTOR_ID);
        assertThat(generated.createdAt()).isEqualTo(NOW);
        assertThat(generated.contentHash()).matches("[0-9a-f]{64}");
        assertThat(generated.items()).hasSize(3)
                .extracting(Item::difficulty)
                .containsExactly("EASY", "MEDIUM", "HARD");
        assertThat(generated.items()).extracting(Item::scoringWeight)
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("0.3"), new BigDecimal("0.4"), new BigDecimal("0.3"));
        assertThat(generated.items()).allSatisfy(item -> {
            assertThat(item.roleId()).isEqualTo(ROLE_ID);
            assertThat(item.microSkillId()).isEqualTo(SKILL_ID);
        });
    }

    @Test
    void retryReturnsSameVersionWithoutRegeneratingAndNewKeyCreatesSuccessor() {
        var fixture = new Fixture();
        BaselineAssessmentDraft first = fixture.service.generate(BLUEPRINT_ID, 1, "retry-key");
        int candidateCalls = fixture.drafts.candidateCalls;

        BaselineAssessmentDraft replay = fixture.service.generate(BLUEPRINT_ID, 1, "retry-key");
        BaselineAssessmentDraft regenerated = fixture.service.generate(BLUEPRINT_ID, 1, "new-key");

        assertThat(replay.assessmentVersionId()).isEqualTo(first.assessmentVersionId());
        assertThat(fixture.drafts.candidateCalls).isEqualTo(candidateCalls + 1);
        assertThat(regenerated.assessmentVersionId()).isNotEqualTo(first.assessmentVersionId());
        assertThat(regenerated.assessmentId()).isEqualTo(first.assessmentId());
        assertThat(regenerated.version()).isEqualTo(2);
    }

    @Test
    void sameIdempotencyKeyForAnotherBlueprintVersionConflicts() {
        var fixture = new Fixture();
        fixture.blueprints.versions.put(2, blueprint(2));
        fixture.service.generate(BLUEPRINT_ID, 1, "shared-key");

        assertCode(Code.IDEMPOTENCY_CONFLICT,
                () -> fixture.service.generate(BLUEPRINT_ID, 2, "shared-key"));
        assertThat(fixture.drafts.byId).hasSize(1);
    }

    @Test
    void reportsChangedCoverageAndDoesNotPersistPartialManifest() {
        var fixture = new Fixture();
        fixture.drafts.candidates.removeIf(candidate -> candidate.difficulty() == Difficulty.HARD);

        assertThatThrownBy(() -> fixture.service.generate(BLUEPRINT_ID, 1, "shortage"))
                .isInstanceOfSatisfying(Failure.class, failure -> {
                    assertThat(failure.code()).isEqualTo(Code.INSUFFICIENT_QUESTION_COVERAGE);
                    assertThat(failure.coverageShortages()).singleElement().satisfies(shortage -> {
                        assertThat(shortage.roleId()).isEqualTo(ROLE_ID);
                        assertThat(shortage.microSkillId()).isEqualTo(SKILL_ID);
                        assertThat(shortage.difficulty()).isEqualTo("HARD");
                        assertThat(shortage.missing()).isOne();
                    });
                });
        assertThat(fixture.drafts.byId).isEmpty();
    }

    @Test
    void requiresExactHashReviewBeforePublishingAndKeepsRetriesIdempotent() {
        var fixture = new Fixture();
        BaselineAssessmentDraft generated = fixture.service.generate(BLUEPRINT_ID, 1, "lifecycle");

        assertCode(Code.REVIEW_REQUIRED, () -> fixture.service.publish(
                generated.assessmentVersionId(), generated.contentHash()));
        assertCode(Code.VERSION_CONFLICT, () -> fixture.service.review(
                generated.assessmentVersionId(), "0".repeat(64)));

        BaselineAssessmentDraft reviewed = fixture.service.review(
                generated.assessmentVersionId(), generated.contentHash());
        BaselineAssessmentDraft reviewedReplay = fixture.service.review(
                generated.assessmentVersionId(), generated.contentHash());
        BaselineAssessmentDraft published = fixture.service.publish(
                generated.assessmentVersionId(), generated.contentHash());
        BaselineAssessmentDraft publishedReplay = fixture.service.publish(
                generated.assessmentVersionId(), generated.contentHash());

        assertThat(reviewed.publicationState()).isEqualTo(PublicationState.DRAFT);
        assertThat(reviewed.reviewedBy()).isEqualTo(ACTOR_ID);
        assertThat(reviewed.reviewedAt()).isEqualTo(NOW);
        assertThat(reviewed.reviewedContentHash()).isEqualTo(generated.contentHash());
        assertThat(reviewedReplay).isEqualTo(reviewed);
        assertThat(published.publicationState()).isEqualTo(PublicationState.PUBLISHED);
        assertThat(publishedReplay).isEqualTo(published);
        assertThat(fixture.drafts.reviewCalls).isOne();
        assertThat(fixture.drafts.publishCalls).isOne();
    }

    @Test
    void rejectsInvalidHashAndMissingDraftWithoutMutatingStore() {
        var fixture = new Fixture();

        assertCode(Code.INVALID_REQUEST, () -> fixture.service.review(uuid(999), "not-a-hash"));
        assertCode(Code.NOT_FOUND, () -> fixture.service.review(uuid(999), "a".repeat(64)));
        assertThat(fixture.drafts.reviewCalls).isZero();
        assertThat(fixture.drafts.publishCalls).isZero();
    }

    @Test
    void authorizationRunsBeforeBlueprintOrDraftDependencies() {
        var fixture = new Fixture();
        fixture.actor = Optional.of(new Actor(ACTOR_ID, "org-alpha", true, Set.of("EMPLOYEE")));

        assertCode(Code.FORBIDDEN, () -> fixture.service.generate(BLUEPRINT_ID, 1, "forbidden"));
        assertCode(Code.FORBIDDEN, () -> fixture.service.get(uuid(999)));
        assertThat(fixture.blueprints.findCalls).isZero();
        assertThat(fixture.drafts.findCalls).isZero();
    }

    private static BaselineBlueprint blueprint(int version) {
        return new BaselineBlueprint(
                BLUEPRINT_ID, version, "Java baseline", null, null, ACTOR_ID,
                "blueprint-key-" + version, "request-hash-" + version, NOW.minusSeconds(60),
                List.of(new RoleConfig(
                        ROLE_ID, "Java Backend Engineer", true,
                        new BigDecimal("0.3"), new BigDecimal("0.4"), new BigDecimal("0.3"),
                        List.of(new SkillConfig(SKILL_ID, "Java Core", 1, 1, 1)))));
    }

    private static CandidateItem candidate(long id, Difficulty difficulty) {
        return new CandidateItem(
                uuid(id), SKILL_ID, "Java Core", difficulty, "item-hash-" + id,
                "Question " + id, "{\"type\":\"single-choice\"}");
    }

    private static UUID uuid(long value) {
        return new UUID(0L, value);
    }

    private static void assertCode(Code code, ThrowingCall call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(code));
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void run();
    }

    private static final class Fixture {
        private Optional<Actor> actor = Optional.of(
                new Actor(ACTOR_ID, "org-alpha", true, Set.of("LD_MANAGER")));
        private final FakeBlueprintStore blueprints = new FakeBlueprintStore();
        private final InMemoryDraftStore drafts = new InMemoryDraftStore();
        private final BaselineAssessmentDraftService service = new BaselineAssessmentDraftService(
                () -> actor, blueprints, drafts, Clock.fixed(NOW, ZoneOffset.UTC), () -> 42L);
    }

    private static final class FakeBlueprintStore implements BaselineBlueprintStore {
        private final Map<Integer, BaselineBlueprint> versions = new HashMap<>(Map.of(1, blueprint(1)));
        private int findCalls;

        @Override
        public Optional<BaselineBlueprint> findLatest(UUID blueprintId) {
            return versions.values().stream().max(Comparator.comparingInt(BaselineBlueprint::version));
        }

        @Override
        public Optional<BaselineBlueprint> findVersion(UUID blueprintId, int version) {
            findCalls++;
            return BLUEPRINT_ID.equals(blueprintId) ? Optional.ofNullable(versions.get(version)) : Optional.empty();
        }

        @Override
        public Optional<BaselineBlueprint> findByRequest(UUID actorId, String idempotencyKey) {
            return Optional.empty();
        }

        @Override
        public void insert(BaselineBlueprint value) {
            throw new UnsupportedOperationException();
        }
    }

    private static final class InMemoryDraftStore implements BaselineAssessmentDraftStore {
        private final List<CandidateItem> candidates = new ArrayList<>(List.of(
                candidate(301, Difficulty.EASY), candidate(302, Difficulty.EASY),
                candidate(311, Difficulty.MEDIUM), candidate(312, Difficulty.MEDIUM),
                candidate(321, Difficulty.HARD), candidate(322, Difficulty.HARD)));
        private final Map<UUID, BaselineAssessmentDraft> byId = new LinkedHashMap<>();
        private final Map<String, UUID> requestIds = new HashMap<>();
        private int candidateCalls;
        private int findCalls;
        private int reviewCalls;
        private int publishCalls;

        @Override
        public List<CandidateItem> findPublishedCandidates(Set<String> microSkillIds) {
            candidateCalls++;
            return candidates.stream().filter(item -> microSkillIds.contains(item.microSkillId())).toList();
        }

        @Override
        public Optional<BaselineAssessmentDraft> findByGenerationRequest(UUID actorId, String idempotencyKey) {
            return Optional.ofNullable(requestIds.get(actorId + ":" + idempotencyKey)).map(byId::get);
        }

        @Override
        public Optional<BaselineAssessmentDraft> findByVersionId(UUID assessmentVersionId) {
            findCalls++;
            return Optional.ofNullable(byId.get(assessmentVersionId));
        }

        @Override
        public BaselineAssessmentDraft insertNextVersion(NewDraft draft) {
            int version = (int) byId.values().stream()
                    .filter(existing -> existing.assessmentId().equals(draft.assessmentId()))
                    .count() + 1;
            List<Item> items = new ArrayList<>();
            int position = 1;
            for (var item : draft.items()) {
                items.add(new Item(
                        position++, item.candidate().itemVersionId(), item.roleId(), item.roleNameSnapshot(),
                        item.candidate().microSkillId(), item.candidate().microSkillNameSnapshot(),
                        item.candidate().difficulty().name(), item.scoringWeight(), item.candidate().prompt(),
                        item.candidate().responseSchemaJson()));
            }
            var stored = new BaselineAssessmentDraft(
                    draft.assessmentVersionId(), draft.assessmentId(), version, draft.title(),
                    draft.blueprintId(), draft.blueprintVersion(), draft.generationSeed(), draft.createdBy(),
                    draft.createdAt(), draft.requestHash(), draft.contentHash(), PublicationState.DRAFT,
                    null, null, null, items);
            byId.put(stored.assessmentVersionId(), stored);
            requestIds.put(draft.createdBy() + ":" + draft.idempotencyKey(), stored.assessmentVersionId());
            return stored;
        }

        @Override
        public boolean review(
                UUID assessmentVersionId, UUID reviewerId, Instant reviewedAt, String expectedContentHash) {
            reviewCalls++;
            BaselineAssessmentDraft current = byId.get(assessmentVersionId);
            if (current == null || !current.contentHash().equals(expectedContentHash)
                    || current.reviewedContentHash() != null) {
                return false;
            }
            byId.put(assessmentVersionId, copy(current, PublicationState.DRAFT,
                    reviewerId, reviewedAt, expectedContentHash));
            return true;
        }

        @Override
        public boolean publish(UUID assessmentVersionId, String expectedContentHash) {
            publishCalls++;
            BaselineAssessmentDraft current = byId.get(assessmentVersionId);
            if (current == null || !expectedContentHash.equals(current.reviewedContentHash())) {
                return false;
            }
            byId.put(assessmentVersionId, copy(current, PublicationState.PUBLISHED,
                    current.reviewedBy(), current.reviewedAt(), current.reviewedContentHash()));
            return true;
        }

        private static BaselineAssessmentDraft copy(
                BaselineAssessmentDraft current, PublicationState state,
                UUID reviewerId, Instant reviewedAt, String reviewedHash) {
            return new BaselineAssessmentDraft(
                    current.assessmentVersionId(), current.assessmentId(), current.version(), current.title(),
                    current.blueprintId(), current.blueprintVersion(), current.generationSeed(),
                    current.createdBy(), current.createdAt(), current.generationRequestHash(),
                    current.contentHash(), state, reviewerId, reviewedAt, reviewedHash, current.items());
        }
    }
}
