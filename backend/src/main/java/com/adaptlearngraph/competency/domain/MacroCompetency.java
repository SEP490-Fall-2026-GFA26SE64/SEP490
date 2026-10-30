package com.adaptlearngraph.competency.domain;

import java.time.Instant;
import java.util.Objects;

public record MacroCompetency(
        String id,
        String code,
        String name,
        String description,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public MacroCompetency {
        Objects.requireNonNull(code, "code must not be null");
        Objects.requireNonNull(name, "name must not be null");
        status = Objects.requireNonNullElse(status, "ACTIVE");
        createdAt = Objects.requireNonNullElse(createdAt, Instant.now());
        updatedAt = Objects.requireNonNullElse(updatedAt, Instant.now());
    }
}
