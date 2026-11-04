package com.adaptlearngraph.services;

import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase.Code;
import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase.Failure;
import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase.JobPositionDetail;
import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase.JobPositionSummary;
import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase.RoleDetail;
import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase.SkillDetail;
import com.adaptlearngraph.repository.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.repository.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort.DependencyUnavailable;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

public final class BaselineJobPositionCatalogService implements BaselineJobPositionCatalogUseCase {
    private final ActorPort actors;
    private final BaselineJobPositionCatalogPort catalog;

    public BaselineJobPositionCatalogService(ActorPort actors, BaselineJobPositionCatalogPort catalog) {
        this.actors = Objects.requireNonNull(actors, "actors must not be null");
        this.catalog = Objects.requireNonNull(catalog, "catalog must not be null");
    }

    @Override
    public List<JobPositionSummary> listAvailableJobPositions() {
        Actor actor = requireActor();
        try {
            return catalog.findAvailableJobPositions(actor.organizationId()).stream()
                    .map(jobPosition -> new JobPositionSummary(
                            jobPosition.id(), jobPosition.name(), jobPosition.version(), jobPosition.roleCount()))
                    .sorted(Comparator.comparing(JobPositionSummary::name).thenComparing(JobPositionSummary::id))
                    .toList();
        } catch (DependencyUnavailable failure) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, failure.getMessage());
        }
    }

    @Override
    public JobPositionDetail getAvailableJobPosition(String jobPositionId) {
        Actor actor = requireActor();
        String id = requireText(jobPositionId, "jobPositionId");
        try {
            return catalog.findAvailableJobPosition(actor.organizationId(), id)
                    .map(jobPosition -> new JobPositionDetail(
                            jobPosition.id(), jobPosition.name(), jobPosition.version(), jobPosition.roles().stream()
                                    .map(role -> new RoleDetail(
                                            role.id(), role.name(), role.version(), role.skills().stream()
                                                    .map(skill -> new SkillDetail(
                                                            skill.id(), skill.name(), skill.version()))
                                                    .toList()))
                                    .toList()))
                    .orElseThrow(() -> new Failure(Code.NOT_FOUND, "JobPosition is unavailable"));
        } catch (DependencyUnavailable failure) {
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

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
