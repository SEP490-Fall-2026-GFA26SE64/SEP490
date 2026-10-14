package com.adaptlearngraph.assessment.application.port.in;

import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public interface BaselineBlueprintUseCase {
    BaselineBlueprint create(String idempotencyKey, BlueprintDraft draft);

    BaselineBlueprint revise(
            UUID blueprintId, int expectedLatestVersion, String idempotencyKey, BlueprintDraft draft);

    BaselineBlueprint getLatest(UUID blueprintId);

    BaselineBlueprint getVersion(UUID blueprintId, int version);

    record BlueprintDraft(
            String name,
            String occupationId,
            String occupationNameSnapshot,
            List<RoleConfig> roles) {
        public BlueprintDraft {
            roles = List.copyOf(Objects.requireNonNull(roles, "roles must not be null"));
        }
    }

    final class Failure extends RuntimeException {
        private final Code code;
        private final List<CoverageShortage> coverageShortages;

        public Failure(Code code, String message) {
            this(code, message, List.of());
        }

        public Failure(Code code, String message, List<CoverageShortage> coverageShortages) {
            super(message);
            this.code = Objects.requireNonNull(code, "code must not be null");
            this.coverageShortages = List.copyOf(coverageShortages);
        }

        public Code code() {
            return code;
        }

        public List<CoverageShortage> coverageShortages() {
            return coverageShortages;
        }
    }

    record CoverageShortage(
            String roleId,
            String microSkillId,
            String difficulty,
            int required,
            int available,
            int missing) {}

    enum Code {
        UNAUTHENTICATED,
        FORBIDDEN,
        INVALID_REQUEST,
        CATALOG_REFERENCE_INVALID,
        INSUFFICIENT_QUESTION_COVERAGE,
        DEPENDENCY_UNAVAILABLE,
        NOT_FOUND,
        REVIEW_REQUIRED,
        VERSION_CONFLICT,
        IDEMPOTENCY_CONFLICT
    }
}
