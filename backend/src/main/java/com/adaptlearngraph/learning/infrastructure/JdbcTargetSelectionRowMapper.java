package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.RequestStatus;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.StoredSelectionRequest;
import com.adaptlearngraph.learning.domain.TargetRoleSelection;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot.CareerTrack;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot.Seniority;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;

/** Maps the persisted F02 selection snapshot without consulting the mutable catalog. */
final class JdbcTargetSelectionRowMapper implements RowMapper<TargetRoleSelection> {
    private final ObjectMapper objectMapper;

    JdbcTargetSelectionRowMapper(ObjectMapper objectMapper) {
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
    }

    @Override
    public TargetRoleSelection mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
        OffsetDateTime endedAt = resultSet.getObject("ended_at", OffsetDateTime.class);
        return new TargetRoleSelection(
                resultSet.getObject("selection_id", UUID.class),
                resultSet.getObject("learner_id", UUID.class),
                resultSet.getObject("role_ref_id", UUID.class),
                readSnapshot(resultSet.getString("role_snapshot")),
                resultSet.getObject("selected_at", OffsetDateTime.class).toInstant(),
                endedAt == null ? null : endedAt.toInstant(),
                resultSet.getLong("target_revision"));
    }

    StoredSelectionRequest mapRequest(ResultSet resultSet, int rowNumber) throws SQLException {
        return new StoredSelectionRequest(
                resultSet.getObject("request_id", UUID.class),
                resultSet.getString("request_hash"),
                RequestStatus.valueOf(resultSet.getString("status")),
                resultSet.getObject("result_selection_id", UUID.class),
                resultSet.getObject("result_target_revision", Long.class),
                resultSet.getObject("result_changed", Boolean.class),
                resultSet.getString("outcome_code"));
    }

    private TargetRoleSnapshot readSnapshot(String json) throws SQLException {
        if (json == null) {
            throw invalidSnapshot("role_snapshot is missing", null);
        }
        try {
            JsonNode snapshot = objectMapper.readTree(json);
            if (!snapshot.isObject()) {
                throw invalidSnapshot("role_snapshot must be a JSON object", null);
            }
            return new TargetRoleSnapshot(
                    UUID.fromString(requiredText(snapshot, "id")),
                    requiredText(snapshot, "code"),
                    requiredText(snapshot, "name"),
                    CareerTrack.valueOf(requiredText(snapshot, "track")),
                    Seniority.valueOf(requiredText(snapshot, "seniority")));
        } catch (JsonProcessingException | IllegalArgumentException invalid) {
            throw invalidSnapshot("role_snapshot does not match the F02 snapshot contract", invalid);
        }
    }

    private static String requiredText(JsonNode object, String field) {
        JsonNode value = object.get(field);
        if (value == null || !value.isTextual() || value.textValue().isBlank()) {
            throw new IllegalArgumentException(field + " must be non-blank text");
        }
        return value.textValue();
    }

    private static SQLException invalidSnapshot(String message, Throwable cause) {
        return new SQLException(message, "22000", cause);
    }
}
