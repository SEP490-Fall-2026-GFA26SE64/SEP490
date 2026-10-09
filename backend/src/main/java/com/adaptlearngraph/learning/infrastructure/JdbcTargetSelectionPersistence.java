package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.LearnerTargetState;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.PendingSelectionRequest;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.StoredSelectionRequest;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort;
import com.adaptlearngraph.learning.domain.TargetRoleSelection;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** JDBC store for the PostgreSQL-owned target-selection transaction. */
public final class JdbcTargetSelectionPersistence implements TargetSelectionStorePort {
    private static final String OPERATION = "SELECT_TARGET_ROLE";

    private static final String LOCK_LEARNER = """
            SELECT learner_id, target_revision
            FROM platform.learner_state
            WHERE learner_id = :learnerId
            FOR UPDATE
            """;

    private static final String FIND_ACTIVE_SELECTION = """
            SELECT selection.selection_id,
                   selection.learner_id,
                   selection.role_ref_id,
                   selection.role_snapshot::text AS role_snapshot,
                   selection.selected_at,
                   selection.ended_at,
                   learner.target_revision
            FROM platform.target_selection selection
            JOIN platform.learner_state learner
              ON learner.learner_id = selection.learner_id
            WHERE selection.learner_id = :learnerId
              AND selection.ended_at IS NULL
            """;

    private static final String FIND_HISTORICAL_SELECTION = """
            SELECT selection.selection_id,
                   selection.learner_id,
                   selection.role_ref_id,
                   selection.role_snapshot::text AS role_snapshot,
                   selection.selected_at,
                   selection.ended_at,
                   request.result_target_revision AS target_revision
            FROM platform.target_selection selection
            JOIN platform.target_selection_request request
              ON request.actor_id = selection.learner_id
             AND request.operation = :operation
             AND request.status = 'SUCCEEDED'
             AND request.result_selection_id = selection.selection_id
             AND request.result_target_revision = :targetRevision
            WHERE selection.learner_id = :learnerId
              AND selection.selection_id = :selectionId
            LIMIT 1
            """;

    private static final String FIND_REQUEST = """
            SELECT request_id,
                   request_hash,
                   status,
                   result_selection_id,
                   result_target_revision,
                   result_changed,
                   outcome_code
            FROM platform.target_selection_request
            WHERE actor_id = :actorId
              AND operation = :operation
              AND idempotency_key = :idempotencyKey
            """;

    private static final String CLAIM_REQUEST = """
            INSERT INTO platform.target_selection_request (
                request_id,
                actor_id,
                operation,
                idempotency_key,
                request_hash,
                status,
                created_at)
            VALUES (
                :requestId,
                :actorId,
                :operation,
                :idempotencyKey,
                :requestHash,
                'PENDING',
                :createdAt)
            ON CONFLICT (actor_id, operation, idempotency_key) DO NOTHING
            """;

    private static final String END_SELECTION = """
            UPDATE platform.target_selection
            SET ended_at = :endedAt
            WHERE learner_id = :learnerId
              AND selection_id = :selectionId
              AND ended_at IS NULL
            """;

    private static final String INSERT_SELECTION = """
            INSERT INTO platform.target_selection (
                selection_id,
                learner_id,
                role_ref_id,
                role_kind,
                selected_at,
                ended_at,
                role_snapshot)
            VALUES (
                :selectionId,
                :learnerId,
                :roleReferenceId,
                'TARGET_ROLE',
                :selectedAt,
                :endedAt,
                CAST(:roleSnapshot AS jsonb))
            """;

    private static final String UPDATE_TARGET_REVISION = """
            UPDATE platform.learner_state
            SET target_revision = :newRevision
            WHERE learner_id = :learnerId
              AND target_revision = :expectedRevision
            """;

    private static final String COMPLETE_REQUEST = """
            UPDATE platform.target_selection_request
            SET status = 'SUCCEEDED',
                result_selection_id = :selectionId,
                result_target_revision = :targetRevision,
                result_changed = :changed,
                outcome_code = NULL,
                completed_at = :completedAt
            WHERE request_id = :requestId
              AND operation = :operation
              AND status = 'PENDING'
            """;

    private static final String REJECT_REQUEST = """
            UPDATE platform.target_selection_request
            SET status = 'REJECTED',
                result_selection_id = NULL,
                result_target_revision = NULL,
                result_changed = NULL,
                outcome_code = :outcomeCode,
                completed_at = :completedAt
            WHERE request_id = :requestId
              AND operation = :operation
              AND status = 'PENDING'
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final JdbcTargetSelectionRowMapper rowMapper;
    private final ObjectMapper objectMapper;

    JdbcTargetSelectionPersistence(
            NamedParameterJdbcTemplate jdbc,
            JdbcTargetSelectionRowMapper rowMapper,
            ObjectMapper objectMapper) {
        this.jdbc = Objects.requireNonNull(jdbc, "jdbc must not be null");
        this.rowMapper = Objects.requireNonNull(rowMapper, "rowMapper must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
    }

    @Override
    public LearnerTargetState lockLearner(UUID learnerId) {
        requireIdentity(learnerId, "learnerId");
        return jdbc.queryForObject(
                LOCK_LEARNER,
                Map.of("learnerId", learnerId),
                (resultSet, rowNumber) -> new LearnerTargetState(
                        resultSet.getObject("learner_id", UUID.class),
                        resultSet.getLong("target_revision")));
    }

    @Override
    public Optional<TargetRoleSelection> findActiveSelection(UUID learnerId) {
        requireIdentity(learnerId, "learnerId");
        return single(jdbc.query(
                FIND_ACTIVE_SELECTION,
                Map.of("learnerId", learnerId),
                rowMapper));
    }

    @Override
    public Optional<TargetRoleSelection> findSelection(
            UUID learnerId,
            UUID selectionId,
            long targetRevision) {
        requireIdentity(learnerId, "learnerId");
        requireIdentity(selectionId, "selectionId");
        if (targetRevision < 1) {
            throw new IllegalArgumentException("targetRevision must be positive");
        }
        return single(jdbc.query(
                FIND_HISTORICAL_SELECTION,
                Map.of(
                        "learnerId", learnerId,
                        "selectionId", selectionId,
                        "targetRevision", targetRevision,
                        "operation", OPERATION),
                rowMapper));
    }

    @Override
    public Optional<StoredSelectionRequest> findRequest(UUID actorId, String idempotencyKey) {
        requireIdentity(actorId, "actorId");
        requireText(idempotencyKey, "idempotencyKey");
        return single(jdbc.query(
                FIND_REQUEST,
                Map.of(
                        "actorId", actorId,
                        "operation", OPERATION,
                        "idempotencyKey", idempotencyKey),
                rowMapper::mapRequest));
    }

    @Override
    public boolean claimRequest(PendingSelectionRequest request) {
        Objects.requireNonNull(request, "request must not be null");
        int inserted = jdbc.update(
                CLAIM_REQUEST,
                Map.of(
                        "requestId", request.requestId(),
                        "actorId", request.actorId(),
                        "operation", OPERATION,
                        "idempotencyKey", request.idempotencyKey(),
                        "requestHash", request.requestHash(),
                        "createdAt", databaseTime(request.createdAt())));
        return inserted == 1;
    }

    @Override
    public void endSelection(UUID learnerId, UUID selectionId, Instant endedAt) {
        requireIdentity(learnerId, "learnerId");
        requireIdentity(selectionId, "selectionId");
        Objects.requireNonNull(endedAt, "endedAt must not be null");
        requireOne("end active target selection", jdbc.update(
                END_SELECTION,
                Map.of(
                        "learnerId", learnerId,
                        "selectionId", selectionId,
                        "endedAt", databaseTime(endedAt))));
    }

    @Override
    public void insertSelection(TargetRoleSelection selection) {
        Objects.requireNonNull(selection, "selection must not be null");
        requireOne("insert target selection", jdbc.update(
                INSERT_SELECTION,
                new MapSqlParameterSource()
                        .addValue("selectionId", selection.selectionId())
                        .addValue("learnerId", selection.learnerId())
                        .addValue("roleReferenceId", selection.catalogReferenceId())
                        .addValue("selectedAt", databaseTime(selection.selectedAt()))
                        .addValue("endedAt", selection.endedAt() == null
                                ? null
                                : databaseTime(selection.endedAt()))
                        .addValue("roleSnapshot", writeSnapshot(selection))));
    }

    @Override
    public void updateTargetRevision(UUID learnerId, long expectedRevision, long newRevision) {
        requireIdentity(learnerId, "learnerId");
        if (expectedRevision < 0 || newRevision < 1 || newRevision != expectedRevision + 1) {
            throw new IllegalArgumentException("target revision must increment exactly once");
        }
        requireOne("increment target revision", jdbc.update(
                UPDATE_TARGET_REVISION,
                Map.of(
                        "learnerId", learnerId,
                        "expectedRevision", expectedRevision,
                        "newRevision", newRevision)));
    }

    @Override
    public void completeRequest(
            UUID requestId,
            UUID selectionId,
            long targetRevision,
            boolean changed,
            Instant completedAt) {
        requireIdentity(requestId, "requestId");
        requireIdentity(selectionId, "selectionId");
        if (targetRevision < 1) {
            throw new IllegalArgumentException("targetRevision must be positive");
        }
        Objects.requireNonNull(completedAt, "completedAt must not be null");
        requireOne("complete target selection request", jdbc.update(
                COMPLETE_REQUEST,
                Map.of(
                        "requestId", requestId,
                        "operation", OPERATION,
                        "selectionId", selectionId,
                        "targetRevision", targetRevision,
                        "changed", changed,
                        "completedAt", databaseTime(completedAt))));
    }

    @Override
    public void rejectRequest(UUID requestId, String outcomeCode, Instant completedAt) {
        requireIdentity(requestId, "requestId");
        requireText(outcomeCode, "outcomeCode");
        Objects.requireNonNull(completedAt, "completedAt must not be null");
        requireOne("reject target selection request", jdbc.update(
                REJECT_REQUEST,
                Map.of(
                        "requestId", requestId,
                        "operation", OPERATION,
                        "outcomeCode", outcomeCode,
                        "completedAt", databaseTime(completedAt))));
    }

    private String writeSnapshot(TargetRoleSelection selection) {
        try {
            return objectMapper.writeValueAsString(selection.roleSnapshot());
        } catch (JsonProcessingException invalidSnapshot) {
            throw new IllegalStateException("Target role snapshot could not be serialized", invalidSnapshot);
        }
    }

    private static void requireOne(String operation, int affectedRows) {
        if (affectedRows != 1) {
            throw new IllegalStateException(operation + " affected " + affectedRows + " rows instead of one");
        }
    }

    private static OffsetDateTime databaseTime(Instant value) {
        return OffsetDateTime.ofInstant(value, ZoneOffset.UTC);
    }

    private static <T> Optional<T> single(List<T> rows) {
        if (rows.size() > 1) {
            throw new IllegalStateException("Persistence invariant returned more than one row");
        }
        return rows.stream().findFirst();
    }

    private static UUID requireIdentity(UUID value, String field) {
        Objects.requireNonNull(value, field + " must not be null");
        if (value.equals(new UUID(0L, 0L))) {
            throw new IllegalArgumentException(field + " must not be the nil UUID");
        }
        return value;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }
}
