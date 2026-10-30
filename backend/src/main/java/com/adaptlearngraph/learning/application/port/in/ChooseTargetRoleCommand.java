package com.adaptlearngraph.learning.application.port.in;

import java.util.Objects;
import java.util.UUID;

/** Client-controlled selection input; actor and organization come from trusted context. */
public record ChooseTargetRoleCommand(
        UUID roleId,
        UUID expectedCurrentSelectionId,
        String idempotencyKey) {

    public ChooseTargetRoleCommand {
        roleId = requireIdentity(roleId, "roleId");
        if (expectedCurrentSelectionId != null) {
            expectedCurrentSelectionId = requireIdentity(
                    expectedCurrentSelectionId, "expectedCurrentSelectionId");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("idempotencyKey must not be blank");
        }
        idempotencyKey = idempotencyKey.strip();
    }

    private static UUID requireIdentity(UUID value, String field) {
        Objects.requireNonNull(value, field + " must not be null");
        if (value.equals(new UUID(0L, 0L))) {
            throw new IllegalArgumentException(field + " must not be the nil UUID");
        }
        return value;
    }
}
