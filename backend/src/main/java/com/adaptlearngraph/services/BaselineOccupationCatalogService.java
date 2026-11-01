package com.adaptlearngraph.services;

import com.adaptlearngraph.services.BaselineOccupationCatalogUseCase.Code;
import com.adaptlearngraph.services.BaselineOccupationCatalogUseCase.Failure;
import com.adaptlearngraph.services.BaselineOccupationCatalogUseCase.OccupationDetail;
import com.adaptlearngraph.services.BaselineOccupationCatalogUseCase.OccupationSummary;
import com.adaptlearngraph.services.BaselineOccupationCatalogUseCase.RoleDetail;
import com.adaptlearngraph.services.BaselineOccupationCatalogUseCase.SkillDetail;
import com.adaptlearngraph.repository.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.repository.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.repository.BaselineOccupationCatalogPort;
import com.adaptlearngraph.repository.BaselineOccupationCatalogPort.DependencyUnavailable;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

public final class BaselineOccupationCatalogService implements BaselineOccupationCatalogUseCase {
    private final ActorPort actors;
    private final BaselineOccupationCatalogPort catalog;

    public BaselineOccupationCatalogService(ActorPort actors, BaselineOccupationCatalogPort catalog) {
        this.actors = Objects.requireNonNull(actors, "actors must not be null");
        this.catalog = Objects.requireNonNull(catalog, "catalog must not be null");
    }

    @Override
    public List<OccupationSummary> listAvailableOccupations() {
        Actor actor = requireActor();
        try {
            return catalog.findAvailableOccupations(actor.organizationId()).stream()
                    .map(occupation -> new OccupationSummary(
                            occupation.id(), occupation.name(), occupation.version(), occupation.roleCount()))
                    .sorted(Comparator.comparing(OccupationSummary::name).thenComparing(OccupationSummary::id))
                    .toList();
        } catch (DependencyUnavailable failure) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, failure.getMessage());
        }
    }

    @Override
    public OccupationDetail getAvailableOccupation(String occupationId) {
        Actor actor = requireActor();
        String id = requireText(occupationId, "occupationId");
        try {
            return catalog.findAvailableOccupation(actor.organizationId(), id)
                    .map(occupation -> new OccupationDetail(
                            occupation.id(), occupation.name(), occupation.version(), occupation.roles().stream()
                                    .map(role -> new RoleDetail(
                                            role.id(), role.name(), role.version(), role.skills().stream()
                                                    .map(skill -> new SkillDetail(
                                                            skill.id(), skill.name(), skill.version()))
                                                    .toList()))
                                    .toList()))
                    .orElseThrow(() -> new Failure(Code.NOT_FOUND, "Occupation is unavailable"));
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
