package com.adaptlearngraph.assessment.domain;

import java.util.Objects;
import java.util.UUID;

/** Immutable lifecycle snapshot and value objects for one baseline release line. */
public final class BaselineAssessmentSeries {
    private BaselineAssessmentSeries() {}

    public record Scope(UUID organizationId, String occupationId) {
        public Scope {
            Objects.requireNonNull(organizationId, "organizationId must not be null");
            occupationId = requireText(occupationId, "occupationId");
        }
    }

    public record BlueprintVersionRef(UUID blueprintId, int version) {
        public BlueprintVersionRef {
            Objects.requireNonNull(blueprintId, "blueprintId must not be null");
            if (version < 1) {
                throw new IllegalArgumentException("Blueprint version must be positive");
            }
        }
    }

    public record AssessmentVersionRef(
            UUID assessmentVersionId, int version, BlueprintVersionRef blueprint) {
        public AssessmentVersionRef {
            Objects.requireNonNull(assessmentVersionId, "assessmentVersionId must not be null");
            if (version < 1) {
                throw new IllegalArgumentException("assessment version must be positive");
            }
            Objects.requireNonNull(blueprint, "blueprint must not be null");
        }
    }

    public record OpenCandidate(
            AssessmentVersionRef assessment,
            CandidateState state,
            long draftRevision,
            String contentHash) {
        public OpenCandidate {
            Objects.requireNonNull(assessment, "assessment must not be null");
            Objects.requireNonNull(state, "state must not be null");
            if (draftRevision < 1) {
                throw new IllegalArgumentException("draftRevision must be positive");
            }
            contentHash = requireText(contentHash, "contentHash");
        }
    }

    public record ActiveRelease(AssessmentVersionRef assessment) {
        public ActiveRelease {
            Objects.requireNonNull(assessment, "assessment must not be null");
        }
    }

    public record SeriesSnapshot(
            Scope scope,
            UUID blueprintId,
            long seriesRevision,
            UUID workingRevisionId,
            BlueprintVersionRef pendingBlueprint,
            OpenCandidate openCandidate,
            ActiveRelease activeRelease) {
        public SeriesSnapshot {
            Objects.requireNonNull(scope, "scope must not be null");
            Objects.requireNonNull(blueprintId, "blueprintId must not be null");
            if (seriesRevision < 1) {
                throw new IllegalArgumentException("seriesRevision must be positive");
            }
            if (pendingBlueprint != null
                    && !blueprintId.equals(pendingBlueprint.blueprintId())) {
                throw new IllegalArgumentException(
                        "pending Blueprint must belong to the series Blueprint identity");
            }
            if (activeRelease != null
                    && !blueprintId.equals(
                            activeRelease.assessment().blueprint().blueprintId())) {
                throw new IllegalArgumentException(
                        "active assessment must belong to the series Blueprint identity");
            }
            if (workingRevisionId != null && pendingBlueprint != null) {
                throw new IllegalArgumentException(
                        "working revision and finalized pending Blueprint cannot coexist");
            }
            if (openCandidate != null) {
                if (pendingBlueprint == null
                        || !pendingBlueprint.equals(openCandidate.assessment().blueprint())) {
                    throw new IllegalArgumentException(
                            "open candidate must use the pending Blueprint version");
                }
                if (activeRelease != null
                        && activeRelease.assessment().assessmentVersionId()
                                .equals(openCandidate.assessment().assessmentVersionId())) {
                    throw new IllegalArgumentException(
                            "active and open assessment versions must differ");
                }
            }
        }

        public PendingStage pendingStage() {
            if (openCandidate != null) {
                return openCandidate.state() == CandidateState.REVIEWED
                        ? PendingStage.ASSESSMENT_REVIEWED
                        : PendingStage.ASSESSMENT_DRAFT;
            }
            if (pendingBlueprint != null) {
                return PendingStage.BLUEPRINT_CANDIDATE;
            }
            return workingRevisionId == null
                    ? PendingStage.NONE
                    : PendingStage.WORKING_REVISION;
        }
    }

    public enum CandidateState { DRAFT, REVIEWED }

    public enum PendingStage {
        NONE, WORKING_REVISION, BLUEPRINT_CANDIDATE, ASSESSMENT_DRAFT, ASSESSMENT_REVIEWED
    }

    public enum BlueprintProjection { ACTIVE_SOURCE, DRAFT_SOURCE, CANDIDATE, HISTORICAL }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
