package com.adaptlearngraph.learning.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Immutable target-role selection state used by the selection transaction. */
public record TargetRoleSelection(
        UUID selectionId,
        UUID learnerId,
        UUID catalogReferenceId,
        TargetRoleSnapshot roleSnapshot,
        Instant selectedAt,
        Instant endedAt,
        long targetRevision) {

    public TargetRoleSelection {
        selectionId = requireIdentity(selectionId, "selectionId");
        learnerId = requireIdentity(learnerId, "learnerId");
        catalogReferenceId = requireIdentity(catalogReferenceId, "catalogReferenceId");
        roleSnapshot = Objects.requireNonNull(roleSnapshot, "roleSnapshot must not be null");
        selectedAt = Objects.requireNonNull(selectedAt, "selectedAt must not be null");
        if (endedAt != null && endedAt.isBefore(selectedAt)) {
            throw new IllegalArgumentException("endedAt must not be before selectedAt");
        }
        if (targetRevision < 1) {
            throw new IllegalArgumentException("targetRevision must be positive");
        }
    }

    public boolean isActive() {
        return endedAt == null;
    }

    public TargetRoleSelection endAt(Instant endTime) {
        Objects.requireNonNull(endTime, "endTime must not be null");
        if (!isActive()) {
            throw new IllegalStateException("selection has already ended");
        }
        return new TargetRoleSelection(
                selectionId,
                learnerId,
                catalogReferenceId,
                roleSnapshot,
                selectedAt,
                endTime,
                targetRevision);
    }

    private static UUID requireIdentity(UUID value, String field) {
        Objects.requireNonNull(value, field + " must not be null");
        if (value.equals(new UUID(0L, 0L))) {
            throw new IllegalArgumentException(field + " must not be the nil UUID");
        }
        return value;
    }
}
