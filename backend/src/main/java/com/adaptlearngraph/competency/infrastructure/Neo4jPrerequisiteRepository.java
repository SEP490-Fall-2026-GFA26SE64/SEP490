package com.adaptlearngraph.competency.infrastructure;

import com.adaptlearngraph.competency.application.port.out.PrerequisiteRepository;
import com.adaptlearngraph.competency.domain.PrerequisiteEdge;
import com.adaptlearngraph.competency.domain.SkillStatus;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.types.Node;
import org.neo4j.driver.types.Relationship;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class Neo4jPrerequisiteRepository implements PrerequisiteRepository {
    private final Driver driver;

    public Neo4jPrerequisiteRepository(Driver driver) {
        this.driver = Objects.requireNonNull(driver, "Driver cannot be null");
    }

    @Override
    public List<PrerequisiteEdge> findAll(String organizationId) {
        String cypher = """
                MATCH (source:MicroSkill)-[rel:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(target:MicroSkill)
                WHERE (source.organizationId = $organizationId OR source.organizationId IS NULL)
                RETURN source, target, rel
                ORDER BY coalesce(source.code, source.id) ASC, coalesce(target.code, target.id) ASC
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("organizationId", organizationId));
            List<PrerequisiteEdge> edges = new ArrayList<>();
            while (result.hasNext()) {
                edges.add(mapRecordToEdge(result.next()));
            }
            return edges;
        }
    }

    @Override
    public List<PrerequisiteEdge> findForRole(String organizationId, String roleId) {
        String cypher = """
                MATCH (role:TargetRole)
                WHERE (role.id = $roleId OR role.code = $roleId)
                MATCH (role)-[:REQUIRES_SKILL]->(source:MicroSkill)
                MATCH (role)-[:REQUIRES_SKILL]->(target:MicroSkill)
                MATCH (source)-[rel:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(target)
                RETURN source, target, rel
                ORDER BY coalesce(source.code, source.id) ASC, coalesce(target.code, target.id) ASC
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("roleId", roleId));
            List<PrerequisiteEdge> edges = new ArrayList<>();
            while (result.hasNext()) {
                edges.add(mapRecordToEdge(result.next()));
            }
            return edges;
        }
    }

    @Override
    public boolean hasPath(String organizationId, String fromSkillId, String toSkillId) {
        String cypher = """
                MATCH (source:MicroSkill), (target:MicroSkill)
                WHERE (source.id = $fromSkillId OR source.code = $fromSkillId)
                  AND (target.id = $toSkillId OR target.code = $toSkillId)
                MATCH p = (source)-[:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF*1..25]->(target)
                RETURN count(p) > 0 AS hasPath
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("fromSkillId", fromSkillId, "toSkillId", toSkillId));
            if (result.hasNext()) {
                return result.next().get("hasPath").asBoolean();
            }
            return false;
        }
    }

    @Override
    public PrerequisiteEdge savePrerequisite(
            String organizationId,
            String sourceSkillId,
            String targetSkillId,
            double minMastery,
            SkillStatus status) {
        String cypher = """
                MATCH (source:MicroSkill), (target:MicroSkill)
                WHERE (source.id = $sourceSkillId OR source.code = $sourceSkillId)
                  AND (target.id = $targetSkillId OR target.code = $targetSkillId)
                MERGE (source)-[rel:PREREQUISITE_OF]->(target)
                ON CREATE SET
                    rel.minMastery = $minMastery,
                    rel.status = $status,
                    rel.createdAt = datetime(),
                    rel.updatedAt = datetime()
                ON MATCH SET
                    rel.minMastery = $minMastery,
                    rel.status = $status,
                    rel.updatedAt = datetime()
                RETURN source, target, rel
                """;
        Map<String, Object> params = Map.of(
                "sourceSkillId", sourceSkillId,
                "targetSkillId", targetSkillId,
                "minMastery", minMastery,
                "status", status != null ? status.name() : "ACTIVE");

        try (var session = driver.session()) {
            var result = session.run(cypher, params);
            if (result.hasNext()) {
                return mapRecordToEdge(result.next());
            }
            throw new IllegalArgumentException("Source or target micro-skill not found for ids: " + sourceSkillId + ", " + targetSkillId);
        }
    }

    @Override
    public void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId) {
        String cypher = """
                MATCH (source:MicroSkill)-[rel:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(target:MicroSkill)
                WHERE (source.id = $sourceSkillId OR source.code = $sourceSkillId)
                  AND (target.id = $targetSkillId OR target.code = $targetSkillId)
                DELETE rel
                """;
        try (var session = driver.session()) {
            session.run(cypher, Map.of("sourceSkillId", sourceSkillId, "targetSkillId", targetSkillId)).consume();
        }
    }

    private PrerequisiteEdge mapRecordToEdge(Record record) {
        Node source = record.get("source").asNode();
        Node target = record.get("target").asNode();
        Relationship rel = record.get("rel").asRelationship();

        String sourceId = source.containsKey("id") && !source.get("id").isNull() ? source.get("id").asString() : "";
        String sourceCode = source.containsKey("code") && !source.get("code").isNull() ? source.get("code").asString() : sourceId;
        String sourceName = source.containsKey("name") && !source.get("name").isNull() ? source.get("name").asString() : sourceId;

        String targetId = target.containsKey("id") && !target.get("id").isNull() ? target.get("id").asString() : "";
        String targetCode = target.containsKey("code") && !target.get("code").isNull() ? target.get("code").asString() : targetId;
        String targetName = target.containsKey("name") && !target.get("name").isNull() ? target.get("name").asString() : targetId;

        double minMastery = rel.containsKey("requiredScore") && !rel.get("requiredScore").isNull()
                ? rel.get("requiredScore").asDouble()
                : (rel.containsKey("minMastery") && !rel.get("minMastery").isNull()
                        ? rel.get("minMastery").asDouble()
                        : 0.60);
        String statusStr = rel.containsKey("status") && !rel.get("status").isNull()
                ? rel.get("status").asString()
                : "ACTIVE";

        Instant createdAt = Instant.now();
        if (rel.containsKey("createdAt") && !rel.get("createdAt").isNull()) {
            try {
                createdAt = rel.get("createdAt").asZonedDateTime().toInstant();
            } catch (Exception ignored) {}
        }
        Instant updatedAt = Instant.now();
        if (rel.containsKey("updatedAt") && !rel.get("updatedAt").isNull()) {
            try {
                updatedAt = rel.get("updatedAt").asZonedDateTime().toInstant();
            } catch (Exception ignored) {}
        }

        return new PrerequisiteEdge(
                sourceId,
                sourceCode,
                sourceName,
                targetId,
                targetCode,
                targetName,
                minMastery,
                SkillStatus.fromString(statusStr),
                createdAt,
                updatedAt);
    }
}
