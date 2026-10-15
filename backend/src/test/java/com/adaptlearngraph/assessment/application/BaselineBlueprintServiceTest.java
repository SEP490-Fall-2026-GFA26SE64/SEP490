package com.adaptlearngraph.assessment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CatalogRole;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CatalogSkill;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CoverageKey;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.Difficulty;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** REQ-002-F02 application policy; adapters are deterministic fakes, not integration evidence. */
class BaselineBlueprintServiceTest {
    private static final UUID ACTOR_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final String ORGANIZATION_ID = "org-alpha";
    private static final String ROLE_ID = "role-java";
    private static final String SKILL_ID = "skill-java";
    private static final Instant NOW = Instant.parse("2026-10-14T15:00:00Z");

    @Test
    void createsVersionFromTrustedActorAndNormalizesCatalogSnapshots() {
        var fixture = new Fixture();

        BaselineBlueprint created = fixture.service.create("create-1", draft("Client role", 1, 1, 1));

        assertThat(created.version()).isOne();
        assertThat(created.createdBy()).isEqualTo(ACTOR_ID);
        assertThat(created.createdAt()).isEqualTo(NOW);
        assertThat(created.roles()).singleElement().satisfies(role -> {
            assertThat(role.roleNameSnapshot()).isEqualTo("Java Backend Engineer");
            assertThat(role.totalQuestionCount()).isEqualTo(3);
            assertThat(role.skills()).singleElement()
                    .extracting(SkillConfig::microSkillNameSnapshot)
                    .isEqualTo("Java Core");
        });
        assertThat(fixture.validation.requestedOrganizationId).isEqualTo(ORGANIZATION_ID);
        assertThat(fixture.store.inserted).containsExactly(created);
    }

    @Test
    void rejectsUnauthenticatedInactiveAndWrongRoleBeforeDependencies() {
        var fixture = new Fixture();
        fixture.actor = Optional.empty();
        assertCode(Code.UNAUTHENTICATED, () -> fixture.service.create("key-1", draft("Role", 1, 1, 1)));

        fixture.actor = Optional.of(new Actor(ACTOR_ID, ORGANIZATION_ID, false, Set.of("LD_MANAGER")));
        assertCode(Code.FORBIDDEN, () -> fixture.service.create("key-2", draft("Role", 1, 1, 1)));

        fixture.actor = Optional.of(new Actor(ACTOR_ID, ORGANIZATION_ID, true, Set.of("EMPLOYEE")));
        assertCode(Code.FORBIDDEN, () -> fixture.service.create("key-3", draft("Role", 1, 1, 1)));

        assertThat(fixture.validation.catalogCalls).isZero();
        assertThat(fixture.store.inserted).isEmpty();
    }

    @Test
    void reportsEveryMissingDifficultyAndDoesNotPersistRejectedDraft() {
        var fixture = new Fixture();
        fixture.validation.coverage.clear();
        fixture.validation.coverage.put(new CoverageKey(SKILL_ID, Difficulty.EASY), 1);

        assertThatThrownBy(() -> fixture.service.create("coverage-short", draft("Role", 2, 1, 1)))
                .isInstanceOfSatisfying(Failure.class, failure -> {
                    assertThat(failure.code()).isEqualTo(Code.INSUFFICIENT_QUESTION_COVERAGE);
                    assertThat(failure.coverageShortages())
                            .extracting(shortage -> shortage.difficulty() + ":" + shortage.missing())
                            .containsExactly("EASY:1", "MEDIUM:1", "HARD:1");
                });
        assertThat(fixture.store.inserted).isEmpty();
    }

    @Test
    void disabledRoleSkipsCatalogAndCoverageButKeepsConfiguration() {
        var fixture = new Fixture();
        fixture.validation.roles.clear();
        fixture.validation.coverage.clear();
        BlueprintDraft input = new BlueprintDraft("Disabled role blueprint", null, null, List.of(
                role(false, "Unresolved snapshot", 7, 8, 9)));

        BaselineBlueprint created = fixture.service.create("disabled-role", input);

        assertThat(created.roles()).singleElement().satisfies(role -> {
            assertThat(role.enabled()).isFalse();
            assertThat(role.roleNameSnapshot()).isEqualTo("Unresolved snapshot");
            assertThat(role.totalQuestionCount()).isEqualTo(24);
        });
        assertThat(fixture.validation.catalogCalls).isZero();
        assertThat(fixture.validation.requestedCoverageSkillIds).isEmpty();
    }

    @Test
    void replaysSameActorKeyAndRejectsDifferentContent() {
        var fixture = new Fixture();
        BaselineBlueprint first = fixture.service.create("shared-key", draft("Original", 1, 1, 1));
        int catalogCalls = fixture.validation.catalogCalls;

        BaselineBlueprint replay = fixture.service.create("shared-key", draft("Original", 1, 1, 1));

        assertThat(replay).isEqualTo(first);
        assertThat(fixture.validation.catalogCalls).isEqualTo(catalogCalls);
        assertCode(Code.IDEMPOTENCY_CONFLICT,
                () -> fixture.service.create("shared-key", draft("Changed", 1, 1, 1)));
        assertThat(fixture.store.inserted).hasSize(1);
    }

    @Test
    void reviseRequiresLatestVersionAndCreatesImmutableSuccessor() {
        var fixture = new Fixture();
        BaselineBlueprint first = fixture.service.create("create", draft("Version one", 1, 1, 1));

        BaselineBlueprint second = fixture.service.revise(
                first.blueprintId(), 1, "revise", draft("Version two", 2, 1, 1));

        assertThat(second.blueprintId()).isEqualTo(first.blueprintId());
        assertThat(second.version()).isEqualTo(2);
        assertThat(second.name()).isEqualTo("Version two");
        assertThat(fixture.store.findVersion(first.blueprintId(), 1)).contains(first);
        assertCode(Code.VERSION_CONFLICT, () -> fixture.service.revise(
                first.blueprintId(), 1, "stale", draft("Stale", 1, 1, 1)));
    }

    @Test
    void mapsCatalogDependencyFailureWithoutPersisting() {
        var fixture = new Fixture();
        fixture.validation.failure = new BaselineBlueprintValidationPort.DependencyUnavailable(
                "catalog unavailable", new IllegalStateException("offline"));

        assertCode(Code.DEPENDENCY_UNAVAILABLE,
                () -> fixture.service.create("dependency", draft("Role", 1, 1, 1)));
        assertThat(fixture.store.inserted).isEmpty();
    }

    private static BlueprintDraft draft(String name, int easy, int medium, int hard) {
        return new BlueprintDraft(name, null, null, List.of(role(true, "Client snapshot", easy, medium, hard)));
    }

    private static RoleConfig role(boolean enabled, String name, int easy, int medium, int hard) {
        return new RoleConfig(
                ROLE_ID, name, enabled,
                new BigDecimal("0.3"), new BigDecimal("0.4"), new BigDecimal("0.3"),
                List.of(new SkillConfig(SKILL_ID, "Client skill snapshot", easy, medium, hard)));
    }

    private static void assertCode(Code code, ThrowingCall call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(Failure.class, failure -> assertThat(failure.code()).isEqualTo(code));
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void run();
    }

    private static final class Fixture {
        private Optional<Actor> actor = Optional.of(
                new Actor(ACTOR_ID, ORGANIZATION_ID, true, Set.of("LD_MANAGER")));
        private final InMemoryStore store = new InMemoryStore();
        private final FakeValidation validation = new FakeValidation();
        private final BaselineBlueprintService service = new BaselineBlueprintService(
                () -> actor, store, validation, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static final class InMemoryStore implements BaselineBlueprintStore {
        private final List<BaselineBlueprint> inserted = new java.util.ArrayList<>();

        @Override
        public Optional<BaselineBlueprint> findLatest(UUID blueprintId) {
            return inserted.stream()
                    .filter(item -> item.blueprintId().equals(blueprintId))
                    .max(java.util.Comparator.comparingInt(BaselineBlueprint::version));
        }

        @Override
        public Optional<BaselineBlueprint> findVersion(UUID blueprintId, int version) {
            return inserted.stream()
                    .filter(item -> item.blueprintId().equals(blueprintId) && item.version() == version)
                    .findFirst();
        }

        @Override
        public Optional<BaselineBlueprint> findByRequest(UUID actorId, String idempotencyKey) {
            return inserted.stream()
                    .filter(item -> item.createdBy().equals(actorId)
                            && item.idempotencyKey().equals(idempotencyKey))
                    .findFirst();
        }

        @Override
        public void insert(BaselineBlueprint blueprint) {
            inserted.add(blueprint);
        }
    }

    private static final class FakeValidation implements BaselineBlueprintValidationPort {
        private final Map<String, CatalogRole> roles = new HashMap<>(Map.of(
                ROLE_ID, new CatalogRole(ROLE_ID, "Java Backend Engineer",
                        List.of(new CatalogSkill(SKILL_ID, "Java Core")))));
        private final Map<CoverageKey, Integer> coverage = new HashMap<>();
        private RuntimeException failure;
        private String requestedOrganizationId;
        private Set<String> requestedCoverageSkillIds = Set.of();
        private int catalogCalls;

        private FakeValidation() {
            for (Difficulty difficulty : Difficulty.values()) {
                coverage.put(new CoverageKey(SKILL_ID, difficulty), 10);
            }
        }

        @Override
        public Optional<CatalogRole> findAvailableRole(String organizationId, String roleId) {
            catalogCalls++;
            requestedOrganizationId = organizationId;
            if (failure != null) {
                throw failure;
            }
            return Optional.ofNullable(roles.get(roleId));
        }

        @Override
        public Map<CoverageKey, Integer> findPublishedCoverage(Set<String> microSkillIds) {
            requestedCoverageSkillIds = Set.copyOf(microSkillIds);
            if (failure != null) {
                throw failure;
            }
            return Map.copyOf(coverage);
        }
    }
}
