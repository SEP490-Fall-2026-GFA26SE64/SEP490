package com.adaptlearngraph.services;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

public interface BaselineJobPositionCatalogUseCase {
    List<JobPositionSummary> listAvailableJobPositions();

    JobPositionDetail getAvailableJobPosition(String jobPositionId);

    record JobPositionSummary(String id, String name, String catalogVersion, int roleCount) {}

    record JobPositionDetail(
            String id, String name, String catalogVersion, List<RoleDetail> roles) {
        public JobPositionDetail {
            roles = List.copyOf(Objects.requireNonNull(roles, "roles must not be null")).stream()
                    .sorted(Comparator.comparing(RoleDetail::id))
                    .toList();
        }
    }

    record RoleDetail(String id, String name, String catalogVersion, List<SkillDetail> skills) {
        public RoleDetail {
            skills = List.copyOf(Objects.requireNonNull(skills, "skills must not be null")).stream()
                    .sorted(Comparator.comparing(SkillDetail::id))
                    .toList();
        }
    }

    record SkillDetail(String id, String name, String catalogVersion) {}

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
}
