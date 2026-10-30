package com.adaptlearngraph.assessment.application.port.out;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Read boundary for the Occupation catalog consumed by baseline authoring. */
public interface BaselineOccupationCatalogPort {
    List<CatalogOccupationSummary> findAvailableOccupations(String organizationId);

    Optional<CatalogOccupation> findAvailableOccupation(String organizationId, String occupationId);

    record CatalogOccupationSummary(String id, String name, String version, int roleCount) {
        public CatalogOccupationSummary {
            id = requireText(id, "id");
            name = requireText(name, "name");
            version = requireText(version, "version");
            if (roleCount < 0) {
                throw new IllegalArgumentException("roleCount must not be negative");
            }
        }
    }

    record CatalogOccupation(String id, String name, String version, List<CatalogRole> roles) {
        public CatalogOccupation {
            id = requireText(id, "id");
            name = requireText(name, "name");
            version = requireText(version, "version");
            roles = List.copyOf(Objects.requireNonNull(roles, "roles must not be null")).stream()
                    .sorted(Comparator.comparing(CatalogRole::id))
                    .toList();
        }
    }

    record CatalogRole(String id, String name, String version, List<CatalogSkill> skills) {
        public CatalogRole {
            id = requireText(id, "id");
            name = requireText(name, "name");
            version = requireText(version, "version");
            skills = List.copyOf(Objects.requireNonNull(skills, "skills must not be null")).stream()
                    .distinct()
                    .sorted(Comparator.comparing(CatalogSkill::id))
                    .toList();
        }
    }

    record CatalogSkill(String id, String name, String version) {
        public CatalogSkill {
            id = requireText(id, "id");
            name = requireText(name, "name");
            version = requireText(version, "version");
        }
    }

    final class DependencyUnavailable extends RuntimeException {
        public DependencyUnavailable(String message, Throwable cause) {
            super(message, cause);
        }
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
