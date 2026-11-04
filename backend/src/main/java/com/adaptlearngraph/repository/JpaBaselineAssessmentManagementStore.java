package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.ActiveRelease;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.AssessmentVersionRef;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.BlueprintVersionRef;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.CandidateState;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.OpenCandidate;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.PendingStage;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.Scope;
import com.adaptlearngraph.entities.domain.BaselineAssessmentSeries.SeriesSnapshot;
import com.adaptlearngraph.entities.BaselineAssessmentTransitionEntity;
import com.adaptlearngraph.entities.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.entities.BaselineBlueprintWorkingRevisionEntity;
import com.adaptlearngraph.entities.BaselineManagementCommandEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataRetrievalFailureException;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.transaction.annotation.Transactional;

/** JPA lifecycle store. Every mutation locks series before child rows. */
public class JpaBaselineAssessmentManagementStore
        implements BaselineAssessmentManagementStore {
    private final BaselineAssessmentSeriesJpaRepository series;
    private final BaselineBlueprintWorkingRevisionJpaRepository workings;
    private final BaselineAssessmentTransitionJpaRepository transitions;
    private final BaselineManagementCommandJpaRepository commands;
    private final BaselineBlueprintJpaRepository identities;
    private final PostgresAdvisoryLocks locks;
    private final ObjectMapper json;

    public JpaBaselineAssessmentManagementStore(BaselineAssessmentSeriesJpaRepository series,
            BaselineBlueprintWorkingRevisionJpaRepository workings, BaselineAssessmentTransitionJpaRepository transitions,
            BaselineManagementCommandJpaRepository commands, BaselineBlueprintJpaRepository identities,
            PostgresAdvisoryLocks locks, ObjectMapper json) {
        this.series = Objects.requireNonNull(series);
        this.workings = Objects.requireNonNull(workings);
        this.transitions = Objects.requireNonNull(transitions);
        this.commands = Objects.requireNonNull(commands);
        this.identities = Objects.requireNonNull(identities);
        this.locks = Objects.requireNonNull(locks);
        this.json = Objects.requireNonNull(json);
    }

    @Override
    public Optional<SeriesSnapshot> findByScope(Scope scope) {
        try {
            return readSeries(scope, false);
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment series is unavailable", failure);
        }
    }

    @Override
    public Optional<Scope> findScopeByAssessment(
            UUID organizationId, UUID assessmentVersionId) {
        try {
            return series.scopeByAssessment(organizationId, assessmentVersionId).stream()
                    .map(row -> new Scope(row.organizationId(), row.jobPositionId())).findFirst();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment scope is unavailable", failure);
        }
    }

    @Override
    public Optional<Scope> findScopeByWorkingRevision(
            UUID organizationId, UUID workingRevisionId) {
        try {
            return workings.scope(organizationId, workingRevisionId).stream()
                    .map(row -> new Scope(row.organizationId(), row.jobPositionId())).findFirst();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline working revision scope is unavailable", failure);
        }
    }

    @Override
    public List<BlueprintVersionRecord> findBlueprintVersions(Scope scope) {
        try {
            return series.blueprintVersions(scope.organizationId(), scope.jobPositionId()).stream()
                    .map(row -> new BlueprintVersionRecord(row.blueprintId(), intValue(row.version()), row.name(),
                            row.createdAt()))
                    .toList();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline blueprint versions are unavailable", failure);
        }
    }

    @Override
    public List<AssessmentVersionRecord> findAssessmentVersions(Scope scope) {
        try {
            return series.assessmentVersions(scope.organizationId(), scope.jobPositionId()).stream()
                    .map(row -> new AssessmentVersionRecord(row.assessmentVersionId(), intValue(row.version()),
                            intValue(row.blueprintVersion()), row.publicationState(), row.candidateState(),
                            Boolean.TRUE.equals(row.disabled()), row.contentHash(), row.createdAt()))
                    .toList();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment versions are unavailable", failure);
        }
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public SeriesSnapshot lockOrCreate(Scope scope, UUID blueprintId) {
        try {
            series.ensure(scope.organizationId(), scope.jobPositionId(), blueprintId);
            SeriesSnapshot locked = readSeries(scope, true)
                    .orElseThrow(() -> new WriteConflict(
                            "Blueprint does not belong to the requested organization and JobPosition", null));
            if (!locked.blueprintId().equals(blueprintId)) {
                throw new WriteConflict(
                        "The organization and JobPosition already use another blueprint identity", null);
            }
            return locked;
        } catch (DataAccessException failure) {
            if (PostgresErrors.isUniqueViolation(failure)) {
                throw new WriteConflict("Baseline assessment series creation conflicted", failure);
            }
            throw unavailable("Baseline assessment series could not be locked", failure);
        }
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public SeriesSnapshot createAndLock(
            Scope scope, UUID blueprintId, UUID actorId, Instant createdAt) {
        try {
            lockScope(scope);
            identities.ensureFixed(blueprintId, scope.organizationId(), scope.jobPositionId(), actorId, createdAt);
            return lockOrCreate(scope, blueprintId);
        } catch (DataAccessException failure) {
            if (PostgresErrors.isUniqueViolation(failure)) {
                throw new WriteConflict(
                        "The organization and JobPosition already have a blueprint identity", failure);
            }
            throw unavailable("Baseline assessment series could not be created", failure);
        }
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public SeriesSnapshot update(Update update) {
        try {
            SeriesSnapshot locked = readSeries(update.scope(), true)
                    .orElseThrow(() -> new WriteConflict("Baseline assessment series was not found", null));
            if (locked.seriesRevision() != update.expectedSeriesRevision()) {
                throw new WriteConflict("Baseline assessment series revision is stale", null);
            }
            long nextRevision = Math.addExact(update.expectedSeriesRevision(), 1);
            int changed = series.compareAndSet(update.scope().organizationId(), update.scope().jobPositionId(),
                    update.expectedSeriesRevision(), nextRevision, update.workingRevisionId(),
                    update.pendingBlueprint() == null ? null : update.pendingBlueprint().version(),
                    openAssessmentVersionId(update.openCandidate()), activeAssessmentVersionId(update.activeRelease()),
                    update.occurredAt());
            if (changed != 1) {
                throw new WriteConflict("Baseline assessment series revision is stale", null);
            }
            insertTransition(locked, update, nextRevision);
            return readSeries(update.scope(), false)
                    .orElseThrow(() -> new IllegalStateException(
                            "Updated baseline assessment series could not be reloaded"));
        } catch (DataAccessException failure) {
            if (PostgresErrors.isUniqueViolation(failure)) {
                throw new WriteConflict("Baseline lifecycle cardinality conflicted", failure);
            }
            throw unavailable("Baseline assessment transition could not be stored", failure);
        }
    }

    @Override
    public Optional<WorkingRevisionRecord> findWorkingRevision(
            Scope scope, UUID workingRevisionId) {
        try {
            return workings.find(scope.organizationId(), scope.jobPositionId(), workingRevisionId).stream()
                    .map(this::mapWorkingRevision).findFirst();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline blueprint working revision is unavailable", failure);
        }
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public WorkingRevisionRecord insertWorkingRevision(NewWorkingRevision revision) {
        try {
            SeriesSnapshot locked = lockRequiredSeries(revision.scope());
            if (locked.pendingStage() != PendingStage.NONE) {
                throw new WriteConflict("A pending baseline change already exists", null);
            }
            workings.insert(new BaselineBlueprintWorkingRevisionEntity(revision.workingRevisionId(),
                    revision.scope().organizationId(), revision.scope().jobPositionId(), revision.blueprintId(),
                    revision.baseVersion(), 1L, revision.name(), revision.jobPositionNameSnapshot(),
                    writeRoles(revision.roles()), "OPEN", revision.actorId(), revision.occurredAt(), revision.actorId(),
                    revision.occurredAt(), null));
            return requireWorkingRevision(revision.scope(), revision.workingRevisionId());
        } catch (DataAccessException failure) {
            if (PostgresErrors.isUniqueViolation(failure)) {
                throw new WriteConflict("An open baseline blueprint working revision already exists", failure);
            }
            throw unavailable("Baseline blueprint working revision could not be created", failure);
        }
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public WorkingRevisionRecord saveWorkingRevision(SaveWorkingRevision revision) {
        try {
            SeriesSnapshot locked = lockRequiredSeries(revision.scope());
            if (!revision.workingRevisionId().equals(locked.workingRevisionId())) {
                throw new WriteConflict(
                        "Working revision is not the series pending change", null);
            }
            int changed = workings.save(revision.scope().organizationId(), revision.scope().jobPositionId(),
                    revision.workingRevisionId(), revision.expectedRevision(), revision.name(),
                    revision.jobPositionNameSnapshot(), writeRoles(revision.roles()), revision.actorId(),
                    revision.occurredAt());
            if (changed != 1) {
                throw new WriteConflict("Baseline blueprint working revision is stale or closed", null);
            }
            return requireWorkingRevision(revision.scope(), revision.workingRevisionId());
        } catch (DataAccessException failure) {
            throw unavailable("Baseline blueprint working revision could not be saved", failure);
        }
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public void closeWorkingRevision(CloseWorkingRevision revision) {
        try {
            SeriesSnapshot locked = lockRequiredSeries(revision.scope());
            if (locked.workingRevisionId() != null) {
                throw new WriteConflict(
                        "Clear the series working pointer before closing its revision", null);
            }
            int changed = workings.close(revision.scope().organizationId(), revision.scope().jobPositionId(),
                    revision.workingRevisionId(), revision.expectedRevision(), revision.state().name(),
                    revision.actorId(), revision.occurredAt());
            if (changed != 1) {
                throw new WriteConflict("Baseline blueprint working revision is stale or closed", null);
            }
        } catch (DataAccessException failure) {
            throw unavailable("Baseline blueprint working revision could not be closed", failure);
        }
    }

    @Override
    public Optional<CommandReceipt> findCommand(UUID actorId, String idempotencyKey) {
        try {
            return commands.receipt(actorId, idempotencyKey).stream()
                    .map(row -> new CommandReceipt(new Scope(row.organizationId(), row.jobPositionId()), row.actorId(),
                            row.idempotencyKey(), row.operation(), row.requestHash(), row.responseJson(), row.createdAt()))
                    .findFirst();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline management command receipt is unavailable", failure);
        }
    }

    @Override
    public void insertCommand(CommandReceipt receipt) {
        try {
            commands.insert(new BaselineManagementCommandEntity(receipt.actorId(), receipt.idempotencyKey(),
                    receipt.scope().organizationId(), receipt.scope().jobPositionId(), receipt.operation(),
                    receipt.requestHash(), receipt.responseJson(), receipt.createdAt()));
        } catch (DataAccessException failure) {
            if (PostgresErrors.isUniqueViolation(failure)) {
                throw new WriteConflict("Idempotency key already exists", failure);
            }
            throw unavailable("Baseline management command receipt could not be stored", failure);
        }
    }

    /** Former {@code pg_advisory_xact_lock(hashtextextended(organization_id::text || ':' || job_position_id, 0))}. */
    private void lockScope(Scope scope) {
        try {
            locks.lock(scope.organizationId() + ":" + scope.jobPositionId());
        } catch (RuntimeException failure) {
            DataAccessException translated = EntityManagerFactoryUtils.convertJpaAccessExceptionIfPossible(failure);
            throw translated == null ? failure : translated;
        }
    }

    /** Locked reads take the series row lock first, then read the snapshot projection (never a cached entity). */
    private Optional<SeriesSnapshot> readSeries(Scope scope, boolean lock) {
        if (lock && series.lock(scope.organizationId(), scope.jobPositionId()).isEmpty()) {
            return Optional.empty();
        }
        return series.snapshot(scope.organizationId(), scope.jobPositionId()).stream().map(this::mapSeries).findFirst();
    }

    private SeriesSnapshot lockRequiredSeries(Scope scope) {
        return readSeries(scope, true)
                .orElseThrow(() -> new WriteConflict("Baseline assessment series was not found", null));
    }

    private SeriesSnapshot mapSeries(BaselineAssessmentSeriesJpaRepository.SnapshotRow row) {
        Scope scope = new Scope(row.organizationId(), row.jobPositionId());
        UUID blueprintId = row.blueprintId();
        Integer pendingVersion = row.pendingBlueprintVersion();
        BlueprintVersionRef pending = pendingVersion == null
                ? null : new BlueprintVersionRef(blueprintId, pendingVersion);

        UUID candidateId = row.candidateId();
        OpenCandidate candidate = candidateId == null ? null : new OpenCandidate(
                new AssessmentVersionRef(
                        candidateId,
                        intValue(row.candidateVersion()),
                        new BlueprintVersionRef(blueprintId, intValue(row.candidateBlueprintVersion()))),
                row.candidateReviewedContentHash() == null
                        ? CandidateState.DRAFT : CandidateState.REVIEWED,
                longValue(row.candidateDraftRevision()),
                row.candidateContentHash());

        UUID activeId = row.activeId();
        ActiveRelease active = activeId == null ? null : new ActiveRelease(
                new AssessmentVersionRef(
                        activeId,
                        intValue(row.activeVersion()),
                        new BlueprintVersionRef(blueprintId, intValue(row.activeBlueprintVersion()))));
        return new SeriesSnapshot(
                scope, blueprintId, longValue(row.seriesRevision()),
                row.workingRevisionId(), pending, candidate, active);
    }

    private WorkingRevisionRecord mapWorkingRevision(BaselineBlueprintWorkingRevisionJpaRepository.Row row) {
        try {
            return new WorkingRevisionRecord(
                    row.workingRevisionId(),
                    new Scope(row.organizationId(), row.jobPositionId()),
                    row.blueprintId(),
                    row.baseVersion(),
                    longValue(row.revision()), row.name(),
                    row.jobPositionNameSnapshot(),
                    Arrays.asList(json.readValue(row.roles(), RoleConfig[].class)),
                    WorkingRevisionState.valueOf(row.state()),
                    row.createdAt(),
                    row.updatedAt());
        } catch (JsonProcessingException invalidJson) {
            throw new DataRetrievalFailureException("Stored baseline working revision roles are invalid", invalidJson);
        }
    }

    private WorkingRevisionRecord requireWorkingRevision(Scope scope, UUID workingRevisionId) {
        return findWorkingRevision(scope, workingRevisionId)
                .orElseThrow(() -> new IllegalStateException(
                        "Stored baseline working revision could not be reloaded"));
    }

    private void insertTransition(
            SeriesSnapshot previous, Update update, long nextRevision) {
        transitions.insert(new BaselineAssessmentTransitionEntity(UUID.randomUUID(), update.scope().organizationId(),
                update.scope().jobPositionId(), nextRevision, update.transition().name(), update.actorId(),
                update.occurredAt(), update.reason(),
                previous.workingRevisionId(),
                previous.pendingBlueprint() == null ? null : previous.pendingBlueprint().blueprintId(),
                previous.pendingBlueprint() == null ? null : previous.pendingBlueprint().version(),
                openAssessmentVersionId(previous.openCandidate()),
                activeAssessmentVersionId(previous.activeRelease()),
                update.workingRevisionId(),
                update.pendingBlueprint() == null ? null : update.pendingBlueprint().blueprintId(),
                update.pendingBlueprint() == null ? null : update.pendingBlueprint().version(),
                openAssessmentVersionId(update.openCandidate()),
                activeAssessmentVersionId(update.activeRelease())));
    }

    private static UUID openAssessmentVersionId(OpenCandidate candidate) {
        return candidate == null ? null : candidate.assessment().assessmentVersionId();
    }

    private static UUID activeAssessmentVersionId(ActiveRelease release) {
        return release == null ? null : release.assessment().assessmentVersionId();
    }

    private String writeRoles(List<RoleConfig> roles) {
        try {
            return json.writeValueAsString(roles);
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("Baseline working revision roles are not serializable", failure);
        }
    }

    private static int intValue(Integer value) {
        return value == null ? 0 : value;
    }

    private static long longValue(Long value) {
        return value == null ? 0L : value;
    }

    private static DependencyUnavailable unavailable(String message, Throwable cause) {
        return new DependencyUnavailable(message, cause);
    }
}
