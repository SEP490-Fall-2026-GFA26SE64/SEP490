package com.adaptlearngraph.learning.application.port.out;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Writes the audit and outbox records produced by an applied selection command. */
public interface TargetSelectionEventPort {
    void record(TargetSelectionEvent event);

    record TargetSelectionEvent(
            UUID auditEventId,
            UUID outboxEventId,
            UUID actorId,
            UUID organizationId,
            UUID learnerId,
            UUID selectionId,
            UUID previousSelectionId,
            UUID roleId,
            long targetRevision,
            EventType type,
            UUID correlationId,
            Instant occurredAt) {

        public TargetSelectionEvent {
            auditEventId = requireIdentity(auditEventId, "auditEventId");
            outboxEventId = requireIdentity(outboxEventId, "outboxEventId");
            actorId = requireIdentity(actorId, "actorId");
            organizationId = requireIdentity(organizationId, "organizationId");
            learnerId = requireIdentity(learnerId, "learnerId");
            selectionId = requireIdentity(selectionId, "selectionId");
            roleId = requireIdentity(roleId, "roleId");
            type = Objects.requireNonNull(type, "type must not be null");
            correlationId = requireIdentity(correlationId, "correlationId");
            occurredAt = Objects.requireNonNull(occurredAt, "occurredAt must not be null");
            if (targetRevision < 1) {
                throw new IllegalArgumentException("targetRevision must be positive");
            }
            if (!actorId.equals(learnerId)) {
                throw new IllegalArgumentException("employee actor must own the target selection");
            }
            if (type == EventType.SELECTED && previousSelectionId != null) {
                throw new IllegalArgumentException("selected event must not have a previousSelectionId");
            }
            if (type == EventType.CHANGED) {
                previousSelectionId = requireIdentity(previousSelectionId, "previousSelectionId");
                if (previousSelectionId.equals(selectionId)) {
                    throw new IllegalArgumentException("changed event requires different selections");
                }
            }
        }

        private static UUID requireIdentity(UUID value, String field) {
            Objects.requireNonNull(value, field + " must not be null");
            if (value.equals(new UUID(0L, 0L))) {
                throw new IllegalArgumentException(field + " must not be the nil UUID");
            }
            return value;
        }
    }

    enum EventType {
        SELECTED,
        CHANGED
    }
}
