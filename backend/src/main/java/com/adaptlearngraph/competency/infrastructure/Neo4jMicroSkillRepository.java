package com.adaptlearngraph.competency.infrastructure;

import com.adaptlearngraph.competency.application.port.out.MicroSkillRepository;
import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillId;
import com.adaptlearngraph.competency.domain.SkillStatus;
import org.neo4j.driver.Driver;
import org.neo4j.driver.types.Node;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class Neo4jMicroSkillRepository implements MicroSkillRepository {
    private final Driver driver;

    public Neo4jMicroSkillRepository(Driver driver) {
        this.driver = Objects.requireNonNull(driver, "Driver cannot be null");
    }

    @Override
    public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
        String cypher = """
                MATCH (s:MicroSkill)
                WHERE (s.organizationId = $organizationId OR s.organizationId IS NULL) AND s.code = $code
                RETURN count(s) > 0 AS exists
                """;
        try (var session = driver.session()) {
            return session.run(cypher, Map.of("organizationId", organizationId, "code", code))
                    .single()
                    .get("exists")
                    .asBoolean();
        }
    }

    @Override
    public MicroSkill save(MicroSkill microSkill) {
        String cypher = """
                MERGE (s:MicroSkill {id: $id})
                ON CREATE SET
                    s.organizationId = $organizationId,
                    s.code = $code,
                    s.name = $name,
                    s.description = $description,
                    s.macroCompetencyCode = $macroCompetencyCode,
                    s.status = $status,
                    s.createdAt = datetime($createdAt),
                    s.updatedAt = datetime($updatedAt)
                ON MATCH SET
                    s.name = $name,
                    s.description = $description,
                    s.macroCompetencyCode = $macroCompetencyCode,
                    s.status = $status,
                    s.updatedAt = datetime($updatedAt)
                WITH s
                OPTIONAL MATCH (oldMacro:MacroCompetency)-[oldRel:HAS_SKILL]->(s)
                WHERE oldMacro.code <> $macroCompetencyCode
                DELETE oldRel
                WITH s
                MERGE (macro:MacroCompetency {code: $macroCompetencyCode})
                ON CREATE SET macro.id = randomUUID(), macro.name = $macroCompetencyCode,
                    macro.status = 'ACTIVE', macro.createdAt = datetime(), macro.updatedAt = datetime()
                MERGE (macro)-[rel:HAS_SKILL]->(s)
                ON CREATE SET rel.status = 'ACTIVE', rel.createdAt = datetime(), rel.updatedAt = datetime()
                RETURN s
                """;

        Map<String, Object> params = Map.of(
                "id", microSkill.getId().toString(),
                "organizationId", microSkill.getOrganizationId(),
                "code", microSkill.getCode(),
                "name", microSkill.getName(),
                "description", microSkill.getDescription(),
                "macroCompetencyCode", microSkill.getMacroCompetencyCode(),
                "status", microSkill.getStatus().name(),
                "createdAt", microSkill.getCreatedAt().toString(),
                "updatedAt", microSkill.getUpdatedAt().toString());

        try (var session = driver.session()) {
            session.run(cypher, params).consume();
            return microSkill;
        }
    }

    @Override
    public Optional<MicroSkill> findById(String organizationId, MicroSkillId id) {
        String cypher = """
                MATCH (s:MicroSkill {id: $id})
                WHERE s.organizationId = $organizationId OR s.organizationId IS NULL
                OPTIONAL MATCH (macro:MacroCompetency)-[:HAS_SKILL]->(s)
                RETURN s, coalesce(macro.code, s.macroCompetencyCode, 'KNOWLEDGE') AS macroCode
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("organizationId", organizationId, "id", id.toString()));
            if (result.hasNext()) {
                var record = result.next();
                Node node = record.get("s").asNode();
                String macroCode = record.get("macroCode").asString();
                return Optional.of(mapNodeToMicroSkill(node, organizationId, macroCode));
            }
            return Optional.empty();
        }
    }

    @Override
    public Optional<MicroSkill> findByCode(String organizationId, String code) {
        String cypher = """
                MATCH (s:MicroSkill)
                WHERE (s.organizationId = $organizationId OR s.organizationId IS NULL) AND s.code = $code
                OPTIONAL MATCH (macro:MacroCompetency)-[:HAS_SKILL]->(s)
                RETURN s, coalesce(macro.code, s.macroCompetencyCode, 'KNOWLEDGE') AS macroCode
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("organizationId", organizationId, "code", code));
            if (result.hasNext()) {
                var record = result.next();
                Node node = record.get("s").asNode();
                String macroCode = record.get("macroCode").asString();
                return Optional.of(mapNodeToMicroSkill(node, organizationId, macroCode));
            }
            return Optional.empty();
        }
    }

    @Override
    public List<MicroSkill> findAll(String organizationId) {
        return search(organizationId, null, null, null);
    }

    @Override
    public List<MicroSkill> search(String organizationId, String query, String macroCode, SkillStatus status) {
        StringBuilder cypher = new StringBuilder("""
                MATCH (s:MicroSkill)
                WHERE (s.organizationId = $organizationId OR s.organizationId IS NULL)
                """);

        Map<String, Object> params = new HashMap<>();
        params.put("organizationId", organizationId);

        if (query != null && !query.isBlank()) {
            cypher.append(" AND (toLower(s.name) CONTAINS toLower($query) OR toLower(s.code) CONTAINS toLower($query))");
            params.put("query", query.trim());
        }

        if (status != null) {
            cypher.append(" AND s.status = $status");
            params.put("status", status.name());
        }

        cypher.append("""
                OPTIONAL MATCH (macro:MacroCompetency)-[:HAS_SKILL]->(s)
                WITH s, collect(macro.code) AS macroCodes
                WITH s, coalesce(macroCodes[0], s.macroCompetencyCode, 'KNOWLEDGE') AS macroCode
                """);

        if (macroCode != null && !macroCode.isBlank()) {
            cypher.append(" WHERE macroCode = $macroCode");
            params.put("macroCode", macroCode.trim().toUpperCase());
        }

        cypher.append(" RETURN s, macroCode ORDER BY s.code ASC");

        try (var session = driver.session()) {
            var result = session.run(cypher.toString(), params);
            List<MicroSkill> list = new ArrayList<>();
            while (result.hasNext()) {
                var record = result.next();
                Node node = record.get("s").asNode();
                String resolvedMacro = record.get("macroCode").asString();
                list.add(mapNodeToMicroSkill(node, organizationId, resolvedMacro));
            }
            return list;
        }
    }

    @Override
    public int countDependencies(String organizationId, MicroSkillId id) {
        String cypher = """
                MATCH (s:MicroSkill {id: $id})
                OPTIONAL MATCH (role:TargetRole)-[r:REQUIRES_SKILL]->(s)
                OPTIONAL MATCH (s)-[p1:PREREQUISITE_OF]->()
                OPTIONAL MATCH ()-[p2:PREREQUISITE_OF]->(s)
                OPTIONAL MATCH (:LearningModule)-[t:TEACHES]->(s)
                RETURN count(r) + count(p1) + count(p2) + count(t) AS totalDeps
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("id", id.toString()));
            if (result.hasNext()) {
                return result.next().get("totalDeps").asInt();
            }
            return 0;
        }
    }

    @Override
    public void delete(String organizationId, MicroSkillId id) {
        String cypher = """
                MATCH (s:MicroSkill {id: $id})
                WHERE s.organizationId = $organizationId OR s.organizationId IS NULL
                DETACH DELETE s
                """;
        try (var session = driver.session()) {
            session.run(cypher, Map.of("organizationId", organizationId, "id", id.toString())).consume();
        }
    }

    private MicroSkill mapNodeToMicroSkill(Node node, String defaultOrgId, String explicitMacroCode) {
        String idStr = node.containsKey("id") && !node.get("id").isNull()
                ? node.get("id").asString()
                : java.util.UUID.randomUUID().toString();
        String orgId = node.containsKey("organizationId") && !node.get("organizationId").isNull()
                ? node.get("organizationId").asString()
                : defaultOrgId;
        String code = node.get("code").asString();
        String name = node.get("name").asString();
        String desc = node.containsKey("description") && !node.get("description").isNull()
                ? node.get("description").asString()
                : "";
        String macroCode = explicitMacroCode != null && !explicitMacroCode.isBlank()
                ? explicitMacroCode
                : (node.containsKey("macroCompetencyCode") && !node.get("macroCompetencyCode").isNull()
                        ? node.get("macroCompetencyCode").asString()
                        : "KNOWLEDGE");
        String statusStr = node.containsKey("status") && !node.get("status").isNull()
                ? node.get("status").asString()
                : "ACTIVE";

        Instant createdAt = node.containsKey("createdAt") && !node.get("createdAt").isNull()
                ? node.get("createdAt").asZonedDateTime().toInstant()
                : Instant.now();
        Instant updatedAt = node.containsKey("updatedAt") && !node.get("updatedAt").isNull()
                ? node.get("updatedAt").asZonedDateTime().toInstant()
                : Instant.now();

        return new MicroSkill(
                MicroSkillId.fromString(idStr),
                orgId,
                code,
                name,
                desc,
                macroCode,
                SkillStatus.fromString(statusStr),
                createdAt,
                updatedAt);
    }
}
