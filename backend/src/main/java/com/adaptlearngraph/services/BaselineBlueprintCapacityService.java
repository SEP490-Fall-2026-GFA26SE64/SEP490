package com.adaptlearngraph.services;

import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase.CapacityDetail;
import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase.Code;
import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase.Failure;
import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase.RoleCapacity;
import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase.SkillCapacity;
import com.adaptlearngraph.repository.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.repository.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.CoverageKey;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.Difficulty;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort.CatalogJobPosition;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public final class BaselineBlueprintCapacityService implements BaselineBlueprintCapacityUseCase {
    private final ActorPort actors;
    private final BaselineJobPositionCatalogPort catalog;
    private final BaselineBlueprintValidationPort validation;
    private final Clock clock;

    public BaselineBlueprintCapacityService(
            ActorPort actors,
            BaselineJobPositionCatalogPort catalog,
            BaselineBlueprintValidationPort validation) {
        this(actors, catalog, validation, Clock.systemUTC());
    }

    public BaselineBlueprintCapacityService(
            ActorPort actors,
            BaselineJobPositionCatalogPort catalog,
            BaselineBlueprintValidationPort validation,
            Clock clock) {
        this.actors = Objects.requireNonNull(actors, "actors must not be null");
        this.catalog = Objects.requireNonNull(catalog, "catalog must not be null");
        this.validation = Objects.requireNonNull(validation, "validation must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    @Override
    public CapacityDetail getAvailableCapacity(String jobPositionId) {
        Actor actor = requireActor();
        String id = requireText(jobPositionId, "jobPositionId");
        CatalogJobPosition jobPosition = findJobPosition(actor.organizationId(), id);
        Set<String> skillIds = jobPosition.roles().stream()
                .flatMap(role -> role.skills().stream())
                .map(BaselineJobPositionCatalogPort.CatalogSkill::id)
                .collect(Collectors.toUnmodifiableSet());
        Map<CoverageKey, Integer> coverage = findCoverage(skillIds);

        return new CapacityDetail(
                jobPosition.id(),
                jobPosition.version(),
                Instant.now(clock),
                jobPosition.roles().stream()
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

    private CatalogJobPosition findJobPosition(String organizationId, String jobPositionId) {
        try {
            return catalog.findAvailableJobPosition(organizationId, jobPositionId)
                    .orElseThrow(() -> new Failure(Code.NOT_FOUND, "JobPosition is unavailable"));
        } catch (BaselineJobPositionCatalogPort.DependencyUnavailable failure) {
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
