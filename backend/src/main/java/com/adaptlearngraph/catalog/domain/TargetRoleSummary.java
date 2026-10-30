package com.adaptlearngraph.catalog.domain;

import java.util.Objects;

/** Employee-facing summary of a catalog-valid target role. */
public record TargetRoleSummary(
        String id,
        String code,
        String name,
        CareerTrack track,
        Seniority seniority,
        String description,
        int requirementCount) {

    public TargetRoleSummary {
        id = requireText(id, "id");
        code = requireText(code, "code");
        name = requireText(name, "name");
        track = Objects.requireNonNull(track, "track must not be null");
        seniority = Objects.requireNonNull(seniority, "seniority must not be null");
        if (!seniority.supportsTrack(track)) {
            throw new IllegalArgumentException("seniority must match track");
        }
        description = optionalText(description);
        if (requirementCount < 1) {
            throw new IllegalArgumentException("requirementCount must be at least 1");
        }
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }

    private static String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
