package com.adaptlearngraph.entities.domain;

import java.util.Objects;

/** Catalog search summary projection of a target role. */
public record TargetRoleSummary(
        String id,
        String code,
        String name,
        String description,
        int requirementCount) {

    public TargetRoleSummary {
        id = requireText(id, "id");
        code = requireText(code, "code");
        name = requireText(name, "name");
        description = description == null ? "" : description.strip();
        if (requirementCount < 0) {
            throw new IllegalArgumentException("requirementCount must not be negative");
        }
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
