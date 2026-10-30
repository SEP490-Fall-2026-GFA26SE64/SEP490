package com.adaptlearngraph.assessment.application;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase.CapacityDetail;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase.RoleCapacity;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase.SkillCapacity;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CoverageKey;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.Difficulty;
import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort.CatalogOccupation;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public final class BaselineBlueprintCapacityService implements BaselineBlueprintCapacityUseCase {
    private final ActorPort actors;
    private final BaselineOccupationCatalogPort catalog;
    private final BaselineBlueprintValidationPort validation;
    private final Clock clock;

    public BaselineBlueprintCapacityService(
            ActorPort actors,
            BaselineOccupationCatalogPort catalog,
            BaselineBlueprintValidationPort validation) {
        this(actors, catalog, validation, Clock.systemUTC());
    }

    public BaselineBlueprintCapacityService(
            ActorPort actors,
            BaselineOccupationCatalogPort catalog,
            BaselineBlueprintValidationPort validation,
            Clock clock) {
        this.actors = Objects.requireNonNull(actors, "actors must not be null");
        this.catalog = Objects.requireNonNull(catalog, "catalog must not be null");
        this.validation = Objects.requireNonNull(validation, "validation must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    @Override
    public CapacityDetail getAvailableCapacity(String occupationId) {
        Actor actor = requireActor();
        String id = requireText(occupationId, "occupationId");
        CatalogOccupation occupation = findOccupation(actor.organizationId(), id);
        Set<String> skillIds = occupation.roles().stream()
                .flatMap(role -> role.skills().stream())
                .map(BaselineOccupationCatalogPort.CatalogSkill::id)
                .collect(Collectors.toUnmodifiableSet());
        Map<CoverageKey, Integer> coverage = findCoverage(skillIds);

        return new CapacityDetail(
                occupation.id(),
                occupation.version(),
                Instant.now(clock),
                occupation.roles().stream()
                        .map(role -> new RoleCapacity(
                                role.id(),
                                role.skills().stream()
                                        .map(skill -> new SkillCapacity(
                                                skill.id(),
                                                available(coverage, skill.id(), Difficulty.EASY),
                                                available(coverage, skill.id(), Difficulty.MEDIUM),
                                                available(coverage, skill.id(), Difficulty.HARD)))
                                        .toList()))
                        .toList());
    }

    private CatalogOccupation findOccupation(String organizationId, String occupationId) {
        try {
            return catalog.findAvailableOccupation(organizationId, occupationId)
                    .orElseThrow(() -> new Failure(Code.NOT_FOUND, "Occupation is unavailable"));
        } catch (BaselineOccupationCatalogPort.DependencyUnavailable failure) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, failure.getMessage());
        }
    }

    private Map<CoverageKey, Integer> findCoverage(Set<String> skillIds) {
        try {
            return Map.copyOf(validation.findPublishedCoverage(skillIds));
        } catch (BaselineBlueprintValidationPort.DependencyUnavailable failure) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, failure.getMessage());
        }
    }

    private Actor requireActor() {
        Actor actor = actors.currentActor()
                .orElseThrow(() -> new Failure(Code.UNAUTHENTICATED, "Authentication is required"));
        if (!actor.isActiveLdManager()) {
            throw new Failure(Code.FORBIDDEN, "Active L&D Manager role is required");
        }
        return actor;
    }

    private static int available(
            Map<CoverageKey, Integer> coverage, String microSkillId, Difficulty difficulty) {
        return coverage.getOrDefault(new CoverageKey(microSkillId, difficulty), 0);
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
