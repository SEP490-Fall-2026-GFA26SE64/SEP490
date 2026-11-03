package com.adaptlearngraph.repository;

import com.adaptlearngraph.exception.TargetRoleQueryException;
import com.adaptlearngraph.exception.TargetRoleQueryException.Code;
import com.adaptlearngraph.entities.domain.TargetRoleDetail;
import com.adaptlearngraph.entities.domain.TargetRoleSummary;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.neo4j.driver.exceptions.Neo4jException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.TransactionTemplate;

public final class Neo4jTargetRoleCatalogAdapter implements TargetRoleCatalogPort {
    private static final Logger LOGGER = LoggerFactory.getLogger(Neo4jTargetRoleCatalogAdapter.class);
    private static final String ROLE_PROJECTION = """
            role.id AS id,
            role.code AS code,
            role.name AS name,
            role.familyCode AS familyCode,
            role.track AS track,
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

    private final Neo4jClient client;
    private final TransactionTemplate reads;
    private final Neo4jTargetRoleMapper mapper;

    public Neo4jTargetRoleCatalogAdapter(Neo4jClient client, PlatformTransactionManager transactions) {
        this(client, transactions, new Neo4jTargetRoleMapper());
    }

    Neo4jTargetRoleCatalogAdapter(Neo4jClient client, PlatformTransactionManager transactions, Neo4jTargetRoleMapper mapper) {
        this.client = Objects.requireNonNull(client, "client must not be null");
        this.reads = Neo4jCatalogTransactions.readOnly(transactions);
        this.mapper = Objects.requireNonNull(mapper, "mapper must not be null");
    }

    @Override
    public List<TargetRoleSummary> findAvailableRoles(String organizationId, Criteria criteria) {
        Objects.requireNonNull(criteria, "criteria must not be null");
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("organizationId", requireText(organizationId, "organizationId"));
        parameters.put("search", criteria.normalizedSearch());

        try {
            // Neo4jClient: one aggregate statement for the list; rows the mapper rejects are skipped.
            return reads.execute(status -> client.query(LIST_QUERY).bindAll(parameters)
                    .fetchAs(Row.class).mappedBy((types, row) -> new Row(mapper.toSummary(row))).all())
                    .stream()
                    .map(Row::summary)
                    .flatMap(Optional::stream)
                    .toList();
        } catch (Neo4jException | DataAccessException | TransactionException exception) {
            LOGGER.warn("Failed to list available target roles", exception);
            throw catalogUnavailable(exception);
        }
    }

    @Override
    public Optional<TargetRoleDetail> findAvailableRole(String organizationId, String roleId) {
        Map<String, Object> parameters = Map.of(
                "organizationId", requireText(organizationId, "organizationId"),
                "roleId", requireText(roleId, "roleId"));
        try {
            List<Optional<TargetRoleDetail>> details = reads.execute(status -> client.query(DETAIL_QUERY).bindAll(parameters)
                    .fetchAs(Detail.class).mappedBy((types, row) -> new Detail(mapper.toDetail(row))).all())
                    .stream().map(Detail::detail).toList();
            return details.stream().findFirst().flatMap(detail -> detail);
        } catch (Neo4jException | DataAccessException | TransactionException exception) {
            LOGGER.warn("Failed to read available target-role detail", exception);
            throw catalogUnavailable(exception);
        }
    }

    private record Row(Optional<TargetRoleSummary> summary) {
    }

    private record Detail(Optional<TargetRoleDetail> detail) {
    }

    private static TargetRoleQueryException catalogUnavailable(RuntimeException cause) {
        return new TargetRoleQueryException(Code.CATALOG_UNAVAILABLE, "Target-role catalog is unavailable", cause);
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
