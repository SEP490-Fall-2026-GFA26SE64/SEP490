package com.adaptlearngraph.assessment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.assessment.domain.BaselineAssessmentLifecycle;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentLifecycle.Action;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentLifecycle.Code;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentLifecycle.PolicyViolation;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.ActiveRelease;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.AssessmentVersionRef;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.BlueprintProjection;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.BlueprintVersionRef;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.CandidateState;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.OpenCandidate;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.Scope;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.SeriesSnapshot;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BaselineAssessmentLifecycleTest {
    private static final UUID ORGANIZATION_ID = uuid(1);
    private static final UUID BLUEPRINT_ID = uuid(2);
    private static final UUID WORKING_REVISION_ID = uuid(3);
    private static final UUID ACTIVE_ID = uuid(4);
    private static final UUID CANDIDATE_ID = uuid(5);
    private static final BlueprintVersionRef ACTIVE_BLUEPRINT = new BlueprintVersionRef(BLUEPRINT_ID, 1);
    private static final BlueprintVersionRef PENDING_BLUEPRINT = new BlueprintVersionRef(BLUEPRINT_ID, 2);

    @Test
    void onlyOnePendingChangeChainCanBeStarted() {
        assertThat(BaselineAssessmentLifecycle.startBlueprintRevision(empty()).action())
                .isEqualTo(Action.START_BLUEPRINT_REVISION);
        assertViolation(() -> BaselineAssessmentLifecycle.startBlueprintRevision(working()),
                Code.PENDING_CHANGE_EXISTS);
        assertViolation(() -> BaselineAssessmentLifecycle.startBlueprintRevision(candidate(CandidateState.DRAFT)),
                Code.PENDING_CHANGE_EXISTS);
    }

    @Test
    void draftCanBeEditedButReviewedCandidateMustBeReplaced() {
        var edit = BaselineAssessmentLifecycle.editDraft(candidate(CandidateState.DRAFT), CANDIDATE_ID, 7);
        assertThat(edit.action()).isEqualTo(Action.EDIT_DRAFT);
        assertThat(edit.expectedResourceRevision()).isEqualTo(7);
        assertViolation(() -> BaselineAssessmentLifecycle.editDraft(
                candidate(CandidateState.DRAFT), CANDIDATE_ID, 6), Code.STALE_ASSESSMENT_REVISION);
        assertViolation(() -> BaselineAssessmentLifecycle.editDraft(
                candidate(CandidateState.REVIEWED), CANDIDATE_ID, 7), Code.REVIEWED_CANDIDATE_IMMUTABLE);
        assertThat(BaselineAssessmentLifecycle.replaceReviewed(
                candidate(CandidateState.REVIEWED), CANDIDATE_ID).action()).isEqualTo(Action.REPLACE_REVIEWED);
    }

    @Test
    void publishRequiresReviewedCandidateAndTargetsAtomicSwitch() {
        assertViolation(() -> BaselineAssessmentLifecycle.publishReviewed(
                candidate(CandidateState.DRAFT), CANDIDATE_ID), Code.REVIEW_REQUIRED);
        var decision = BaselineAssessmentLifecycle.publishReviewed(candidate(CandidateState.REVIEWED), CANDIDATE_ID);
        assertThat(decision.action()).isEqualTo(Action.PUBLISH_REVIEWED);
        assertThat(decision.subjectId()).isEqualTo(CANDIDATE_ID);
        assertThat(decision.expectedSeriesRevision()).isEqualTo(11);
    }

    @Test
    void restoreRejectsActiveAndAnyPendingChange() {
        assertViolation(() -> BaselineAssessmentLifecycle.restoreHistorical(empty(), ACTIVE_ID),
                Code.ACTIVE_ASSESSMENT_CONFLICT);
        assertViolation(() -> BaselineAssessmentLifecycle.restoreHistorical(working(), uuid(9)),
                Code.PENDING_CHANGE_EXISTS);
        assertThat(BaselineAssessmentLifecycle.restoreHistorical(empty(), uuid(9)).action())
                .isEqualTo(Action.RESTORE_HISTORICAL);
    }

    @Test
    void projectionsDistinguishActiveDraftAndHistory() {
        SeriesSnapshot series = candidate(CandidateState.DRAFT);
        assertThat(BaselineAssessmentLifecycle.blueprintProjection(series, ACTIVE_BLUEPRINT))
                .isEqualTo(BlueprintProjection.ACTIVE_SOURCE);
        assertThat(BaselineAssessmentLifecycle.blueprintProjection(series, PENDING_BLUEPRINT))
                .isEqualTo(BlueprintProjection.DRAFT_SOURCE);
        assertThat(BaselineAssessmentLifecycle.blueprintProjection(
                series, new BlueprintVersionRef(BLUEPRINT_ID, 3))).isEqualTo(BlueprintProjection.HISTORICAL);
    }

    private static SeriesSnapshot empty() { return snapshot(null, null, null); }
    private static SeriesSnapshot working() { return snapshot(WORKING_REVISION_ID, null, null); }

    private static SeriesSnapshot candidate(CandidateState state) {
        AssessmentVersionRef assessment = new AssessmentVersionRef(CANDIDATE_ID, 2, PENDING_BLUEPRINT);
        return snapshot(null, PENDING_BLUEPRINT, new OpenCandidate(assessment, state, 7, "hash"));
    }

    private static SeriesSnapshot snapshot(
            UUID workingRevisionId, BlueprintVersionRef pendingBlueprint, OpenCandidate openCandidate) {
        AssessmentVersionRef active = new AssessmentVersionRef(ACTIVE_ID, 1, ACTIVE_BLUEPRINT);
        return new SeriesSnapshot(new Scope(ORGANIZATION_ID, "occupation-engineering"), BLUEPRINT_ID, 11,
                workingRevisionId, pendingBlueprint, openCandidate, new ActiveRelease(active));
    }

    private static void assertViolation(Runnable action, Code code) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(PolicyViolation.class,
                failure -> assertThat(failure.code()).isEqualTo(code));
    }

    private static UUID uuid(long value) { return new UUID(0L, value); }
}
