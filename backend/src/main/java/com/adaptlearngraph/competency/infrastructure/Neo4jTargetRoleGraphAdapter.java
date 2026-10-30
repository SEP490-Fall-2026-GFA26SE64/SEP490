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
                OPTIONAL MATCH (c:Competency)-[:HAS_SKILL]->(s)
                WITH s, req, collect(coalesce(c.code, c.id)) AS compCodes
                RETURN s, req, CASE WHEN size(compCodes) > 0 THEN head(compCodes) ELSE 'KNOWLEDGE' END AS macroCode
                ORDER BY coalesce(s.code, s.id) ASC
                """;

        String prereqCypher = """
                MATCH (r:TargetRole)
                WHERE (r.organizationId = $organizationId OR r.organizationId IS NULL)
                  AND (r.id = $roleId OR r.code = $roleId)
                MATCH (r)-[:REQUIRES_SKILL]->(s1:MicroSkill)
                MATCH (r)-[:REQUIRES_SKILL]->(s2:MicroSkill)
                MATCH (s1)-[rel:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(s2)
                RETURN s1, s2, rel
                ORDER BY coalesce(s1.code, s1.id) ASC, coalesce(s2.code, s2.id) ASC
                """;

        try (var session = driver.session()) {
            var roleResult = session.run(roleCypher, Map.of("organizationId", organizationId, "roleId", roleId));
            if (!roleResult.hasNext()) {
                return Optional.empty();
            }
            Node roleNode = roleResult.next().get("r").asNode();
            String id = roleNode.get("id").asString();
            String rawCode = roleNode.get("code").asString();
            String code = rawCode != null && rawCode.contains("#") ? rawCode.split("#")[0].trim() : rawCode;
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
                String sCode = skillNode.containsKey("code") && !skillNode.get("code").isNull() ? skillNode.get("code").asString() : sId;
                String sName = skillNode.containsKey("name") && !skillNode.get("name").isNull() ? skillNode.get("name").asString() : sCode;
                double targetMastery = reqRel.containsKey("targetMastery") && !reqRel.get("targetMastery").isNull()
                        ? reqRel.get("targetMastery").asDouble()
                        : 0.70;
                String reqStatus = reqRel.containsKey("status") && !reqRel.get("status").isNull()
                        ? reqRel.get("status").asString()
                        : "ACTIVE";
                String skillLevel = reqRel.containsKey("level") && !reqRel.get("level").isNull()
                        ? reqRel.get("level").asString()
                        : null;

                String dedupeKey = (sId.isBlank() ? sCode : sId) + ":" + (skillLevel != null ? skillLevel : "");
                if (!skillIds.add(dedupeKey)) {
                    continue;
                }
                requiredSkills.add(new RoleGraphSkill(
                        sId,
                        sCode,
                        sName,
                        macroCode,
                        targetMastery,
                        SkillStatus.fromString(reqStatus),
                        skillLevel));
            }

            var prereqResult = session.run(prereqCypher, Map.of("organizationId", organizationId, "roleId", roleId));
            List<PrerequisiteEdge> prerequisites = new ArrayList<>();
            while (prereqResult.hasNext()) {
                var record = prereqResult.next();
                Node s1 = record.get("s1").asNode();
                Node s2 = record.get("s2").asNode();
                Relationship rel = record.get("rel").asRelationship();

                String s1Id = s1.containsKey("id") && !s1.get("id").isNull() ? s1.get("id").asString() : "";
                String s1Code = s1.containsKey("code") && !s1.get("code").isNull() ? s1.get("code").asString() : s1Id;
                String s1Name = s1.containsKey("name") && !s1.get("name").isNull() ? s1.get("name").asString() : s1Code;

                String s2Id = s2.containsKey("id") && !s2.get("id").isNull() ? s2.get("id").asString() : "";
                String s2Code = s2.containsKey("code") && !s2.get("code").isNull() ? s2.get("code").asString() : s2Id;
                String s2Name = s2.containsKey("name") && !s2.get("name").isNull() ? s2.get("name").asString() : s2Code;

                double minMastery = rel.containsKey("requiredScore") && !rel.get("requiredScore").isNull() ? rel.get("requiredScore").asDouble() : (rel.containsKey("minMastery") && !rel.get("minMastery").isNull()
                        ? rel.get("minMastery").asDouble()
                        : 0.75);
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
