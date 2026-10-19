package com.adaptlearngraph.assessment.application.port.out;

import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.ActiveRelease;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.BlueprintVersionRef;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.OpenCandidate;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.Scope;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.SeriesSnapshot;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Persistence boundary for the organization + Occupation lifecycle coordination row. Commands
 * that change a child record and a series pointer must invoke both operations in one surrounding
 * transaction.
 */
public interface BaselineAssessmentManagementStore {
    Optional<SeriesSnapshot> findByScope(Scope scope);

    Optional<Scope> findScopeByAssessment(UUID organizationId, UUID assessmentVersionId);

    Optional<Scope> findScopeByWorkingRevision(UUID organizationId, UUID workingRevisionId);

    List<BlueprintVersionRecord> findBlueprintVersions(Scope scope);

    List<AssessmentVersionRecord> findAssessmentVersions(Scope scope);

    /**
     * Loads the series with the lifecycle write lock, creating it through a unique insert/reload
     * path when this is the first configuration for the scope.
     */
    SeriesSnapshot lockOrCreate(Scope scope, UUID blueprintId);

    /**
     * Bootstraps a new Blueprint identity and series under a scope advisory lock, then returns the
     * locked coordination row. Used only when the Occupation has no existing Blueprint identity.
     */
    SeriesSnapshot createAndLock(
            Scope scope, UUID blueprintId, UUID actorId, Instant createdAt);

    /**
     * Applies a compare-and-set pointer update and appends its audit event in the caller's
     * transaction. A stale expected revision must raise {@link WriteConflict}.
     */
    SeriesSnapshot update(Update update);

    Optional<WorkingRevisionRecord> findWorkingRevision(Scope scope, UUID workingRevisionId);

    WorkingRevisionRecord insertWorkingRevision(NewWorkingRevision revision);

    WorkingRevisionRecord saveWorkingRevision(SaveWorkingRevision revision);

    void closeWorkingRevision(CloseWorkingRevision revision);

    Optional<CommandReceipt> findCommand(UUID actorId, String idempotencyKey);

    void insertCommand(CommandReceipt receipt);

    record BlueprintVersionRecord(
            UUID blueprintId, int version, String name, Instant createdAt) {}

    record AssessmentVersionRecord(
            UUID assessmentVersionId, int version, int blueprintVersion,
            String publicationState, String candidateState, boolean disabled, String contentHash,
            Instant createdAt) {}

    record CommandReceipt(
            Scope scope, UUID actorId, String idempotencyKey, String operation,
            String requestHash, String responseJson, Instant createdAt) {}

    record WorkingRevisionRecord(
            UUID workingRevisionId,
            Scope scope,
            UUID blueprintId,
            Integer baseVersion,
            long revision,
            String name,
            String occupationNameSnapshot,
            List<RoleConfig> roles,
            WorkingRevisionState state,
            Instant createdAt,
            Instant updatedAt) {
        public WorkingRevisionRecord {
            java.util.Objects.requireNonNull(workingRevisionId, "workingRevisionId must not be null");
            java.util.Objects.requireNonNull(scope, "scope must not be null");
            java.util.Objects.requireNonNull(blueprintId, "blueprintId must not be null");
            if (baseVersion != null && baseVersion < 1) {
                throw new IllegalArgumentException("baseVersion must be positive");
            }
            if (revision < 1) {
                throw new IllegalArgumentException("revision must be positive");
            }
            name = requireText(name, "name");
            occupationNameSnapshot = requireText(occupationNameSnapshot, "occupationNameSnapshot");
            roles = List.copyOf(java.util.Objects.requireNonNull(roles, "roles must not be null"));
            java.util.Objects.requireNonNull(state, "state must not be null");
            java.util.Objects.requireNonNull(createdAt, "createdAt must not be null");
            java.util.Objects.requireNonNull(updatedAt, "updatedAt must not be null");
        }
    }

    record NewWorkingRevision(
            UUID workingRevisionId,
            Scope scope,
            UUID blueprintId,
            Integer baseVersion,
            String name,
            String occupationNameSnapshot,
            List<RoleConfig> roles,
            UUID actorId,
            Instant occurredAt) {
        public NewWorkingRevision {
            java.util.Objects.requireNonNull(workingRevisionId, "workingRevisionId must not be null");
            java.util.Objects.requireNonNull(scope, "scope must not be null");
            java.util.Objects.requireNonNull(blueprintId, "blueprintId must not be null");
            if (baseVersion != null && baseVersion < 1) {
                throw new IllegalArgumentException("baseVersion must be positive");
            }
            name = requireText(name, "name");
            occupationNameSnapshot = requireText(occupationNameSnapshot, "occupationNameSnapshot");
            roles = List.copyOf(java.util.Objects.requireNonNull(roles, "roles must not be null"));
            java.util.Objects.requireNonNull(actorId, "actorId must not be null");
            java.util.Objects.requireNonNull(occurredAt, "occurredAt must not be null");
        }
    }

    record SaveWorkingRevision(
            Scope scope,
            UUID workingRevisionId,
            long expectedRevision,
            String name,
            String occupationNameSnapshot,
            List<RoleConfig> roles,
            UUID actorId,
            Instant occurredAt) {
        public SaveWorkingRevision {
            java.util.Objects.requireNonNull(scope, "scope must not be null");
            java.util.Objects.requireNonNull(workingRevisionId, "workingRevisionId must not be null");
            if (expectedRevision < 1) {
                throw new IllegalArgumentException("expectedRevision must be positive");
            }
            name = requireText(name, "name");
            occupationNameSnapshot = requireText(occupationNameSnapshot, "occupationNameSnapshot");
            roles = List.copyOf(java.util.Objects.requireNonNull(roles, "roles must not be null"));
            java.util.Objects.requireNonNull(actorId, "actorId must not be null");
            java.util.Objects.requireNonNull(occurredAt, "occurredAt must not be null");
        }
    }

    record CloseWorkingRevision(
            Scope scope,
            UUID workingRevisionId,
            long expectedRevision,
            WorkingRevisionState state,
            UUID actorId,
            Instant occurredAt) {
        public CloseWorkingRevision {
            java.util.Objects.requireNonNull(scope, "scope must not be null");
            java.util.Objects.requireNonNull(workingRevisionId, "workingRevisionId must not be null");
            if (expectedRevision < 1) {
                throw new IllegalArgumentException("expectedRevision must be positive");
            }
            java.util.Objects.requireNonNull(state, "state must not be null");
            if (state == WorkingRevisionState.OPEN) {
                throw new IllegalArgumentException("close state must not be OPEN");
            }
            java.util.Objects.requireNonNull(actorId, "actorId must not be null");
            java.util.Objects.requireNonNull(occurredAt, "occurredAt must not be null");
        }
    }

    enum WorkingRevisionState { OPEN, FINALIZED, ABANDONED }

    record Update(
            Scope scope,
            long expectedSeriesRevision,
            UUID workingRevisionId,
            BlueprintVersionRef pendingBlueprint,
            OpenCandidate openCandidate,
            ActiveRelease activeRelease,
            Transition transition,
            UUID actorId,
            Instant occurredAt,
            String reason) {
        public Update {
            if (expectedSeriesRevision < 1) {
                throw new IllegalArgumentException("expectedSeriesRevision must be positive");
            }
            java.util.Objects.requireNonNull(scope, "scope must not be null");
            java.util.Objects.requireNonNull(transition, "transition must not be null");
            java.util.Objects.requireNonNull(actorId, "actorId must not be null");
            java.util.Objects.requireNonNull(occurredAt, "occurredAt must not be null");
            reason = reason == null || reason.isBlank() ? null : reason.strip();
        }
    }

    enum Transition {
        WORKING_REVISION_STARTED,
        WORKING_REVISION_SAVED,
        BLUEPRINT_FINALIZED,
        ASSESSMENT_DRAFT_OPENED,
        ASSESSMENT_DRAFT_EDITED,
        ASSESSMENT_REVIEWED,
        REVIEWED_CANDIDATE_REPLACED,
        ACTIVE_ASSESSMENT_SWITCHED,
        HISTORICAL_ASSESSMENT_RESTORED,
        ACTIVE_ASSESSMENT_DISABLED,
        PENDING_CHANGE_ABANDONED
    }

    final class WriteConflict extends RuntimeException {
        public WriteConflict(String message, Throwable cause) {
            super(message, cause);
        }
    }

    final class DependencyUnavailable extends RuntimeException {
        public DependencyUnavailable(String message, Throwable cause) {
            super(message, cause);
        }
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
