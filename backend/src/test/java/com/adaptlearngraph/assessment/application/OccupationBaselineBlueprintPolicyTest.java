package com.adaptlearngraph.assessment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CatalogOccupation;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** REQ-002-F02 R9-R11/R13 occupation-scoped authoring rules. */
class OccupationBaselineBlueprintPolicyTest {
    private static final UUID ACTOR_ID = new UUID(0, 101);
    private static final String OCCUPATION = "occupation-engineering";
    private static final String OTHER_OCCUPATION = "occupation-data";
    private static final String SHARED_SKILL = "skill-shared";

    @Test
    void requiresAllRolesRetainsZeroRoleAndNormalizesSnapshots() {
        var fixture = new Fixture();

        BaselineBlueprint created = fixture.service.create("create", draft(
                OCCUPATION, role("role-a", 1), role("role-b", 0)));

        assertThat(created.occupationNameSnapshot()).isEqualTo("Software Engineering");
        assertThat(created.roles()).extracting(RoleConfig::roleNameSnapshot)
                .containsExactly("Backend Engineer", "Platform Engineer");
        assertThat(created.roles()).extracting(RoleConfig::enabled).containsExactly(true, false);
        assertThat(fixture.validation.requestedOrganization).isEqualTo("org-alpha");

        assertCode(Code.CATALOG_REFERENCE_INVALID, () -> fixture.service.create(
                "missing", draft(OCCUPATION, role("role-a", 1))));
        assertCode(Code.CATALOG_REFERENCE_INVALID, () -> fixture.service.create(
                "injected", draft(OCCUPATION,
                        role("role-a", 1), role("role-b", 0), role("role-outside", 0))));
    }

    @Test
    void aggregatesSharedSkillDemandWithRoleContributions() {
        var fixture = new Fixture();
        fixture.validation.available = 1;

        assertThatThrownBy(() -> fixture.service.create("shortage", draft(
                OCCUPATION, role("role-a", 2), role("role-b", 2))))
                .isInstanceOfSatisfying(Failure.class, failure -> {
                    assertThat(failure.code()).isEqualTo(Code.INSUFFICIENT_QUESTION_COVERAGE);
                    assertThat(failure.coverageShortages()).singleElement().satisfies(shortage -> {
                        assertThat(shortage.roleId()).isNull();
                        assertThat(shortage.required()).isEqualTo(4);
                        assertThat(shortage.available()).isOne();
                        assertThat(shortage.missing()).isEqualTo(3);
                        assertThat(shortage.roleRequirements())
                                .extracting(item -> item.roleId() + ":" + item.required())
                                .containsExactly("role-a:2", "role-b:2");
                    });
                });
        assertThat(fixture.store.values).isEmpty();
    }

    @Test
    void enforcesOneIdentityAndPreventsOccupationChangeOnRevise() {
        var fixture = new Fixture();
        BaselineBlueprint first = fixture.service.create(
                "create", draft(OCCUPATION, role("role-a", 1), role("role-b", 0)));

        assertCode(Code.VERSION_CONFLICT, () -> fixture.service.create(
                "duplicate", draft(OCCUPATION, role("role-a", 1), role("role-b", 0))));
        assertCode(Code.INVALID_REQUEST, () -> fixture.service.revise(
                first.blueprintId(), 1, "move",
                draft(OTHER_OCCUPATION, role("role-a", 1), role("role-b", 0))));

        BaselineBlueprint second = fixture.service.revise(
                first.blueprintId(), 1, "revise",
                draft(OCCUPATION, role("role-a", 2), role("role-b", 0)));
        assertThat(second.version()).isEqualTo(2);
        assertThat(fixture.service.getLatestByOccupation(OCCUPATION)).isEqualTo(second);
    }

    private static BlueprintDraft draft(String occupationId, RoleConfig... roles) {
        return new BlueprintDraft("Engineering baseline", occupationId, "Client occupation", List.of(roles));
    }

    private static RoleConfig role(String roleId, int easy) {
        return new RoleConfig(roleId, "Client role", true,
                new BigDecimal("0.2"), new BigDecimal("0.3"), new BigDecimal("0.5"),
                List.of(new SkillConfig(
                        SHARED_SKILL, "Client skill", easy, easy > 0 ? 1 : 0, easy > 0 ? 1 : 0)));
    }

    private static void assertCode(Code code, Runnable call) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(
                Failure.class, failure -> assertThat(failure.code()).isEqualTo(code));
    }

    private static final class Fixture {
        private final MemoryStore store = new MemoryStore();
        private final FakeValidation validation = new FakeValidation();
        private final BaselineBlueprintService service = new BaselineBlueprintService(
                () -> Optional.of(new Actor(ACTOR_ID, "org-alpha", true, Set.of("LD_MANAGER"))),
                store, validation, Clock.fixed(Instant.parse("2026-10-15T10:00:00Z"), ZoneOffset.UTC));
    }

    private static final class MemoryStore implements BaselineBlueprintStore {
        private final List<BaselineBlueprint> values = new ArrayList<>();

        @Override
        public Optional<BaselineBlueprint> findLatest(UUID id) {
            return values.stream().filter(value -> value.blueprintId().equals(id))
                    .max(Comparator.comparingInt(BaselineBlueprint::version));
        }

        @Override
        public Optional<BaselineBlueprint> findLatestByOccupation(String occupationId) {
            return values.stream().filter(value -> occupationId.equals(value.occupationId()))
                    .max(Comparator.comparingInt(BaselineBlueprint::version));
        }

        @Override
        public Optional<BaselineBlueprint> findVersion(UUID id, int version) {
            return values.stream().filter(value -> value.blueprintId().equals(id)
                    && value.version() == version).findFirst();
        }

        @Override
        public Optional<BaselineBlueprint> findByRequest(UUID actorId, String key) {
            return values.stream().filter(value -> value.createdBy().equals(actorId)
                    && value.idempotencyKey().equals(key)).findFirst();
        }

        @Override
        public void insert(BaselineBlueprint value) {
            values.add(value);
        }
    }

    private static final class FakeValidation implements BaselineBlueprintValidationPort {
        private final List<CatalogRole> roles = List.of(
                catalogRole("role-a", "Backend Engineer"),
                catalogRole("role-b", "Platform Engineer"));
        private int available = 20;
        private String requestedOrganization;

        @Override
        public Optional<CatalogRole> findAvailableRole(String organizationId, String roleId) {
            return Optional.empty();
        }

        @Override
        public Optional<CatalogOccupation> findAvailableOccupation(String organizationId, String occupationId) {
            requestedOrganization = organizationId;
            String name = OCCUPATION.equals(occupationId) ? "Software Engineering" : "Data Engineering";
            return Optional.of(new CatalogOccupation(occupationId, name, roles));
        }

        @Override
        public Map<CoverageKey, Integer> findPublishedCoverage(Set<String> skillIds) {
            return Map.of(
                    new CoverageKey(SHARED_SKILL, Difficulty.EASY), available,
                    new CoverageKey(SHARED_SKILL, Difficulty.MEDIUM), 20,
                    new CoverageKey(SHARED_SKILL, Difficulty.HARD), 20);
        }

        private static CatalogRole catalogRole(String id, String name) {
            return new CatalogRole(id, name, List.of(new CatalogSkill(SHARED_SKILL, "Shared Engineering")));
        }
    }
}
