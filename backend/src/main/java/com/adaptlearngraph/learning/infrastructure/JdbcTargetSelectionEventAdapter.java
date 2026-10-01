package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.port.out.TargetSelectionEventPort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionEventPort.TargetSelectionEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Objects;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Writes the F02 audit and outbox records on the caller's PostgreSQL transaction. */
public final class JdbcTargetSelectionEventAdapter implements TargetSelectionEventPort {
    private static final String INSERT_AUDIT = """
            INSERT INTO platform.audit_event (
                audit_event_id,
                actor_id,
                action,
                resource_id,
                resource_revision,
                occurred_at,
                outcome,
                correlation_id)
            VALUES (
                :auditEventId,
                :actorId,
                :action,
                :resourceId,
                :resourceRevision,
                :occurredAt,
                'SUCCEEDED',
                :correlationId)
            """;

    private static final String INSERT_OUTBOX = """
            INSERT INTO platform.outbox_event (
                event_id,
                event_type,
                aggregate_id,
                source_revision,
                payload,
                correlation_id,
                created_at)
            VALUES (
                :eventId,
                :eventType,
                :aggregateId,
                :sourceRevision,
                CAST(:payload AS jsonb),
                :correlationId,
                :createdAt)
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    JdbcTargetSelectionEventAdapter(
            NamedParameterJdbcTemplate jdbc,
            ObjectMapper objectMapper) {
        this.jdbc = Objects.requireNonNull(jdbc, "jdbc must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
    }

    @Override
    public void record(TargetSelectionEvent event) {
        Objects.requireNonNull(event, "event must not be null");
        String eventType = switch (event.type()) {
            case SELECTED -> "TARGET_ROLE_SELECTED";
            case CHANGED -> "TARGET_ROLE_CHANGED";
        };

        requireOne("insert target selection audit", jdbc.update(
                INSERT_AUDIT,
                Map.of(
                        "auditEventId", event.auditEventId(),
                        "actorId", event.actorId(),
                        "action", eventType,
                        "resourceId", event.selectionId(),
                        "resourceRevision", Long.toString(event.targetRevision()),
                        "occurredAt", databaseTime(event.occurredAt()),
                        "correlationId", event.correlationId())));

        requireOne("insert target selection outbox event", jdbc.update(
                INSERT_OUTBOX,
                new MapSqlParameterSource()
                        .addValue("eventId", event.outboxEventId())
                        .addValue("eventType", eventType)
                        .addValue("aggregateId", event.learnerId())
                        .addValue("sourceRevision", event.targetRevision())
                        .addValue("payload", writePayload(event))
                        .addValue("correlationId", event.correlationId())
                        .addValue("createdAt", databaseTime(event.occurredAt()))));
    }

    private String writePayload(TargetSelectionEvent event) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("payloadVersion", 1);
        payload.put("organizationId", event.organizationId().toString());
        payload.put("learnerId", event.learnerId().toString());
        payload.put("selectionId", event.selectionId().toString());
        if (event.previousSelectionId() == null) {
            payload.putNull("previousSelectionId");
        } else {
            payload.put("previousSelectionId", event.previousSelectionId().toString());
        }
        payload.put("roleId", event.roleId().toString());
        payload.put("targetRevision", event.targetRevision());
        payload.put("occurredAt", event.occurredAt().toString());
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException invalidPayload) {
            throw new IllegalStateException("Target selection event payload could not be serialized", invalidPayload);
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
}
