package com.adaptlearngraph.learning.domain;

import java.util.Objects;
import java.util.UUID;

/** Minimal immutable role display captured when a target role is selected. */
public record TargetRoleSnapshot(
        UUID id,
        String code,
        String name,
        CareerTrack track) {

    public TargetRoleSnapshot {
        id = requireIdentity(id, "id");
        code = requireText(code, "code");
        name = requireText(name, "name");
        track = Objects.requireNonNull(track, "track must not be null");
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
        return value.strip();
    }

    public enum CareerTrack {
        PROFESSIONAL,
        MANAGEMENT
    }
}
