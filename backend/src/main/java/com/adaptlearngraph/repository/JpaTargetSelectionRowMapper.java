package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.TargetSelectionStorePort.RequestStatus;
import com.adaptlearngraph.repository.TargetSelectionStorePort.StoredSelectionRequest;
import com.adaptlearngraph.entities.TargetRoleSelection;
import com.adaptlearngraph.entities.TargetRoleSnapshot;
import com.adaptlearngraph.entities.TargetRoleSnapshot.CareerTrack;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;

/** Maps the persisted F02 selection snapshot without consulting the mutable catalog. */
public final class JpaTargetSelectionRowMapper {
    private final ObjectMapper objectMapper;

    public JpaTargetSelectionRowMapper(ObjectMapper objectMapper) {
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
    }

    public TargetRoleSelection map(TargetSelectionJpaRepository.Row row) {
        return new TargetRoleSelection(
                row.selectionId(),
                row.learnerId(),
                row.roleRefId(),
                readSnapshot(row.roleSnapshot()),
                row.selectedAt(),
                row.endedAt(),
                row.targetRevision());
    }

    StoredSelectionRequest mapRequest(TargetSelectionRequestJpaRepository.Row row) {
        return new StoredSelectionRequest(
                row.requestId(),
                row.requestHash(),
                RequestStatus.valueOf(row.status()),
                row.resultSelectionId(),
                row.resultTargetRevision(),
                row.resultChanged(),
                row.outcomeCode());
    }

    private TargetRoleSnapshot readSnapshot(String json) {
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
                    CareerTrack.valueOf(requiredText(snapshot, "track")));
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

    /** Same exception type the former row mapper surfaced for a corrupt snapshot (a data exception, not a lookup miss). */
    private static DataIntegrityViolationException invalidSnapshot(String message, Throwable cause) {
        return new DataIntegrityViolationException(message, cause);
    }
}
