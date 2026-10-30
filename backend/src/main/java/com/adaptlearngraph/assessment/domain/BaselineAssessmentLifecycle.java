package com.adaptlearngraph.assessment.domain;

import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.ActiveRelease;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.BlueprintProjection;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.BlueprintVersionRef;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.CandidateState;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.OpenCandidate;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.PendingStage;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.SeriesSnapshot;
import java.util.Objects;
import java.util.UUID;

/** Pure policy for one organization and Occupation baseline release line. */
public final class BaselineAssessmentLifecycle {
    private BaselineAssessmentLifecycle() {}

    public static Decision startBlueprintRevision(SeriesSnapshot series) {
        requireNoPendingChange(series);
        return decision(Action.START_BLUEPRINT_REVISION, series, null);
    }

    public static Decision saveBlueprintRevision(
            SeriesSnapshot series, UUID workingRevisionId, long expectedRevision) {
        requireWorkingRevision(series, workingRevisionId);
        if (expectedRevision < 1) {
            throw violation(Code.INVALID_REQUEST, "expected working revision must be positive");
        }
        return new Decision(Action.SAVE_BLUEPRINT_REVISION, series.seriesRevision(),
                workingRevisionId, expectedRevision);
    }

    public static Decision finalizeBlueprintRevision(
            SeriesSnapshot series, UUID workingRevisionId, long expectedRevision) {
        requireWorkingRevision(series, workingRevisionId);
        if (expectedRevision < 1) {
            throw violation(Code.INVALID_REQUEST, "expected working revision must be positive");
        }
        return new Decision(Action.FINALIZE_BLUEPRINT_REVISION, series.seriesRevision(),
                workingRevisionId, expectedRevision);
    }

    public static Decision generateDraft(SeriesSnapshot series, BlueprintVersionRef blueprint) {
        Objects.requireNonNull(blueprint, "blueprint must not be null");
        if (series.openCandidate() != null) {
            throw violation(Code.OPEN_ASSESSMENT_CANDIDATE_EXISTS,
                    "An open assessment candidate already exists");
        }
        if (!blueprint.equals(series.pendingBlueprint())) {
            throw violation(Code.INVALID_TRANSITION,
                    "Assessment draft must use the pending Blueprint version");
        }
        return decision(Action.GENERATE_DRAFT, series, null);
    }

    public static Decision editDraft(
            SeriesSnapshot series, UUID assessmentVersionId, long expectedDraftRevision) {
        OpenCandidate candidate = requireCandidate(series, assessmentVersionId);
        if (candidate.state() != CandidateState.DRAFT) {
            throw violation(Code.REVIEWED_CANDIDATE_IMMUTABLE,
                    "A reviewed candidate must be replaced instead of edited");
        }
        if (candidate.draftRevision() != expectedDraftRevision) {
            throw violation(Code.STALE_ASSESSMENT_REVISION,
                    "Assessment draft revision is stale");
        }
        return new Decision(Action.EDIT_DRAFT, series.seriesRevision(),
                assessmentVersionId, expectedDraftRevision);
    }

    public static Decision reviewDraft(SeriesSnapshot series, UUID assessmentVersionId) {
        OpenCandidate candidate = requireCandidate(series, assessmentVersionId);
        if (candidate.state() != CandidateState.DRAFT) {
            throw violation(Code.INVALID_TRANSITION, "Only a Draft candidate can be reviewed");
        }
        return decision(Action.REVIEW_DRAFT, series, assessmentVersionId);
    }

    public static Decision replaceReviewed(SeriesSnapshot series, UUID assessmentVersionId) {
        OpenCandidate candidate = requireCandidate(series, assessmentVersionId);
        if (candidate.state() != CandidateState.REVIEWED) {
            throw violation(Code.INVALID_TRANSITION,
                    "Only a Reviewed candidate can be replaced");
        }
        return decision(Action.REPLACE_REVIEWED, series, assessmentVersionId);
    }

    public static Decision publishReviewed(SeriesSnapshot series, UUID assessmentVersionId) {
        OpenCandidate candidate = requireCandidate(series, assessmentVersionId);
        if (candidate.state() != CandidateState.REVIEWED) {
            throw violation(Code.REVIEW_REQUIRED,
                    "The open candidate must be reviewed before publication");
        }
        return decision(Action.PUBLISH_REVIEWED, series, assessmentVersionId);
    }

    public static Decision restoreHistorical(SeriesSnapshot series, UUID assessmentVersionId) {
        Objects.requireNonNull(assessmentVersionId, "assessmentVersionId must not be null");
        requireNoPendingChange(series);
        if (series.activeRelease() != null
                && series.activeRelease().assessment().assessmentVersionId()
                        .equals(assessmentVersionId)) {
            throw violation(Code.ACTIVE_ASSESSMENT_CONFLICT,
                    "The active assessment does not need to be restored");
        }
        return decision(Action.RESTORE_HISTORICAL, series, assessmentVersionId);
    }

    public static Decision disableActive(SeriesSnapshot series, UUID assessmentVersionId) {
        Objects.requireNonNull(assessmentVersionId, "assessmentVersionId must not be null");
        if (series.activeRelease() == null
                || !series.activeRelease().assessment().assessmentVersionId()
                        .equals(assessmentVersionId)) {
            throw violation(Code.ACTIVE_ASSESSMENT_CONFLICT,
                    "Only the active assessment can be disabled");
        }
        return decision(Action.DISABLE_ACTIVE, series, assessmentVersionId);
    }

    public static Decision abandonPendingChange(SeriesSnapshot series) {
        if (series.pendingStage() == PendingStage.NONE) {
            throw violation(Code.INVALID_TRANSITION, "No pending change exists");
        }
        return decision(Action.ABANDON_PENDING_CHANGE, series, pendingSubject(series));
    }

    public static BlueprintProjection blueprintProjection(
            SeriesSnapshot series, BlueprintVersionRef blueprint) {
        Objects.requireNonNull(blueprint, "blueprint must not be null");
        if (series.activeRelease() != null
                && series.activeRelease().assessment().blueprint().equals(blueprint)) {
            return BlueprintProjection.ACTIVE_SOURCE;
        }
        if (series.openCandidate() != null
                && series.openCandidate().assessment().blueprint().equals(blueprint)) {
            return BlueprintProjection.DRAFT_SOURCE;
        }
        if (blueprint.equals(series.pendingBlueprint())) {
            return BlueprintProjection.CANDIDATE;
        }
        return BlueprintProjection.HISTORICAL;
    }

    private static void requireNoPendingChange(SeriesSnapshot series) {
        if (series.pendingStage() != PendingStage.NONE) {
            throw violation(Code.PENDING_CHANGE_EXISTS, "A pending change already exists");
        }
    }

    private static void requireWorkingRevision(SeriesSnapshot series, UUID workingRevisionId) {
        Objects.requireNonNull(workingRevisionId, "workingRevisionId must not be null");
        if (!workingRevisionId.equals(series.workingRevisionId())) {
            throw violation(Code.STALE_WORKING_REVISION,
                    "Working Blueprint revision is missing or stale");
        }
    }

    private static OpenCandidate requireCandidate(
            SeriesSnapshot series, UUID assessmentVersionId) {
        Objects.requireNonNull(assessmentVersionId, "assessmentVersionId must not be null");
        if (series.openCandidate() == null
                || !series.openCandidate().assessment().assessmentVersionId()
                        .equals(assessmentVersionId)) {
            throw violation(Code.OPEN_ASSESSMENT_CANDIDATE_NOT_FOUND,
                    "Open assessment candidate was not found");
        }
        return series.openCandidate();
    }

    private static Decision decision(Action action, SeriesSnapshot series, UUID subjectId) {
        return new Decision(action, series.seriesRevision(), subjectId, null);
    }

    private static UUID pendingSubject(SeriesSnapshot series) {
        if (series.openCandidate() != null) {
            return series.openCandidate().assessment().assessmentVersionId();
        }
        if (series.workingRevisionId() != null) {
            return series.workingRevisionId();
        }
        return series.pendingBlueprint() == null
                ? null
                : series.pendingBlueprint().blueprintId();
    }

    private static PolicyViolation violation(Code code, String message) {
        return new PolicyViolation(code, message);
    }

    public record Decision(
            Action action, long expectedSeriesRevision, UUID subjectId, Long expectedResourceRevision) {
        public Decision {
            Objects.requireNonNull(action, "action must not be null");
            if (expectedSeriesRevision < 1) {
                throw new IllegalArgumentException("expectedSeriesRevision must be positive");
            }
        }
    }

    public enum Action {
        START_BLUEPRINT_REVISION,
        SAVE_BLUEPRINT_REVISION,
        FINALIZE_BLUEPRINT_REVISION,
        GENERATE_DRAFT,
        EDIT_DRAFT,
        REVIEW_DRAFT,
        REPLACE_REVIEWED,
        PUBLISH_REVIEWED,
        RESTORE_HISTORICAL,
        DISABLE_ACTIVE,
        ABANDON_PENDING_CHANGE
    }

    public enum Code {
        INVALID_REQUEST,
        INVALID_TRANSITION,
        PENDING_CHANGE_EXISTS,
        OPEN_ASSESSMENT_CANDIDATE_EXISTS,
        OPEN_ASSESSMENT_CANDIDATE_NOT_FOUND,
        ACTIVE_ASSESSMENT_CONFLICT,
        STALE_WORKING_REVISION,
        STALE_ASSESSMENT_REVISION,
        REVIEW_REQUIRED,
        REVIEWED_CANDIDATE_IMMUTABLE
    }

    public static final class PolicyViolation extends RuntimeException {
        private final Code code;

        public PolicyViolation(Code code, String message) {
            super(message);
            this.code = Objects.requireNonNull(code, "code must not be null");
        }

        public Code code() {
            return code;
        }
    }

}
