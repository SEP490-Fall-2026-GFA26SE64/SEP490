package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.TargetRoleQueryException;
import com.adaptlearngraph.catalog.application.TargetRoleQueryException.Code;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import com.adaptlearngraph.catalog.domain.TargetRoleDetail;
import com.adaptlearngraph.catalog.domain.TargetRoleSummary;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.exceptions.Neo4jException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class Neo4jTargetRoleCatalogAdapter implements TargetRoleCatalogPort {
    private static final Logger LOGGER = LoggerFactory.getLogger(Neo4jTargetRoleCatalogAdapter.class);
    private static final String ROLE_PROJECTION = """
            role.id AS id,
            role.code AS code,
            role.name AS name,
            role.familyCode AS familyCode,
            role.track AS track,
            role.seniority AS seniority,
            role.description AS description,
            role.responsibilities AS responsibilities,
            collect(DISTINCT CASE WHEN requirement IS NULL THEN null ELSE {
                skillId: skill.id,
                skillCode: skill.code,
                skillName: skill.name,
                targetMastery: requirement.targetMastery
            } END) AS requirements
            """;

    private static final String LIST_QUERY = """
            MATCH (role:TargetRole)
            WHERE role.organizationId = $organizationId
              AND role.status = 'ACTIVE'
              AND ($seniority IS NULL OR role.seniority = $seniority)
              AND ($search IS NULL OR toLower(trim(role.name)) CONTAINS $search)
            OPTIONAL MATCH (role)-[requirement:REQUIRES_SKILL]->(skill:MicroSkill)
            WHERE requirement.status = 'ACTIVE' AND skill.status = 'ACTIVE'
            RETURN
            """ + ROLE_PROJECTION;

    private static final String DETAIL_QUERY = """
            MATCH (role:TargetRole)
            WHERE role.organizationId = $organizationId
              AND role.id = $roleId
              AND role.status = 'ACTIVE'
            OPTIONAL MATCH (role)-[requirement:REQUIRES_SKILL]->(skill:MicroSkill)
            WHERE requirement.status = 'ACTIVE' AND skill.status = 'ACTIVE'
            RETURN
            """ + ROLE_PROJECTION;

    private final Driver driver;
    private final Neo4jTargetRoleMapper mapper;

    public Neo4jTargetRoleCatalogAdapter(Driver driver) {
        this(driver, new Neo4jTargetRoleMapper());
    }

    Neo4jTargetRoleCatalogAdapter(Driver driver, Neo4jTargetRoleMapper mapper) {
        this.driver = Objects.requireNonNull(driver, "driver must not be null");
        this.mapper = Objects.requireNonNull(mapper, "mapper must not be null");
    }

    @Override
    public List<TargetRoleSummary> findAvailableRoles(String organizationId, Criteria criteria) {
        Objects.requireNonNull(criteria, "criteria must not be null");
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("organizationId", requireText(organizationId, "organizationId"));
        parameters.put("search", criteria.normalizedSearch());
        parameters.put("seniority", criteria.seniority() == null ? null : criteria.seniority().name());

        try (var session = driver.session()) {
            return session.executeRead(transaction -> transaction.run(LIST_QUERY, parameters)
                    .list(mapper::toSummary))
                    .stream()
                    .flatMap(Optional::stream)
                    .toList();
        } catch (Neo4jException exception) {
            LOGGER.warn("Failed to list available target roles", exception);
            throw catalogUnavailable(exception);
        }
    }

    @Override
    public Optional<TargetRoleDetail> findAvailableRole(String organizationId, String roleId) {
        Map<String, Object> parameters = Map.of(
                "organizationId", requireText(organizationId, "organizationId"),
                "roleId", requireText(roleId, "roleId"));
        try (var session = driver.session()) {
            List<Record> records = session.executeRead(
                    transaction -> transaction.run(DETAIL_QUERY, parameters).list());
            return records.stream().findFirst().flatMap(mapper::toDetail);
        } catch (Neo4jException exception) {
            LOGGER.warn("Failed to read available target-role detail", exception);
            throw catalogUnavailable(exception);
        }
    }

    private static TargetRoleQueryException catalogUnavailable(Neo4jException cause) {
        return new TargetRoleQueryException(Code.CATALOG_UNAVAILABLE, "Target-role catalog is unavailable", cause);
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
