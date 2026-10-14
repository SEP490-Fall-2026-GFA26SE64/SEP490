package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CatalogRole;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CatalogSkill;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CoverageKey;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.DependencyUnavailable;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.Difficulty;
import com.adaptlearngraph.catalog.application.TargetRoleQueryException;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

final class BaselineBlueprintValidationAdapter implements BaselineBlueprintValidationPort {
    private final TargetRoleCatalogPort catalog;
    private final NamedParameterJdbcTemplate jdbc;

    BaselineBlueprintValidationAdapter(TargetRoleCatalogPort catalog, NamedParameterJdbcTemplate jdbc) {
        this.catalog = catalog;
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
