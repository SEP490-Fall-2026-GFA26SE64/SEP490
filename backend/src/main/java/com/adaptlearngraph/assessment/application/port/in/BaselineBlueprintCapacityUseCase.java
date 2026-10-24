package com.adaptlearngraph.assessment.application.port.in;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** Reads the currently published question capacity available to baseline authoring. */
public interface BaselineBlueprintCapacityUseCase {
    CapacityDetail getAvailableCapacity(String occupationId);

    record CapacityDetail(
            String occupationId,
            String catalogVersion,
            Instant coverageAsOf,
            List<RoleCapacity> roles) {
        public CapacityDetail {
            occupationId = requireText(occupationId, "occupationId");
            catalogVersion = requireText(catalogVersion, "catalogVersion");
            coverageAsOf = Objects.requireNonNull(coverageAsOf, "coverageAsOf must not be null");
            roles = List.copyOf(Objects.requireNonNull(roles, "roles must not be null")).stream()
                    .sorted(Comparator.comparing(RoleCapacity::roleId))
                    .toList();
        }
    }

    record RoleCapacity(String roleId, List<SkillCapacity> skills) {
        public RoleCapacity {
            roleId = requireText(roleId, "roleId");
            skills = List.copyOf(Objects.requireNonNull(skills, "skills must not be null")).stream()
                    .sorted(Comparator.comparing(SkillCapacity::microSkillId))
                    .toList();
        }
    }

    record SkillCapacity(
            String microSkillId,
            int availableEasy,
            int availableMedium,
            int availableHard) {
        public SkillCapacity {
            microSkillId = requireText(microSkillId, "microSkillId");
            requireNonNegative(availableEasy, "availableEasy");
            requireNonNegative(availableMedium, "availableMedium");
            requireNonNegative(availableHard, "availableHard");
        }
    }

    final class Failure extends RuntimeException {
        private final Code code;

        public Failure(Code code, String message) {
            super(message);
            this.code = Objects.requireNonNull(code, "code must not be null");
        }

        public Code code() {
            return code;
        }
    }

    enum Code {
        UNAUTHENTICATED,
        FORBIDDEN,
        NOT_FOUND,
        DEPENDENCY_UNAVAILABLE
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }

    private static void requireNonNegative(int value, String field) {
        if (value < 0) {
            throw new IllegalArgumentException(field + " must not be negative");
        }
    }
}
