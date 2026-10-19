package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.ActiveRelease;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.AssessmentVersionRef;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.BlueprintVersionRef;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.CandidateState;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.OpenCandidate;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.PendingStage;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.Scope;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentSeries.SeriesSnapshot;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** JDBC lifecycle store. Every mutation locks series before child rows. */
public class JdbcBaselineAssessmentManagementStore
        implements BaselineAssessmentManagementStore {
    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper json;

    public JdbcBaselineAssessmentManagementStore(
            NamedParameterJdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
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
            List<Scope> rows = jdbc.query("""
                    SELECT series.organization_id, series.occupation_id
                    FROM platform.assessment_version assessment
                    JOIN platform.baseline_assessment_series series
                      ON series.blueprint_id = assessment.blueprint_id
                    WHERE series.organization_id = :organizationId
                      AND assessment.assessment_version_id = :assessmentVersionId
                      AND assessment.purpose = 'BASELINE'
                    """, Map.of("organizationId", organizationId,
                            "assessmentVersionId", assessmentVersionId),
                    (result, row) -> new Scope(
                            result.getObject("organization_id", UUID.class),
                            result.getString("occupation_id")));
            return rows.stream().findFirst();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment scope is unavailable", failure);
        }
    }

    @Override
    public Optional<Scope> findScopeByWorkingRevision(
            UUID organizationId, UUID workingRevisionId) {
        try {
            List<Scope> rows = jdbc.query("""
                    SELECT organization_id, occupation_id
                    FROM platform.baseline_blueprint_working_revision
                    WHERE organization_id = :organizationId
                      AND working_revision_id = :workingRevisionId
                    """, Map.of("organizationId", organizationId,
                            "workingRevisionId", workingRevisionId),
                    (result, row) -> new Scope(
                            result.getObject("organization_id", UUID.class),
                            result.getString("occupation_id")));
            return rows.stream().findFirst();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline working revision scope is unavailable", failure);
        }
    }

    @Override
    public List<BlueprintVersionRecord> findBlueprintVersions(Scope scope) {
        try {
            return jdbc.query("""
                    SELECT version.blueprint_id, version.version, version.name, version.created_at
                    FROM platform.baseline_blueprint_version version
                    JOIN platform.baseline_assessment_series series USING (blueprint_id)
                    WHERE series.organization_id = :organizationId
                      AND series.occupation_id = :occupationId
                    ORDER BY version.version DESC
                    """, scopeKey(scope), (result, row) -> new BlueprintVersionRecord(
                    result.getObject("blueprint_id", UUID.class), result.getInt("version"),
                    result.getString("name"),
                    result.getObject("created_at", java.time.OffsetDateTime.class).toInstant()));
        } catch (DataAccessException failure) {
            throw unavailable("Baseline blueprint versions are unavailable", failure);
        }
    }

    @Override
    public List<AssessmentVersionRecord> findAssessmentVersions(Scope scope) {
        try {
            return jdbc.query("""
                    SELECT assessment.assessment_version_id, assessment.version,
                           assessment.blueprint_version, assessment.publication_state,
                           assessment.baseline_candidate_state, assessment.content_hash,
                           assessment.created_at,
                           EXISTS (
                               SELECT 1
                               FROM platform.baseline_assessment_transition transition
                               WHERE transition.organization_id = :organizationId
                                 AND transition.occupation_id = :occupationId
                                 AND transition.transition = 'ACTIVE_ASSESSMENT_DISABLED'
                                 AND transition.previous_active_assessment_version_id = assessment.assessment_version_id
                           ) AS disabled
                    FROM platform.assessment_version assessment
                    JOIN platform.baseline_assessment_series series
                      ON series.blueprint_id = assessment.blueprint_id
                    WHERE series.organization_id = :organizationId
                      AND series.occupation_id = :occupationId
                      AND assessment.purpose = 'BASELINE'
                    ORDER BY assessment.version DESC
                    """, scopeKey(scope), (result, row) -> new AssessmentVersionRecord(
                    result.getObject("assessment_version_id", UUID.class),
                    result.getInt("version"), result.getInt("blueprint_version"),
                    result.getString("publication_state"),
                    result.getString("baseline_candidate_state"),
                    result.getBoolean("disabled"),
                    result.getString("content_hash"),
                    result.getObject("created_at", java.time.OffsetDateTime.class).toInstant()));
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment versions are unavailable", failure);
        }
    }

    @Override
    @Transactional
    public SeriesSnapshot lockOrCreate(Scope scope, UUID blueprintId) {
        try {
            jdbc.update("""
                    INSERT INTO platform.baseline_assessment_series (
                        organization_id, occupation_id, blueprint_id)
                    SELECT identity.organization_id, identity.occupation_id, identity.blueprint_id
                    FROM platform.baseline_blueprint identity
                    WHERE identity.blueprint_id = :blueprintId
                      AND identity.organization_id = :organizationId
                      AND identity.occupation_id = :occupationId
                    ON CONFLICT (organization_id, occupation_id) DO NOTHING
                    """, scopeKey(scope).addValue("blueprintId", blueprintId));
            SeriesSnapshot locked = readSeries(scope, true)
                    .orElseThrow(() -> new WriteConflict(
                            "Blueprint does not belong to the requested organization and Occupation", null));
            if (!locked.blueprintId().equals(blueprintId)) {
                throw new WriteConflict(
                        "The organization and Occupation already use another blueprint identity", null);
            }
            return locked;
        } catch (DuplicateKeyException conflict) {
            throw new WriteConflict("Baseline assessment series creation conflicted", conflict);
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment series could not be locked", failure);
        }
    }

    @Override
    @Transactional
    public SeriesSnapshot createAndLock(
            Scope scope, UUID blueprintId, UUID actorId, Instant createdAt) {
        try {
            jdbc.query("""
                    SELECT pg_advisory_xact_lock(hashtextextended(
                        CAST(:organizationId AS text) || ':' || :occupationId, 0))
                    """, scopeKey(scope), (result, row) -> Boolean.TRUE);
            jdbc.update("""
                    INSERT INTO platform.baseline_blueprint (
                        blueprint_id, organization_id, occupation_id, created_by, created_at)
                    SELECT :blueprintId, account.organization_id, :occupationId,
                           account.account_id, :createdAt
                    FROM platform.account account
                    WHERE account.account_id = :actorId
                      AND account.organization_id = :organizationId
                    ON CONFLICT (blueprint_id) DO NOTHING
                    """, scopeKey(scope)
                    .addValue("blueprintId", blueprintId)
                    .addValue("actorId", actorId)
                    .addValue("createdAt", timestamp(createdAt), Types.TIMESTAMP_WITH_TIMEZONE));
            return lockOrCreate(scope, blueprintId);
        } catch (DuplicateKeyException conflict) {
            throw new WriteConflict(
                    "The organization and Occupation already have a blueprint identity", conflict);
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment series could not be created", failure);
        }
    }

    @Override
    @Transactional
    public SeriesSnapshot update(Update update) {
        try {
            SeriesSnapshot locked = readSeries(update.scope(), true)
                    .orElseThrow(() -> new WriteConflict("Baseline assessment series was not found", null));
            if (locked.seriesRevision() != update.expectedSeriesRevision()) {
                throw new WriteConflict("Baseline assessment series revision is stale", null);
            }
            long nextRevision = Math.addExact(update.expectedSeriesRevision(), 1);
            int changed = jdbc.update("""
                    UPDATE platform.baseline_assessment_series
                    SET series_revision = :nextRevision,
                        working_revision_id = :workingRevisionId,
                        pending_blueprint_version = :pendingBlueprintVersion,
                        open_assessment_version_id = :openAssessmentVersionId,
                        active_assessment_version_id = :activeAssessmentVersionId,
                        updated_at = :occurredAt
                    WHERE organization_id = :organizationId
                      AND occupation_id = :occupationId
                      AND series_revision = :expectedRevision
                    """, updateParameters(update, nextRevision));
            if (changed != 1) {
                throw new WriteConflict("Baseline assessment series revision is stale", null);
            }
            insertTransition(locked, update, nextRevision);
            return readSeries(update.scope(), false)
                    .orElseThrow(() -> new IllegalStateException(
                            "Updated baseline assessment series could not be reloaded"));
        } catch (DuplicateKeyException conflict) {
            throw new WriteConflict("Baseline lifecycle cardinality conflicted", conflict);
        } catch (DataAccessException failure) {
            throw unavailable("Baseline assessment transition could not be stored", failure);
        }
    }

    @Override
    public Optional<WorkingRevisionRecord> findWorkingRevision(
            Scope scope, UUID workingRevisionId) {
        try {
            List<WorkingRevisionRecord> rows = jdbc.query("""
                    SELECT working_revision_id, organization_id, occupation_id, blueprint_id,
                           base_version, revision, name, occupation_name_snapshot,
                           roles::text AS roles_json, state, created_at, updated_at
                    FROM platform.baseline_blueprint_working_revision
                    WHERE organization_id = :organizationId
                      AND occupation_id = :occupationId
                      AND working_revision_id = :workingRevisionId
                    """, scopeKey(scope).addValue("workingRevisionId", workingRevisionId),
                    this::mapWorkingRevision);
            return rows.stream().findFirst();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline blueprint working revision is unavailable", failure);
        }
    }

    @Override
    @Transactional
    public WorkingRevisionRecord insertWorkingRevision(NewWorkingRevision revision) {
        try {
            SeriesSnapshot series = lockRequiredSeries(revision.scope());
            if (series.pendingStage() != PendingStage.NONE) {
                throw new WriteConflict("A pending baseline change already exists", null);
            }
            jdbc.update("""
                    INSERT INTO platform.baseline_blueprint_working_revision (
                        working_revision_id, organization_id, occupation_id, blueprint_id,
                        base_version, revision, name, occupation_name_snapshot, roles,
                        state, created_by, created_at, updated_by, updated_at)
                    VALUES (:workingRevisionId, :organizationId, :occupationId, :blueprintId,
                        :baseVersion, 1, :name, :occupationName, CAST(:roles AS jsonb),
                        'OPEN', :actorId, :occurredAt, :actorId, :occurredAt)
                    """, new MapSqlParameterSource()
                    .addValue("workingRevisionId", revision.workingRevisionId())
                    .addValue("organizationId", revision.scope().organizationId())
                    .addValue("occupationId", revision.scope().occupationId())
                    .addValue("blueprintId", revision.blueprintId())
                    .addValue("baseVersion", revision.baseVersion(), Types.INTEGER)
                    .addValue("name", revision.name())
                    .addValue("occupationName", revision.occupationNameSnapshot())
                    .addValue("roles", writeRoles(revision.roles()))
                    .addValue("actorId", revision.actorId())
                    .addValue("occurredAt", timestamp(revision.occurredAt()),
                            Types.TIMESTAMP_WITH_TIMEZONE));
            return requireWorkingRevision(revision.scope(), revision.workingRevisionId());
        } catch (DuplicateKeyException conflict) {
            throw new WriteConflict("An open baseline blueprint working revision already exists", conflict);
        } catch (DataAccessException failure) {
            throw unavailable("Baseline blueprint working revision could not be created", failure);
        }
    }

    @Override
    @Transactional
    public WorkingRevisionRecord saveWorkingRevision(SaveWorkingRevision revision) {
        try {
            SeriesSnapshot series = lockRequiredSeries(revision.scope());
            if (!revision.workingRevisionId().equals(series.workingRevisionId())) {
                throw new WriteConflict(
                        "Working revision is not the series pending change", null);
            }
            int changed = jdbc.update("""
                    UPDATE platform.baseline_blueprint_working_revision
                    SET revision = revision + 1,
                        name = :name,
                        occupation_name_snapshot = :occupationName,
                        roles = CAST(:roles AS jsonb),
                        updated_by = :actorId,
                        updated_at = :occurredAt
                    WHERE organization_id = :organizationId
                      AND occupation_id = :occupationId
                      AND working_revision_id = :workingRevisionId
                      AND revision = :expectedRevision
                      AND state = 'OPEN'
                    """, new MapSqlParameterSource()
                    .addValue("organizationId", revision.scope().organizationId())
                    .addValue("occupationId", revision.scope().occupationId())
                    .addValue("workingRevisionId", revision.workingRevisionId())
                    .addValue("expectedRevision", revision.expectedRevision())
                    .addValue("name", revision.name())
                    .addValue("occupationName", revision.occupationNameSnapshot())
                    .addValue("roles", writeRoles(revision.roles()))
                    .addValue("actorId", revision.actorId())
                    .addValue("occurredAt", timestamp(revision.occurredAt()),
                            Types.TIMESTAMP_WITH_TIMEZONE));
            if (changed != 1) {
                throw new WriteConflict("Baseline blueprint working revision is stale or closed", null);
            }
            return requireWorkingRevision(revision.scope(), revision.workingRevisionId());
        } catch (DataAccessException failure) {
            throw unavailable("Baseline blueprint working revision could not be saved", failure);
        }
    }

    @Override
    @Transactional
    public void closeWorkingRevision(CloseWorkingRevision revision) {
        try {
            SeriesSnapshot series = lockRequiredSeries(revision.scope());
            if (series.workingRevisionId() != null) {
                throw new WriteConflict(
                        "Clear the series working pointer before closing its revision", null);
            }
            int changed = jdbc.update("""
                    UPDATE platform.baseline_blueprint_working_revision
                    SET revision = revision + 1,
                        state = :state,
                        updated_by = :actorId,
                        updated_at = :occurredAt,
                        closed_at = :occurredAt
                    WHERE organization_id = :organizationId
                      AND occupation_id = :occupationId
                      AND working_revision_id = :workingRevisionId
                      AND revision = :expectedRevision
                      AND state = 'OPEN'
                    """, new MapSqlParameterSource()
                    .addValue("organizationId", revision.scope().organizationId())
                    .addValue("occupationId", revision.scope().occupationId())
                    .addValue("workingRevisionId", revision.workingRevisionId())
                    .addValue("expectedRevision", revision.expectedRevision())
                    .addValue("state", revision.state().name())
                    .addValue("actorId", revision.actorId())
                    .addValue("occurredAt", timestamp(revision.occurredAt()),
                            Types.TIMESTAMP_WITH_TIMEZONE));
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
            List<CommandReceipt> rows = jdbc.query("""
                    SELECT organization_id, occupation_id, actor_id, idempotency_key,
                           operation, request_hash, response_json::text AS response_json, created_at
                    FROM platform.baseline_management_command
                    WHERE actor_id = :actorId AND idempotency_key = :idempotencyKey
                    """, Map.of("actorId", actorId, "idempotencyKey", idempotencyKey),
                    (result, row) -> new CommandReceipt(
                            new Scope(result.getObject("organization_id", UUID.class),
                                    result.getString("occupation_id")),
                            result.getObject("actor_id", UUID.class),
                            result.getString("idempotency_key"), result.getString("operation"),
                            result.getString("request_hash"), result.getString("response_json"),
                            result.getObject("created_at", java.time.OffsetDateTime.class).toInstant()));
            return rows.stream().findFirst();
        } catch (DataAccessException failure) {
            throw unavailable("Baseline management command receipt is unavailable", failure);
        }
    }

    @Override
    public void insertCommand(CommandReceipt receipt) {
        try {
            jdbc.update("""
                    INSERT INTO platform.baseline_management_command (
                        actor_id, idempotency_key, organization_id, occupation_id,
                        operation, request_hash, response_json, created_at)
                    VALUES (:actorId, :idempotencyKey, :organizationId, :occupationId,
                        :operation, :requestHash, CAST(:responseJson AS jsonb), :createdAt)
                    """, new MapSqlParameterSource()
                    .addValue("actorId", receipt.actorId())
                    .addValue("idempotencyKey", receipt.idempotencyKey())
                    .addValue("organizationId", receipt.scope().organizationId())
                    .addValue("occupationId", receipt.scope().occupationId())
                    .addValue("operation", receipt.operation())
                    .addValue("requestHash", receipt.requestHash())
                    .addValue("responseJson", receipt.responseJson())
                    .addValue("createdAt", timestamp(receipt.createdAt()),
                            Types.TIMESTAMP_WITH_TIMEZONE));
        } catch (DuplicateKeyException conflict) {
            throw new WriteConflict("Idempotency key already exists", conflict);
        } catch (DataAccessException failure) {
            throw unavailable("Baseline management command receipt could not be stored", failure);
        }
    }

    private Optional<SeriesSnapshot> readSeries(Scope scope, boolean lock) {
        String suffix = lock ? " FOR UPDATE OF series" : "";
        List<SeriesSnapshot> rows = jdbc.query("""
                SELECT series.organization_id, series.occupation_id, series.blueprint_id,
                       series.series_revision, series.working_revision_id,
                       series.pending_blueprint_version,
                       candidate.assessment_version_id AS candidate_id,
                       candidate.version AS candidate_version,
                       candidate.blueprint_version AS candidate_blueprint_version,
                       candidate.draft_revision, candidate.content_hash,
                       candidate.reviewed_content_hash,
                       active.assessment_version_id AS active_id,
                       active.version AS active_version,
                       active.blueprint_version AS active_blueprint_version
                FROM platform.baseline_assessment_series series
                LEFT JOIN platform.assessment_version candidate
                  ON candidate.assessment_version_id = series.open_assessment_version_id
                LEFT JOIN platform.assessment_version active
                  ON active.assessment_version_id = series.active_assessment_version_id
                WHERE series.organization_id = :organizationId
                  AND series.occupation_id = :occupationId
                """ + suffix, scopeKey(scope), this::mapSeries);
        return rows.stream().findFirst();
    }

    private SeriesSnapshot lockRequiredSeries(Scope scope) {
        return readSeries(scope, true)
                .orElseThrow(() -> new WriteConflict("Baseline assessment series was not found", null));
    }

    private SeriesSnapshot mapSeries(ResultSet result, int row) throws SQLException {
        Scope scope = new Scope(
                result.getObject("organization_id", UUID.class), result.getString("occupation_id"));
        UUID blueprintId = result.getObject("blueprint_id", UUID.class);
        Integer pendingVersion = (Integer) result.getObject("pending_blueprint_version");
        BlueprintVersionRef pending = pendingVersion == null
                ? null : new BlueprintVersionRef(blueprintId, pendingVersion);

        UUID candidateId = result.getObject("candidate_id", UUID.class);
        OpenCandidate candidate = candidateId == null ? null : new OpenCandidate(
                new AssessmentVersionRef(
                        candidateId,
                        result.getInt("candidate_version"),
                        new BlueprintVersionRef(
                                blueprintId, result.getInt("candidate_blueprint_version"))),
                result.getString("reviewed_content_hash") == null
                        ? CandidateState.DRAFT : CandidateState.REVIEWED,
                result.getLong("draft_revision"),
                result.getString("content_hash"));

        UUID activeId = result.getObject("active_id", UUID.class);
        ActiveRelease active = activeId == null ? null : new ActiveRelease(
                new AssessmentVersionRef(
                        activeId,
                        result.getInt("active_version"),
                        new BlueprintVersionRef(
                                blueprintId, result.getInt("active_blueprint_version"))));
        return new SeriesSnapshot(
                scope, blueprintId, result.getLong("series_revision"),
                result.getObject("working_revision_id", UUID.class), pending, candidate, active);
    }

    private WorkingRevisionRecord mapWorkingRevision(ResultSet result, int row) throws SQLException {
        try {
            return new WorkingRevisionRecord(
                    result.getObject("working_revision_id", UUID.class),
                    new Scope(result.getObject("organization_id", UUID.class),
                            result.getString("occupation_id")),
                    result.getObject("blueprint_id", UUID.class),
                    (Integer) result.getObject("base_version"),
                    result.getLong("revision"), result.getString("name"),
                    result.getString("occupation_name_snapshot"),
                    Arrays.asList(json.readValue(result.getString("roles_json"), RoleConfig[].class)),
                    WorkingRevisionState.valueOf(result.getString("state")),
                    result.getObject("created_at", java.time.OffsetDateTime.class).toInstant(),
                    result.getObject("updated_at", java.time.OffsetDateTime.class).toInstant());
        } catch (JsonProcessingException invalidJson) {
            throw new SQLException("Stored baseline working revision roles are invalid", invalidJson);
        }
    }

    private WorkingRevisionRecord requireWorkingRevision(Scope scope, UUID workingRevisionId) {
        return findWorkingRevision(scope, workingRevisionId)
                .orElseThrow(() -> new IllegalStateException(
                        "Stored baseline working revision could not be reloaded"));
    }

    private void insertTransition(
            SeriesSnapshot previous, Update update, long nextRevision) {
        jdbc.update("""
                INSERT INTO platform.baseline_assessment_transition (
                    organization_id, occupation_id, series_revision, transition,
                    actor_id, occurred_at, reason,
                    previous_working_revision_id,
                    previous_pending_blueprint_id, previous_pending_blueprint_version,
                    previous_open_assessment_version_id, previous_active_assessment_version_id,
                    working_revision_id,
                    pending_blueprint_id, pending_blueprint_version,
                    open_assessment_version_id, active_assessment_version_id)
                VALUES (:organizationId, :occupationId, :nextRevision, :transition,
                    :actorId, :occurredAt, :reason,
                    :previousWorkingRevisionId,
                    :previousPendingBlueprintId, :previousPendingBlueprintVersion,
                    :previousOpenAssessmentVersionId, :previousActiveAssessmentVersionId,
                    :workingRevisionId,
                    :pendingBlueprintId, :pendingBlueprintVersion,
                    :openAssessmentVersionId, :activeAssessmentVersionId)
                """, updateParameters(update, nextRevision)
                .addValue("previousWorkingRevisionId", previous.workingRevisionId())
                .addValue("previousPendingBlueprintId", previous.pendingBlueprint() == null
                        ? null : previous.pendingBlueprint().blueprintId())
                .addValue("previousPendingBlueprintVersion", previous.pendingBlueprint() == null
                        ? null : previous.pendingBlueprint().version(), Types.INTEGER)
                .addValue("previousOpenAssessmentVersionId", previous.openCandidate() == null
                        ? null : previous.openCandidate().assessment().assessmentVersionId())
                .addValue("previousActiveAssessmentVersionId", previous.activeRelease() == null
                        ? null : previous.activeRelease().assessment().assessmentVersionId()));
    }

    private static MapSqlParameterSource updateParameters(Update update, long nextRevision) {
        return scopeKey(update.scope())
                .addValue("expectedRevision", update.expectedSeriesRevision())
                .addValue("nextRevision", nextRevision)
                .addValue("workingRevisionId", update.workingRevisionId())
                .addValue("pendingBlueprintId", update.pendingBlueprint() == null
                        ? null : update.pendingBlueprint().blueprintId())
                .addValue("pendingBlueprintVersion", update.pendingBlueprint() == null
                        ? null : update.pendingBlueprint().version(), Types.INTEGER)
                .addValue("openAssessmentVersionId", update.openCandidate() == null
                        ? null : update.openCandidate().assessment().assessmentVersionId())
                .addValue("activeAssessmentVersionId", update.activeRelease() == null
                        ? null : update.activeRelease().assessment().assessmentVersionId())
                .addValue("transition", update.transition().name())
                .addValue("actorId", update.actorId())
                .addValue("occurredAt", timestamp(update.occurredAt()), Types.TIMESTAMP_WITH_TIMEZONE)
                .addValue("reason", update.reason());
    }

    private String writeRoles(List<RoleConfig> roles) {
        try {
            return json.writeValueAsString(roles);
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("Baseline working revision roles are not serializable", failure);
        }
    }

    private static MapSqlParameterSource scopeKey(Scope scope) {
        return new MapSqlParameterSource()
                .addValue("organizationId", scope.organizationId())
                .addValue("occupationId", scope.occupationId());
    }

    private static java.time.OffsetDateTime timestamp(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC);
    }

    private static DependencyUnavailable unavailable(String message, Throwable cause) {
        return new DependencyUnavailable(message, cause);
    }
}
