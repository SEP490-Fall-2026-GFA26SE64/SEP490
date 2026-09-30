package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleRepository;
import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.types.Node;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class Neo4jTargetRoleRepository implements TargetRoleRepository {
    private final Driver driver;

    public Neo4jTargetRoleRepository(Driver driver) {
        this.driver = Objects.requireNonNull(driver, "Driver cannot be null");
    }

    @Override
    public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
        String cypher = """
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId AND r.code = $code
                RETURN count(r) > 0 AS exists
                """;
        try (var session = driver.session()) {
            return session.run(cypher, Map.of("organizationId", organizationId, "code", code))
                    .single()
                    .get("exists")
                    .asBoolean();
        }
    }

    @Override
    public boolean existsByOrganizationIdAndCodeAndVersion(String organizationId, String code, String version) {
        String cypher = """
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId AND r.code = $code AND coalesce(r.version, '1.0') = $version
                RETURN count(r) > 0 AS exists
                """;
        try (var session = driver.session()) {
            return session.run(cypher, Map.of(
                    "organizationId", organizationId,
                    "code", code,
                    "version", (version != null && !version.isBlank()) ? version.trim() : "1.0"))
                    .single()
                    .get("exists")
                    .asBoolean();
        }
    }

    @Override
    public TargetRole save(TargetRole targetRole) {
        String cypher = """
                MERGE (r:TargetRole {id: $id})
                ON CREATE SET
                    r.organizationId = $organizationId,
                    r.code = $code,
                    r.name = $name,
                    r.domainCode = $domainCode,
                    r.familyCode = $familyCode,
                    r.track = $track,
                    r.assignedExpertId = $assignedExpertId,
                    r.description = $description,
                    r.status = $status,
                    r.version = $version,
                    r.skillTargets = $skillTargets,
                    r.createdAt = datetime($createdAt),
                    r.updatedAt = datetime($updatedAt)
                ON MATCH SET
                    r.name = $name,
                    r.domainCode = $domainCode,
                    r.familyCode = $familyCode,
                    r.track = $track,
                    r.assignedExpertId = $assignedExpertId,
                    r.description = $description,
                    r.status = $status,
                    r.version = $version,
                    r.skillTargets = $skillTargets,
                    r.updatedAt = datetime($updatedAt)
                RETURN r
                """;

        Map<String, Object> params = new HashMap<>();
        params.put("id", targetRole.getId().toString());
        params.put("organizationId", targetRole.getOrganizationId());
        params.put("code", targetRole.getCode());
        params.put("name", targetRole.getName());
        params.put("domainCode", targetRole.getDomainCode());
        params.put("familyCode", targetRole.getFamilyCode());
        params.put("track", targetRole.getTrack().name());
        params.put("assignedExpertId", targetRole.getAssignedExpertId());
        params.put("description", targetRole.getDescription());
        params.put("status", targetRole.getStatus().name());
        params.put("version", targetRole.getVersion());
        params.put("skillTargets", targetRole.getSkillTargets());
        params.put("createdAt", targetRole.getCreatedAt().toString());
        params.put("updatedAt", targetRole.getUpdatedAt().toString());
        params.put("status", targetRole.getStatus().name());
        params.put("createdAt", targetRole.getCreatedAt().toString());
        params.put("updatedAt", targetRole.getUpdatedAt().toString());

        try (var session = driver.session()) {
            session.run(cypher, params).consume();
            return targetRole;
        }

    }

    @Override
    public List<TargetRole> findByOrganizationId(String organizationId, TargetRoleFilter filter) {
        StringBuilder cypher = new StringBuilder("""
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId
                """);
        Map<String, Object> params = new HashMap<>();
        params.put("organizationId", organizationId);

        if (filter.track() != null) {
            cypher.append(" AND r.track = $track");
            params.put("track", filter.track().name());
        }
        if (filter.status() != null) {
            cypher.append(" AND r.status = $status");
            params.put("status", filter.status().name());
        }
        if (filter.domainCode() != null && !filter.domainCode().isBlank()) {
            cypher.append(" AND r.domainCode = $domainCode");
            params.put("domainCode", filter.domainCode().trim().toUpperCase());
        }
        if (filter.assignedExpertId() != null && !filter.assignedExpertId().isBlank()) {
            cypher.append(" AND r.assignedExpertId = $assignedExpertId");
            params.put("assignedExpertId", filter.assignedExpertId().trim());
        }
        if (filter.search() != null && !filter.search().isBlank()) {
            cypher.append(" AND (toLower(r.name) CONTAINS toLower($search) OR toLower(r.code) CONTAINS toLower($search))");
            params.put("search", filter.search().trim());
        }

        cypher.append(" RETURN r ORDER BY r.name ASC");

        try (var session = driver.session()) {
            var result = session.run(cypher.toString(), params);
            List<TargetRole> roles = new ArrayList<>();
            while (result.hasNext()) {
                Record record = result.next();
                roles.add(mapNodeToTargetRole(record.get("r").asNode()));
            }
            return roles;
        }
    }

    @Override
    public Optional<TargetRole> findById(String organizationId, TargetRoleId id) {
        String cypher = """
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId AND r.id = $id
                RETURN r
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("organizationId", organizationId, "id", id.toString()));
            if (result.hasNext()) {
                return Optional.of(mapNodeToTargetRole(result.next().get("r").asNode()));
            }
            return Optional.empty();
        }
    }

    @Override
    public Optional<TargetRole> findByCode(String organizationId, String code) {
        String cypher = """
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId AND r.code = $code
                RETURN r
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("organizationId", organizationId, "code", code));
            if (result.hasNext()) {
                return Optional.of(mapNodeToTargetRole(result.next().get("r").asNode()));
            }
            return Optional.empty();
        }
    }

    @Override
    public void deleteById(String organizationId, TargetRoleId id) {
        String cypher = """
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId AND r.id = $id
                DETACH DELETE r
                """;
        try (var session = driver.session()) {
            session.run(cypher, Map.of("organizationId", organizationId, "id", id.toString())).consume();
        }
    }

    private TargetRole mapNodeToTargetRole(Node node) {
        String idStr = node.get("id").asString();
        String orgId = node.get("organizationId").asString();
        String code = node.get("code").asString();
        String name = node.get("name").asString();
        String domainCode = node.containsKey("domainCode") && !node.get("domainCode").isNull()
                ? node.get("domainCode").asString()
                : "ICT";
        String familyCode = node.containsKey("familyCode") && !node.get("familyCode").isNull()
                ? node.get("familyCode").asString()
                : "JAVA_BACKEND";
        String trackStr = node.containsKey("track") && !node.get("track").isNull()
                ? node.get("track").asString()
                : "PROFESSIONAL";
        String assignedExpertId = node.containsKey("assignedExpertId") && !node.get("assignedExpertId").isNull()
                ? node.get("assignedExpertId").asString()
                : "";
        String desc = node.containsKey("description") && !node.get("description").isNull()
                ? node.get("description").asString()
                : "";
        String statusStr = node.containsKey("status") && !node.get("status").isNull()
                ? node.get("status").asString()
                : "DRAFT";

        Instant createdAt = node.containsKey("createdAt") && !node.get("createdAt").isNull()
                ? node.get("createdAt").asZonedDateTime().toInstant()
                : Instant.now();
        Instant updatedAt = node.containsKey("updatedAt") && !node.get("updatedAt").isNull()
                ? node.get("updatedAt").asZonedDateTime().toInstant()
                : Instant.now();

        String version = node.containsKey("version") && !node.get("version").isNull()
                ? node.get("version").asString()
                : "1.0";
        String skillTargets = node.containsKey("skillTargets") && !node.get("skillTargets").isNull()
                ? node.get("skillTargets").asString()
                : "[]";

        return new TargetRole(
                TargetRoleId.fromString(idStr),
                orgId,
                code,
                name,
                domainCode,
                familyCode,
                RoleTrack.fromString(trackStr),
                assignedExpertId,
                desc,
                RoleStatus.fromString(statusStr),
                version,
                skillTargets,
                createdAt,
                updatedAt);
    }
}

