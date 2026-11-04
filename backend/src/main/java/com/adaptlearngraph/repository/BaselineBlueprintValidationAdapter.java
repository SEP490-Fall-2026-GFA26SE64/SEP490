package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.CatalogJobPosition;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.CatalogRole;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.CatalogSkill;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.CoverageKey;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.DependencyUnavailable;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.Difficulty;
import com.adaptlearngraph.exception.TargetRoleQueryException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.dao.DataAccessException;

public final class BaselineBlueprintValidationAdapter implements BaselineBlueprintValidationPort {
    private final TargetRoleCatalogPort catalog;
    private final BaselineJobPositionCatalogPort jobPositionCatalog;
    private final ItemVersionJpaRepository items;

    public BaselineBlueprintValidationAdapter(TargetRoleCatalogPort catalog, ItemVersionJpaRepository items) {
        this(catalog, null, items);
    }

    public BaselineBlueprintValidationAdapter(
            TargetRoleCatalogPort catalog,
            BaselineJobPositionCatalogPort jobPositionCatalog,
            ItemVersionJpaRepository items) {
        this.catalog = catalog;
        this.jobPositionCatalog = jobPositionCatalog;
        this.items = items;
    }

    @Override
    public Optional<CatalogRole> findAvailableRole(String organizationId, String roleId) {
        try {
            return catalog.findAvailableRole(organizationId, roleId).map(role -> new CatalogRole(
                    role.id(), role.name(), role.requirements().stream()
                            .map(requirement -> new CatalogSkill(requirement.skillId(), requirement.skillName()))
                            .toList()));
        } catch (TargetRoleQueryException failure) {
            throw new DependencyUnavailable("Target-role catalog is unavailable", failure);
        }
    }

    @Override
    public Optional<CatalogJobPosition> findAvailableJobPosition(
            String organizationId, String jobPositionId) {
        if (jobPositionCatalog == null) {
            throw new DependencyUnavailable("JobPosition catalog is not enabled");
        }
        try {
            return jobPositionCatalog.findAvailableJobPosition(organizationId, jobPositionId)
                    .map(jobPosition -> new CatalogJobPosition(
                            jobPosition.id(), jobPosition.name(), jobPosition.roles().stream()
                                    .map(role -> new CatalogRole(
                                            role.id(), role.name(), role.skills().stream()
                                                    .map(skill -> new CatalogSkill(skill.id(), skill.name()))
                                                    .toList()))
                                    .toList()));
        } catch (BaselineJobPositionCatalogPort.DependencyUnavailable failure) {
            throw new DependencyUnavailable(failure.getMessage(), failure);
        }
    }

    @Override
    public Map<CoverageKey, Integer> findPublishedCoverage(Set<String> microSkillIds) {
        if (microSkillIds.isEmpty()) {
            return Map.of();
        }
        try {
            Map<CoverageKey, Integer> coverage = new HashMap<>();
            for (Object[] row : items.publishedCoverage(microSkillIds)) {
                CoverageKey key = new CoverageKey((String) row[0], Difficulty.valueOf((String) row[1]));
                coverage.put(key, Math.toIntExact(((Number) row[2]).longValue()));
            }
            return Map.copyOf(coverage);
        } catch (DataAccessException failure) {
            throw new DependencyUnavailable("Question coverage is unavailable", failure);
        }
    }
}
