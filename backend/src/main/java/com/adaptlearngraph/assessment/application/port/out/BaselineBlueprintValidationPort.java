package com.adaptlearngraph.assessment.application.port.out;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

public interface BaselineBlueprintValidationPort {
    Optional<CatalogRole> findAvailableRole(String organizationId, String roleId);

    Map<CoverageKey, Integer> findPublishedCoverage(Set<String> microSkillIds);

    record CatalogRole(String id, String name, List<CatalogSkill> skills) {
        public CatalogRole {
            skills = List.copyOf(skills);
        }
    }

    record CatalogSkill(String id, String name) {}

    record CoverageKey(String microSkillId, Difficulty difficulty) {}

    enum Difficulty {
        EASY,
        MEDIUM,
        HARD
    }

    final class DependencyUnavailable extends RuntimeException {
        public DependencyUnavailable(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
