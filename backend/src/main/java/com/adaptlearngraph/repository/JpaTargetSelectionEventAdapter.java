package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.repository.TargetSelectionEventPort.TargetSelectionEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Objects;

/** Writes the F02 audit and outbox records on the caller's PostgreSQL transaction. */
public final class JpaTargetSelectionEventAdapter implements TargetSelectionEventPort {
    private final AuditEventJpaRepository audit;
    private final OutboxEventJpaRepository outbox;
    private final ObjectMapper objectMapper;

    public JpaTargetSelectionEventAdapter(
            AuditEventJpaRepository audit,
            OutboxEventJpaRepository outbox,
            ObjectMapper objectMapper) {
        this.audit = Objects.requireNonNull(audit, "audit must not be null");
        this.outbox = Objects.requireNonNull(outbox, "outbox must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
    }

    @Override
    public void record(TargetSelectionEvent event) {
        Objects.requireNonNull(event, "event must not be null");
        String eventType = switch (event.type()) {
            case SELECTED -> "TARGET_ROLE_SELECTED";
            case CHANGED -> "TARGET_ROLE_CHANGED";
        };

        audit.insert(new AuditEventEntity(
                event.auditEventId(),
                event.actorId(),
                null,
                eventType,
                event.selectionId(),
                Long.toString(event.targetRevision()),
                event.occurredAt(),
                "SUCCEEDED",
                event.correlationId()));

        outbox.insert(new OutboxEventEntity(
                event.outboxEventId(),
                eventType,
                event.learnerId(),
                event.targetRevision(),
                PersistenceValues.document(writePayload(event)),
                event.correlationId(),
                event.occurredAt()));
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
}
