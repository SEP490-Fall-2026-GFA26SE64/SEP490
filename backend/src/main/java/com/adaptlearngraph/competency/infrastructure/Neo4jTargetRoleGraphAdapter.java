package com.adaptlearngraph.competency.infrastructure;

import com.adaptlearngraph.competency.application.port.out.TargetRoleGraphPort;
import com.adaptlearngraph.competency.domain.PrerequisiteEdge;
import com.adaptlearngraph.competency.domain.RoleGraphSkill;
import com.adaptlearngraph.competency.domain.SkillStatus;
import com.adaptlearngraph.competency.domain.TargetRoleGraph;
import org.neo4j.driver.Driver;
import org.neo4j.driver.types.Node;
import org.neo4j.driver.types.Relationship;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

public class Neo4jTargetRoleGraphAdapter implements TargetRoleGraphPort {
    private final Driver driver;

    public Neo4jTargetRoleGraphAdapter(Driver driver) {
        this.driver = Objects.requireNonNull(driver, "Driver cannot be null");
    }

    @Override
    public Optional<TargetRoleGraph> findTargetRoleGraph(String organizationId, String roleId) {
        String roleCypher = """
                MATCH (r:TargetRole)
                WHERE (r.organizationId = $organizationId OR r.organizationId IS NULL)
                  AND (r.id = $roleId OR r.code = $roleId)
                RETURN r
                """;

        String skillsCypher = """
                MATCH (r:TargetRole)
                WHERE (r.organizationId = $organizationId OR r.organizationId IS NULL)
                  AND (r.id = $roleId OR r.code = $roleId)
                MATCH (r)-[req:REQUIRES_SKILL]->(s:MicroSkill)
                OPTIONAL MATCH (macro:MacroCompetency)-[:HAS_SKILL]->(s)
                RETURN s, req, coalesce(macro.code, s.macroCompetencyCode, 'KNOWLEDGE') AS macroCode
                ORDER BY s.code ASC
                """;

        String prereqCypher = """
                MATCH (r:TargetRole)
                WHERE (r.organizationId = $organizationId OR r.organizationId IS NULL)
                  AND (r.id = $roleId OR r.code = $roleId)
                MATCH (r)-[:REQUIRES_SKILL]->(s1:MicroSkill)
                MATCH (r)-[:REQUIRES_SKILL]->(s2:MicroSkill)
                MATCH (s1)-[rel:PREREQUISITE_OF]->(s2)
                RETURN s1, s2, rel
                ORDER BY s1.code ASC, s2.code ASC
                """;

        try (var session = driver.session()) {
            var roleResult = session.run(roleCypher, Map.of("organizationId", organizationId, "roleId", roleId));
            if (!roleResult.hasNext()) {
                return Optional.empty();
            }
            Node roleNode = roleResult.next().get("r").asNode();
            String id = roleNode.get("id").asString();
            String code = roleNode.get("code").asString();
            String name = roleNode.get("name").asString();
            String track = roleNode.containsKey("track") && !roleNode.get("track").isNull()
                    ? roleNode.get("track").asString()
                    : "PROFESSIONAL";
            String seniority = roleNode.containsKey("seniority") && !roleNode.get("seniority").isNull()
                    ? roleNode.get("seniority").asString()
                    : "P3";
            String status = roleNode.containsKey("status") && !roleNode.get("status").isNull()
                    ? roleNode.get("status").asString()
                    : "ACTIVE";

            var skillsResult = session.run(skillsCypher, Map.of("organizationId", organizationId, "roleId", roleId));
            List<RoleGraphSkill> requiredSkills = new ArrayList<>();
            Set<String> skillIds = new HashSet<>();
            while (skillsResult.hasNext()) {
                var record = skillsResult.next();
                Node skillNode = record.get("s").asNode();
                Relationship reqRel = record.get("req").asRelationship();
                String macroCode = record.get("macroCode").asString();

                String sId = skillNode.containsKey("id") && !skillNode.get("id").isNull() ? skillNode.get("id").asString() : "";
                String sCode = skillNode.get("code").asString();
                String sName = skillNode.get("name").asString();
                double targetMastery = reqRel.containsKey("targetMastery") && !reqRel.get("targetMastery").isNull()
                        ? reqRel.get("targetMastery").asDouble()
                        : 0.70;
                String reqStatus = reqRel.containsKey("status") && !reqRel.get("status").isNull()
                        ? reqRel.get("status").asString()
                        : "ACTIVE";

                skillIds.add(sId);
                requiredSkills.add(new RoleGraphSkill(
                        sId,
                        sCode,
                        sName,
                        macroCode,
                        targetMastery,
                        SkillStatus.fromString(reqStatus)));
            }

            var prereqResult = session.run(prereqCypher, Map.of("organizationId", organizationId, "roleId", roleId));
            List<PrerequisiteEdge> prerequisites = new ArrayList<>();
            while (prereqResult.hasNext()) {
                var record = prereqResult.next();
                Node s1 = record.get("s1").asNode();
                Node s2 = record.get("s2").asNode();
                Relationship rel = record.get("rel").asRelationship();

                String s1Id = s1.containsKey("id") && !s1.get("id").isNull() ? s1.get("id").asString() : "";
                String s1Code = s1.get("code").asString();
                String s1Name = s1.get("name").asString();

                String s2Id = s2.containsKey("id") && !s2.get("id").isNull() ? s2.get("id").asString() : "";
                String s2Code = s2.get("code").asString();
                String s2Name = s2.get("name").asString();

                double minMastery = rel.containsKey("minMastery") && !rel.get("minMastery").isNull()
                        ? rel.get("minMastery").asDouble()
                        : 0.60;
                String relStatus = rel.containsKey("status") && !rel.get("status").isNull()
                        ? rel.get("status").asString()
                        : "ACTIVE";

                Instant createdAt = rel.containsKey("createdAt") && !rel.get("createdAt").isNull()
                        ? rel.get("createdAt").asZonedDateTime().toInstant()
                        : Instant.now();
                Instant updatedAt = rel.containsKey("updatedAt") && !rel.get("updatedAt").isNull()
                        ? rel.get("updatedAt").asZonedDateTime().toInstant()
                        : Instant.now();

                prerequisites.add(new PrerequisiteEdge(
                        s1Id,
                        s1Code,
                        s1Name,
                        s2Id,
                        s2Code,
                        s2Name,
                        minMastery,
                        SkillStatus.fromString(relStatus),
                        createdAt,
                        updatedAt));
            }

            return Optional.of(new TargetRoleGraph(
                    id,
                    code,
                    name,
                    track,
                    seniority,
                    status,
                    requiredSkills,
                    prerequisites));
        }
    }
}
