package com.adaptlearngraph.catalog.domain;

import java.util.List;
import java.util.Objects;

/** Employee-facing detail of a catalog-valid target role. */
public record TargetRoleDetail(
        String id,
        String code,
        String name,
        String familyCode,
        CareerTrack track,
        Seniority seniority,
        String description,
        List<String> responsibilities,
        List<TargetRoleRequirement> requirements) {

    public TargetRoleDetail {
        id = requireText(id, "id");
        code = requireText(code, "code");
        name = requireText(name, "name");
        familyCode = requireText(familyCode, "familyCode");
        track = Objects.requireNonNull(track, "track must not be null");
        seniority = Objects.requireNonNull(seniority, "seniority must not be null");
        if (!seniority.supportsTrack(track)) {
            throw new IllegalArgumentException("seniority must match track");
        }
        description = optionalText(description);
        responsibilities = copyResponsibilities(responsibilities);
        requirements = List.copyOf(Objects.requireNonNull(requirements, "requirements must not be null"));
        if (requirements.isEmpty()) {
            throw new IllegalArgumentException("requirements must not be empty");
        }
        if (requirements.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("requirements must not contain null");
        }
    }

    private static List<String> copyResponsibilities(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream().map(value -> requireText(value, "responsibility")).toList();
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
