package com.adaptlearngraph.assessment.application.port.out;

import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface BaselineAssessmentDraftStore {
    List<CandidateItem> findPublishedCandidates(Set<String> microSkillIds);

    Optional<BaselineAssessmentDraft> findByGenerationRequest(UUID actorId, String idempotencyKey);

    Optional<BaselineAssessmentDraft> findByVersionId(UUID assessmentVersionId);

    default Optional<BaselineAssessmentDraft> findByVersionId(
            String organizationId, UUID assessmentVersionId) {
        return findByVersionId(assessmentVersionId);
    }

    BaselineAssessmentDraft insertNextVersion(NewDraft draft);

    boolean review(UUID assessmentVersionId, UUID reviewerId, Instant reviewedAt, String expectedContentHash);

    default boolean review(
            String organizationId, UUID assessmentVersionId, UUID reviewerId,
            Instant reviewedAt, String expectedContentHash) {
        return review(assessmentVersionId, reviewerId, reviewedAt, expectedContentHash);
    }

    boolean publish(UUID assessmentVersionId, String expectedContentHash);

    default boolean publish(
            String organizationId, UUID assessmentVersionId, String expectedContentHash) {
        return publish(assessmentVersionId, expectedContentHash);
    }

    BaselineAssessmentDraft updateManifest(
            String organizationId, UUID assessmentVersionId, long expectedDraftRevision,
            String title, List<UUID> orderedItemVersionIds);

    void closeCandidate(String organizationId, UUID assessmentVersionId);

    BaselineAssessmentDraft cloneAsOpenCandidate(CloneCandidate candidate);

    record CandidateItem(
            UUID itemVersionId,
            String microSkillId,
            String microSkillNameSnapshot,
            Difficulty difficulty,
            String itemContentHash,
            String prompt,
            String responseSchemaJson) {}

    record NewItem(
            CandidateItem candidate,
            String roleId,
            String roleNameSnapshot,
            BigDecimal scoringWeight) {}

    record NewDraft(
            UUID assessmentVersionId,
            UUID assessmentId,
            String title,
            UUID blueprintId,
            int blueprintVersion,
            long generationSeed,
            UUID createdBy,
            Instant createdAt,
            String idempotencyKey,
            String requestHash,
            String contentHash,
            List<NewItem> items) {
        public NewDraft {
            items = List.copyOf(items);
        }
    }

    record CloneCandidate(
            String organizationId,
            UUID sourceAssessmentVersionId,
            UUID newAssessmentVersionId,
            UUID actorId,
            Instant occurredAt,
            String idempotencyKey,
            String requestHash) {}

    enum Difficulty {
        EASY,
        MEDIUM,
        HARD
    }

    final class WriteConflict extends RuntimeException {
        public WriteConflict(Throwable cause) {
            super(cause);
        }
    }

    final class DependencyUnavailable extends RuntimeException {
        public DependencyUnavailable(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
