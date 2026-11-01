package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.BaselineBlueprintValidationPort.CatalogOccupation;
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
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

public final class BaselineBlueprintValidationAdapter implements BaselineBlueprintValidationPort {
    private final TargetRoleCatalogPort catalog;
    private final BaselineOccupationCatalogPort occupationCatalog;
    private final NamedParameterJdbcTemplate jdbc;

    public BaselineBlueprintValidationAdapter(TargetRoleCatalogPort catalog, NamedParameterJdbcTemplate jdbc) {
        this(catalog, null, jdbc);
    }

    public BaselineBlueprintValidationAdapter(
            TargetRoleCatalogPort catalog,
            BaselineOccupationCatalogPort occupationCatalog,
            NamedParameterJdbcTemplate jdbc) {
        this.catalog = catalog;
        this.occupationCatalog = occupationCatalog;
        this.jdbc = jdbc;
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
    public Optional<CatalogOccupation> findAvailableOccupation(
            String organizationId, String occupationId) {
        if (occupationCatalog == null) {
            throw new DependencyUnavailable("Occupation catalog is not enabled");
        }
        try {
            return occupationCatalog.findAvailableOccupation(organizationId, occupationId)
                    .map(occupation -> new CatalogOccupation(
                            occupation.id(), occupation.name(), occupation.roles().stream()
                                    .map(role -> new CatalogRole(
                                            role.id(), role.name(), role.skills().stream()
                                                    .map(skill -> new CatalogSkill(skill.id(), skill.name()))
                                                    .toList()))
                                    .toList()));
        } catch (BaselineOccupationCatalogPort.DependencyUnavailable failure) {
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
            jdbc.query("""
                    WITH latest_published AS (
                        SELECT DISTINCT ON (item_id) item_id, micro_skill_id, difficulty
                        FROM platform.item_version
                        WHERE publication_state = 'PUBLISHED'
                          AND micro_skill_id IN (:skillIds)
                        ORDER BY item_id, version DESC, item_version_id DESC
                    )
                    SELECT micro_skill_id, difficulty, count(*) AS available_count
                    FROM latest_published
                    GROUP BY micro_skill_id, difficulty
                    """, new MapSqlParameterSource("skillIds", microSkillIds), result -> {
                CoverageKey key = new CoverageKey(
                        result.getString("micro_skill_id"), Difficulty.valueOf(result.getString("difficulty")));
                coverage.put(key, Math.toIntExact(result.getLong("available_count")));
            });
            return Map.copyOf(coverage);
        } catch (DataAccessException failure) {
            throw new DependencyUnavailable("Question coverage is unavailable", failure);
        }
    }
}
