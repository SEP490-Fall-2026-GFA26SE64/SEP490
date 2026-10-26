package com.adaptlearngraph.assessment.application.port.in;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.SeriesSnapshot;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** L&D management boundary. Actor and organization are always obtained from trusted context. */
public interface BaselineAssessmentManagementUseCase {
    OccupationPage listOccupations(OccupationQuery query);

    Workspace getWorkspace(String occupationId);

    WorkingRevision startBlueprintRevision(String occupationId, String idempotencyKey);

    WorkingRevision saveBlueprintRevision(
            UUID workingRevisionId,
            long expectedRevision,
            String idempotencyKey,
            BlueprintDraft draft);

    BaselineBlueprint finalizeBlueprintRevision(
            UUID workingRevisionId, long expectedRevision, String idempotencyKey);

    BaselineAssessmentDraft generateAssessmentDraft(
            String occupationId, String idempotencyKey);

    BaselineAssessmentDraft getAssessmentVersion(UUID assessmentVersionId);

    BaselineAssessmentDraft reviewAssessmentDraft(
            UUID assessmentVersionId, String expectedContentHash);

    BaselineAssessmentDraft publishAssessment(
            UUID assessmentVersionId, String expectedContentHash);

    BaselineAssessmentDraft editAssessmentDraft(
            UUID assessmentVersionId,
            long expectedRevision,
            String idempotencyKey,
            ManifestEdit edit);

    BaselineAssessmentDraft replaceReviewedCandidate(
            UUID assessmentVersionId, String idempotencyKey);

    BaselineAssessmentDraft restoreHistoricalAssessment(
            UUID assessmentVersionId, String idempotencyKey);

    Workspace disableActiveAssessment(UUID assessmentVersionId, String reason);

    Workspace abandonPendingChange(String occupationId, String reason);

    record OccupationQuery(
            String search, String status, String sort, int page, int size) {
        public OccupationQuery {
            search = normalize(search);
            status = normalize(status);
            sort = normalize(sort);
            if (page < 0 || size < 1 || size > 100) {
                throw new IllegalArgumentException("page or size is invalid");
            }
        }
    }

    record OccupationPage(List<OccupationSummary> items, int page, int size, long total) {
        public OccupationPage {
            items = List.copyOf(Objects.requireNonNull(items, "items must not be null"));
            if (page < 0 || size < 1 || total < 0) {
                throw new IllegalArgumentException("page metadata is invalid");
            }
        }
    }

    record OccupationSummary(
            String occupationId,
            String occupationName,
            Integer latestBlueprintVersion,
            String pendingStage,
            Integer openAssessmentVersion,
            String openAssessmentState,
            Integer activeAssessmentVersion,
            java.time.Instant lastUpdatedAt) {}

    record Workspace(
            String occupationId,
            String occupationName,
            SeriesSnapshot lifecycle,
            WorkingRevision workingRevision,
            List<BlueprintVersionSummary> blueprintVersions,
            List<AssessmentVersionSummary> assessmentVersions) {
        public Workspace {
            blueprintVersions = List.copyOf(blueprintVersions);
            assessmentVersions = List.copyOf(assessmentVersions);
        }
    }

    record WorkingRevision(
            UUID workingRevisionId,
            UUID blueprintId,
            Integer baseVersion,
            long revision,
            BlueprintDraft draft,
            java.time.Instant updatedAt) {}

    record BlueprintVersionSummary(
            UUID blueprintId, int version, String name, String projection,
            java.time.Instant createdAt) {}

    record AssessmentVersionSummary(
            UUID assessmentVersionId,
            int version,
            int blueprintVersion,
            String effectiveState,
            String contentHash,
            java.time.Instant createdAt) {}

    record ManifestEdit(String title, List<UUID> orderedItemVersionIds) {
        public ManifestEdit {
            title = requireText(title, "title");
            orderedItemVersionIds = List.copyOf(Objects.requireNonNull(
                    orderedItemVersionIds, "orderedItemVersionIds must not be null"));
            if (orderedItemVersionIds.isEmpty()) {
                throw new IllegalArgumentException("assessment manifest must contain items");
            }
            if (orderedItemVersionIds.stream().distinct().count() != orderedItemVersionIds.size()) {
                throw new IllegalArgumentException("assessment item versions must not repeat");
            }
        }
    }

    final class Failure extends RuntimeException {
        private final Code code;
        private final UUID existingResourceId;

        public Failure(Code code, String message) {
            this(code, message, null);
        }

        public Failure(Code code, String message, UUID existingResourceId) {
            super(message);
            this.code = Objects.requireNonNull(code, "code must not be null");
            this.existingResourceId = existingResourceId;
        }

        public Code code() {
            return code;
        }

        public UUID existingResourceId() {
            return existingResourceId;
        }
    }

    enum Code {
        UNAUTHENTICATED,
        FORBIDDEN,
        NOT_FOUND,
        INVALID_REQUEST,
        DEPENDENCY_UNAVAILABLE,
        PENDING_CHANGE_EXISTS,
        OPEN_ASSESSMENT_CANDIDATE_EXISTS,
        ACTIVE_ASSESSMENT_CONFLICT,
        STALE_WORKING_REVISION,
        STALE_ASSESSMENT_REVISION,
        IDEMPOTENCY_CONFLICT,
        REVIEW_REQUIRED,
        REVIEW_HASH_MISMATCH
    }

    private static String normalize(String value) {
        return value == null ? "" : value.strip();
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
