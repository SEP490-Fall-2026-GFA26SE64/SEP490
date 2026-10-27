package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleRepository;
import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.Seniority;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.types.Node;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class Neo4jTargetRoleRepository implements TargetRoleRepository {
    private final Driver driver;
    private final ObjectMapper objectMapper;

    public Neo4jTargetRoleRepository(Driver driver) {
        this.driver = Objects.requireNonNull(driver, "Driver cannot be null");
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
        String cypher = """
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId AND (r.code = $code OR r.baseCode = $code)
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
                WHERE r.organizationId = $organizationId
                  AND (r.code = $code OR r.baseCode = $code)
                  AND coalesce(r.version, '1.0') = $version
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
        String rawCode = targetRole.getCode();
        String roleIdStr = targetRole.getId().toString();
        String version = (targetRole.getVersion() != null && !targetRole.getVersion().isBlank())
                ? targetRole.getVersion().trim()
                : "1.0";

        // Determine unique graph code to satisfy Neo4j's target_role_code constraint when versions or orgs differ
        String graphCode = resolveGraphCode(roleIdStr, targetRole.getOrganizationId(), rawCode, version);

        String cypher = """
                MERGE (r:TargetRole {id: $id})
                ON CREATE SET
                    r.organizationId = $organizationId,
                    r.code = $graphCode,
                    r.baseCode = $rawCode,
                    r.name = $name,
                    r.domainCode = $domainCode,
                    r.familyCode = $familyCode,
                    r.track = $track,
                    r.seniority = $seniority,
                    r.assignedExpertId = $assignedExpertId,
                    r.description = $description,
                    r.responsibilities = $responsibilities,
                    r.status = $status,
                    r.version = $version,
                    r.skillTargets = $skillTargets,
                    r.levels = $levels,
                    r.createdAt = datetime($createdAt),
                    r.updatedAt = datetime($updatedAt),
                    r.rejectionReason = $rejectionReason
                ON MATCH SET
                    r.code = $graphCode,
                    r.baseCode = $rawCode,
                    r.name = $name,
                    r.domainCode = $domainCode,
                    r.familyCode = $familyCode,
                    r.track = $track,
                    r.seniority = $seniority,
                    r.assignedExpertId = $assignedExpertId,
                    r.description = $description,
                    r.responsibilities = $responsibilities,
                    r.status = $status,
                    r.version = $version,
                    r.skillTargets = $skillTargets,
                    r.levels = $levels,
                    r.updatedAt = datetime($updatedAt),
                    r.rejectionReason = $rejectionReason
                WITH r
                WHERE $domainCode IS NOT NULL AND $domainCode <> ''
                MERGE (d:JobDomain {code: $domainCode})
                ON CREATE SET d.id = randomUUID(), d.name = $domainCode, d.status = 'ACTIVE', d.createdAt = datetime($updatedAt), d.updatedAt = datetime($updatedAt)
                MERGE (d)-[hr:HAS_ROLE]->(r)
                ON CREATE SET hr.status = 'ACTIVE', hr.createdAt = datetime($updatedAt), hr.updatedAt = datetime($updatedAt)
                ON MATCH SET hr.status = 'ACTIVE', hr.updatedAt = datetime($updatedAt)
                RETURN r
                """;

        Map<String, Object> params = new HashMap<>();
        params.put("id", roleIdStr);
        params.put("organizationId", targetRole.getOrganizationId());
        params.put("graphCode", graphCode);
        params.put("rawCode", rawCode);
        params.put("name", targetRole.getName());
        params.put("domainCode", targetRole.getDomainCode());
        params.put("familyCode", targetRole.getFamilyCode());
        params.put("track", targetRole.getTrack().name());
        params.put("seniority", targetRole.getSeniority() != null ? targetRole.getSeniority().name() : null);
        params.put("assignedExpertId", targetRole.getAssignedExpertId());
        params.put("description", targetRole.getDescription());
        params.put("responsibilities", targetRole.getResponsibilities() != null ? targetRole.getResponsibilities() : List.of());
        params.put("status", targetRole.getStatus().name());
        params.put("version", version);
        params.put("skillTargets", targetRole.getSkillTargets());
        params.put("levels", targetRole.getLevels());
        params.put("createdAt", targetRole.getCreatedAt().toString());
        params.put("updatedAt", targetRole.getUpdatedAt().toString());
        params.put("rejectionReason", targetRole.getRejectionReason());

        try (var session = driver.session()) {
            session.run(cypher, params).consume();

            // When publishing, override and supersede any previous version of this role
            if (targetRole.getStatus() == RoleStatus.PUBLISHED || targetRole.getStatus() == RoleStatus.ACTIVE) {
                String supersedeCypher = """
                        MATCH (old:TargetRole)
                        WHERE (old.organizationId = $organizationId OR old.organizationId IS NULL)
                          AND old.id <> $id
                          AND (toLower(old.name) = toLower($name) OR (old.baseCode IS NOT NULL AND old.baseCode = $rawCode) OR old.code = $rawCode OR old.code = $graphCode)
                        SET old.status = 'SUPERSEDED', old.updatedAt = datetime($updatedAt)
                        """;
                session.run(supersedeCypher, params).consume();
            }

            // Synchronize REQUIRES_SKILL graph edges
            syncSkillRelationships(session, roleIdStr, targetRole.getSkillTargets(), targetRole.getUpdatedAt());

            return targetRole;
        }
    }

    private String resolveGraphCode(String roleId, String orgId, String rawCode, String version) {
        String checkCypher = """
                MATCH (r:TargetRole)
                WHERE r.code = $code AND r.id <> $roleId
                RETURN count(r) AS count
                """;
        try (var session = driver.session()) {
            int collisionCount = session.run(checkCypher, Map.of("code", rawCode, "roleId", roleId))
                    .single()
                    .get("count")
                    .asInt();
            if (collisionCount == 0) {
                return rawCode;
            }
            // Code is already claimed by another node, append unique suffix for this version/tenant
            return rawCode + "#" + orgId + "#v" + version;
        }
    }

    private void syncSkillRelationships(org.neo4j.driver.Session session, String roleId, String skillTargetsJson, Instant updatedAt) {
        List<Map<String, Object>> skillItems = parseSkillTargetsJson(skillTargetsJson);
        List<String> activeCodes = new ArrayList<>();
        List<Map<String, Object>> processedSkills = new ArrayList<>();

        for (Map<String, Object> item : skillItems) {
            String code = Objects.toString(item.get("skillCode"), "").trim();
            if (!code.isBlank()) {
                activeCodes.add(code);
                Map<String, Object> skillData = new HashMap<>();
                skillData.put("skillCode", code);
                skillData.put("skillName", Objects.toString(item.get("skillName"), code));
                skillData.put("skillId", Objects.toString(item.get("skillId"), java.util.UUID.randomUUID().toString()));
                String level = Objects.toString(item.get("level"), "");
                skillData.put("level", level);
                Number threshold = 70;
                if (item.get("threshold") instanceof Number n) {
                    threshold = n;
                }
                skillData.put("threshold", threshold.intValue());
                processedSkills.add(skillData);
            }
        }

        // 1. Delete existing REQUIRES_SKILL edges for this role to prevent stale or duplicate edges
        String deleteOldRelCypher = """
                MATCH (r:TargetRole {id: $roleId})-[oldRel:REQUIRES_SKILL]->()
                DELETE oldRel
                """;
        session.run(deleteOldRelCypher, Map.of("roleId", roleId)).consume();

        // 2. Merge current REQUIRES_SKILL edges distinguishing per-level assignments
        if (!processedSkills.isEmpty()) {
            String mergeRelCypher = """
                    UNWIND $skills AS item
                    MATCH (r:TargetRole {id: $roleId})
                    MATCH (s:MicroSkill)
                    WHERE s.id = item.skillId OR s.code = item.skillCode OR s.id = item.skillCode
                    MERGE (r)-[req:REQUIRES_SKILL {level: item.level}]->(s)
                    ON CREATE SET req.createdAt = datetime($updatedAt)
                    SET req.targetMastery = toFloat(item.threshold) / 100.0,
                        req.status = 'ACTIVE',
                        req.updatedAt = datetime($updatedAt)
                    """;
            session.run(mergeRelCypher, Map.of(
                    "roleId", roleId,
                    "skills", processedSkills,
                    "updatedAt", updatedAt.toString()
            )).consume();
        }
    }

    @Override
    public List<TargetRole> findByOrganizationId(String organizationId, TargetRoleFilter filter) {
        StringBuilder cypher = new StringBuilder("""
                MATCH (r:TargetRole)
                WHERE (r.organizationId = $organizationId OR r.organizationId IS NULL)
                  AND coalesce(r.status, 'ACTIVE') <> 'SUPERSEDED'
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
            cypher.append(" AND (toLower(r.name) CONTAINS toLower($search) OR toLower(r.code) CONTAINS toLower($search) OR (r.baseCode IS NOT NULL AND toLower(r.baseCode) CONTAINS toLower($search)))");
            params.put("search", filter.search().trim());
        }

        cypher.append("""
                 OPTIONAL MATCH (r)-[req:REQUIRES_SKILL]->(s:MicroSkill)
                 WITH r, collect(CASE WHEN s IS NOT NULL THEN {
                     skillId: s.id,
                     skillCode: s.code,
                     skillName: s.name,
                     threshold: toInteger(round(coalesce(req.targetMastery, 0.0) * 100)),
                     level: coalesce(req.level, '')
                 } END) AS graphSkills
                 RETURN r, graphSkills ORDER BY coalesce(r.updatedAt, r.createdAt) DESC, r.name ASC
                """);

        try (var session = driver.session()) {
            var result = session.run(cypher.toString(), params);
            List<TargetRole> roles = new ArrayList<>();
            while (result.hasNext()) {
                Record record = result.next();
                roles.add(mapRecordToTargetRole(record));
            }
            return roles;
        }
    }

    @Override
    public Optional<TargetRole> findById(String organizationId, TargetRoleId id) {
        String cypher = """
                MATCH (r:TargetRole)
                WHERE (r.organizationId = $organizationId OR r.organizationId IS NULL)
                  AND (r.id = $id OR r.code = $id)
                  AND coalesce(r.status, 'ACTIVE') <> 'SUPERSEDED'
                OPTIONAL MATCH (r)-[req:REQUIRES_SKILL]->(s:MicroSkill)
                WITH r, collect(CASE WHEN s IS NOT NULL THEN {
                    skillId: s.id,
                    skillCode: s.code,
                    skillName: s.name,
                    threshold: toInteger(round(coalesce(req.targetMastery, 0.0) * 100)),
                    level: coalesce(req.level, '')
                } END) AS graphSkills
                RETURN r, graphSkills
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("organizationId", organizationId, "id", id.toString()));
            if (result.hasNext()) {
                return Optional.of(mapRecordToTargetRole(result.next()));
            }
            return Optional.empty();
        }
    }

    @Override
    public Optional<TargetRole> findByCode(String organizationId, String code) {
        String cypher = """
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId AND (r.code = $code OR r.baseCode = $code)
                OPTIONAL MATCH (r)-[req:REQUIRES_SKILL]->(s:MicroSkill)
                WITH r, collect(CASE WHEN s IS NOT NULL THEN {
                    skillId: s.id,
                    skillCode: s.code,
                    skillName: s.name,
                    threshold: toInteger(round(coalesce(req.targetMastery, 0.0) * 100)),
                    level: coalesce(req.level, '')
                } END) AS graphSkills
                RETURN r, graphSkills
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("organizationId", organizationId, "code", code));
            if (result.hasNext()) {
                return Optional.of(mapRecordToTargetRole(result.next()));
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

    private TargetRole mapRecordToTargetRole(Record record) {
        Node node = record.get("r").asNode();
        List<Object> rawGraphSkills = record.get("graphSkills").asList();
        List<Map<String, Object>> graphSkills = new ArrayList<>();
        for (Object item : rawGraphSkills) {
            if (item instanceof Map<?, ?> m) {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = (Map<String, Object>) m;
                graphSkills.add(map);
            }
        }
        return mapNodeToTargetRole(node, graphSkills);
    }

    private TargetRole mapNodeToTargetRole(Node node, List<Map<String, Object>> graphSkills) {
        String idStr = node.containsKey("id") && !node.get("id").isNull()
                ? node.get("id").asString()
                : (node.containsKey("code") && !node.get("code").isNull() ? node.get("code").asString() : java.util.UUID.randomUUID().toString());
        String orgId = node.containsKey("organizationId") && !node.get("organizationId").isNull()
                ? node.get("organizationId").asString()
                : "comp-technova";
        String code = node.containsKey("baseCode") && !node.get("baseCode").isNull()
                ? node.get("baseCode").asString()
                : (node.containsKey("code") && !node.get("code").isNull() ? node.get("code").asString() : idStr);
        // Strip synthetic unique suffix if present
        if (code.contains("#")) {
            code = code.substring(0, code.indexOf("#"));
        }

        String name = node.containsKey("name") && !node.get("name").isNull()
                ? node.get("name").asString()
                : (node.containsKey("title") && !node.get("title").isNull() ? node.get("title").asString() : code);
        String domainCode = node.containsKey("domainCode") && !node.get("domainCode").isNull()
                ? node.get("domainCode").asString()
                : "ICT";
        String familyCode = node.containsKey("familyCode") && !node.get("familyCode").isNull()
                ? node.get("familyCode").asString()
                : "SOFTWARE_ENGINEERING";
        String trackStr = node.containsKey("track") && !node.get("track").isNull()
                ? node.get("track").asString()
                : "PROFESSIONAL";
        Seniority seniority = node.containsKey("seniority") && !node.get("seniority").isNull()
                ? Seniority.fromString(node.get("seniority").asString())
                : null;
        String assignedExpertId = node.containsKey("assignedExpertId") && !node.get("assignedExpertId").isNull()
                ? node.get("assignedExpertId").asString()
                : "";
        String desc = node.containsKey("description") && !node.get("description").isNull()
                ? node.get("description").asString()
                : (node.containsKey("scope") && !node.get("scope").isNull() ? node.get("scope").asString() : "");
        List<String> responsibilities = node.containsKey("responsibilities") && !node.get("responsibilities").isNull()
                ? node.get("responsibilities").asList(org.neo4j.driver.Value::asString)
                : List.of();
        String statusStr = node.containsKey("status") && !node.get("status").isNull()
                ? node.get("status").asString()
                : "ACTIVE";

        Instant baseline = Instant.parse("2026-01-01T00:00:00Z");
        Instant createdAt = baseline;
        if (node.containsKey("createdAt") && !node.get("createdAt").isNull()) {
            try {
                createdAt = node.get("createdAt").asZonedDateTime().toInstant();
            } catch (Exception e) {
                try {
                    createdAt = Instant.parse(node.get("createdAt").asString());
                } catch (Exception ignored) {}
            }
        }
        Instant updatedAt = createdAt;
        if (node.containsKey("updatedAt") && !node.get("updatedAt").isNull()) {
            try {
                updatedAt = node.get("updatedAt").asZonedDateTime().toInstant();
            } catch (Exception e) {
                try {
                    updatedAt = Instant.parse(node.get("updatedAt").asString());
                } catch (Exception ignored) {}
            }
        }

        String version = node.containsKey("version") && !node.get("version").isNull()
                ? node.get("version").asString()
                : "1.0";

        String rejectionReason = node.containsKey("rejectionReason") && !node.get("rejectionReason").isNull()
                ? node.get("rejectionReason").asString()
                : null;

        String skillTargets = node.containsKey("skillTargets") && !node.get("skillTargets").isNull()
                ? node.get("skillTargets").asString().trim()
                : "";

        // Only fall back to graphSkills if node.skillTargets property is empty or missing
        if (skillTargets.isBlank() || skillTargets.equals("[]")) {
            if (graphSkills != null && !graphSkills.isEmpty()) {
                try {
                    skillTargets = objectMapper.writeValueAsString(graphSkills);
                } catch (Exception ignored) {
                    skillTargets = "[]";
                }
            } else {
                skillTargets = "[]";
            }
        }

        List<String> levels = node.containsKey("levels") && !node.get("levels").isNull()
                ? node.get("levels").asList(org.neo4j.driver.Value::asString)
                : List.of("Junior", "Middle", "Senior");

        return new TargetRole(
                TargetRoleId.fromString(idStr),
                orgId,
                code,
                name,
                domainCode,
                familyCode,
                RoleTrack.fromString(trackStr),
                seniority,
                assignedExpertId,
                desc,
                responsibilities,
                RoleStatus.fromString(statusStr),
                version,
                skillTargets,
                createdAt,
                updatedAt,
                rejectionReason,
                levels);
    }

    private List<Map<String, Object>> parseSkillTargetsJson(String json) {
        if (json == null || json.isBlank() || json.trim().equals("[]")) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
