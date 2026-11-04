package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase.Code;
import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase.Failure;
import com.adaptlearngraph.repository.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.CoverageKey;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.Difficulty;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort.CatalogJobPosition;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort.CatalogJobPositionSummary;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort.CatalogRole;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort.CatalogSkill;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** REQ-002-F02 capacity query policy; fakes are unit evidence only. */
class BaselineBlueprintCapacityServiceTest {
    private static final String ORGANIZATION_ID = "org-alpha";
    private static final String JOB_POSITION_ID = "jobPosition-engineering";
    private static final Instant NOW = Instant.parse("2026-10-16T08:00:00Z");

    @Test
    void returnsSortedCapacityForUniqueJobPositionSkillsAndTrustedTenant() {
        var fixture = new Fixture();

        var result = fixture.service.getAvailableCapacity("  " + JOB_POSITION_ID + "  ");

        assertThat(result.jobPositionId()).isEqualTo(JOB_POSITION_ID);
        assertThat(result.catalogVersion()).isEqualTo("catalog-v7");
        assertThat(result.coverageAsOf()).isEqualTo(NOW);
        assertThat(result.roles()).extracting(role -> role.roleId())
                .containsExactly("role-a", "role-z");
        assertThat(result.roles().getFirst().skills()).singleElement().satisfies(skill -> {
            assertThat(skill.microSkillId()).isEqualTo("skill-shared");
            assertThat(skill.availableEasy()).isEqualTo(7);
            assertThat(skill.availableMedium()).isEqualTo(5);
            assertThat(skill.availableHard()).isZero();
        });
        assertThat(fixture.catalog.requestedOrganizationId).isEqualTo(ORGANIZATION_ID);
        assertThat(fixture.validation.requestedSkillIds)
                .containsExactlyInAnyOrder("skill-shared", "skill-z");
        assertThat(fixture.validation.calls).isOne();
    }

    @Test
    void rejectsMissingInactiveOrWrongRoleActorBeforeReadingCatalog() {
        var fixture = new Fixture();
        fixture.actor = Optional.empty();
        assertCode(Code.UNAUTHENTICATED, () -> fixture.service.getAvailableCapacity(JOB_POSITION_ID));

        fixture.actor = Optional.of(actor(false, "LD_MANAGER"));
        assertCode(Code.FORBIDDEN, () -> fixture.service.getAvailableCapacity(JOB_POSITION_ID));

        fixture.actor = Optional.of(actor(true, "EMPLOYEE"));
        assertCode(Code.FORBIDDEN, () -> fixture.service.getAvailableCapacity(JOB_POSITION_ID));

        assertThat(fixture.catalog.calls).isZero();
        assertThat(fixture.validation.calls).isZero();
    }

    @Test
    void mapsMissingJobPositionAndCatalogFailureWithoutReadingCoverage() {
        var fixture = new Fixture();
        fixture.catalog.jobPosition = Optional.empty();
        assertCode(Code.NOT_FOUND, () -> fixture.service.getAvailableCapacity(JOB_POSITION_ID));

        fixture.catalog.failure = new BaselineJobPositionCatalogPort.DependencyUnavailable(
                "catalog offline", new IllegalStateException("offline"));
        assertCode(Code.DEPENDENCY_UNAVAILABLE,
                () -> fixture.service.getAvailableCapacity(JOB_POSITION_ID));

        assertThat(fixture.validation.calls).isZero();
    }

    @Test
    void mapsCoverageDependencyFailure() {
        var fixture = new Fixture();
        fixture.validation.failure = new BaselineBlueprintValidationPort.DependencyUnavailable(
                "question bank offline", new IllegalStateException("offline"));

        assertCode(Code.DEPENDENCY_UNAVAILABLE,
                () -> fixture.service.getAvailableCapacity(JOB_POSITION_ID));
    }

    private static Actor actor(boolean active, String role) {
        return new Actor(UUID.fromString("00000000-0000-0000-0000-000000000101"),
                ORGANIZATION_ID, active, Set.of(role));
    }

    private static void assertCode(Code code, ThrowingCall call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(Failure.class,
                        failure -> assertThat(failure.code()).isEqualTo(code));
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void run();
    }

    private static final class Fixture {
        private Optional<Actor> actor = Optional.of(actor(true, "LD_MANAGER"));
        private final FakeCatalog catalog = new FakeCatalog();
        private final FakeValidation validation = new FakeValidation();
        private final BaselineBlueprintCapacityService service = new BaselineBlueprintCapacityService(
                () -> actor, catalog, validation, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static final class FakeCatalog implements BaselineJobPositionCatalogPort {
        private Optional<CatalogJobPosition> jobPosition = Optional.of(new CatalogJobPosition(
                JOB_POSITION_ID, "Software Engineering", "catalog-v7",
                List.of(
                        new CatalogRole("role-z", "Z role", "v7",
                                List.of(new CatalogSkill("skill-z", "Z skill", "v7"),
                                        new CatalogSkill("skill-shared", "Shared", "v7"))),
                        new CatalogRole("role-a", "A role", "v7",
                                List.of(new CatalogSkill("skill-shared", "Shared", "v7"))))));
        private RuntimeException failure;
        private String requestedOrganizationId;
        private int calls;

        @Override
        public List<CatalogJobPositionSummary> findAvailableJobPositions(String organizationId) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Optional<CatalogJobPosition> findAvailableJobPosition(
                String organizationId, String jobPositionId) {
            calls++;
            requestedOrganizationId = organizationId;
            if (failure != null) throw failure;
            return JOB_POSITION_ID.equals(jobPositionId) ? jobPosition : Optional.empty();
        }
    }

    private static final class FakeValidation implements BaselineBlueprintValidationPort {
        private final Map<CoverageKey, Integer> coverage = Map.of(
                new CoverageKey("skill-shared", Difficulty.EASY), 7,
                new CoverageKey("skill-shared", Difficulty.MEDIUM), 5,
                new CoverageKey("skill-z", Difficulty.EASY), 2,
                new CoverageKey("skill-z", Difficulty.MEDIUM), 3,
                new CoverageKey("skill-z", Difficulty.HARD), 4);
        private RuntimeException failure;
        private Set<String> requestedSkillIds = Set.of();
        private int calls;

        @Override
        public Optional<CatalogRole> findAvailableRole(String organizationId, String roleId) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Optional<BaselineBlueprintValidationPort.CatalogJobPosition> findAvailableJobPosition(
                String organizationId, String jobPositionId) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Map<CoverageKey, Integer> findPublishedCoverage(Set<String> microSkillIds) {
            calls++;
            requestedSkillIds = Set.copyOf(microSkillIds);
            if (failure != null) throw failure;
            return coverage;
        }
    }
}
