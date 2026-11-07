package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.PrerequisiteEdge;
import com.adaptlearngraph.entities.domain.RoleGraphSkill;
import com.adaptlearngraph.entities.domain.SkillStatus;
import com.adaptlearngraph.entities.domain.TargetRoleGraph;
import org.neo4j.driver.Record;
import org.neo4j.driver.types.Node;
import org.neo4j.driver.types.Relationship;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionOperations;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

public class Neo4jTargetRoleGraphAdapter implements TargetRoleGraphPort {
    private final Neo4jClient client;
    private final TransactionOperations reads;

    public Neo4jTargetRoleGraphAdapter(Neo4jClient client, PlatformTransactionManager transactions) {
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.reads = Neo4jCatalogTransactions.autoCommitReads(transactions);
    }

    // Neo4jClient: rows carry graph nodes and relationship properties that are mapped field by field with legacy defaults.
    private Collection<Record> rows(String cypher, Map<String, Object> parameters) {
        return client.query(cypher).bindAll(parameters).fetchAs(Record.class).mappedBy((types, record) -> record).all();
    }

    @Override
    public Optional<TargetRoleGraph> findTargetRoleGraph(String organizationId, String roleId) {
        String roleCypher = """
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId
                  AND (r.id = $roleId OR r.code = $roleId)
                RETURN r
                """;

        String skillsCypher = """
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId
                  AND (r.id = $roleId OR r.code = $roleId)
                MATCH (r)-[req:REQUIRES_SKILL]->(s:MicroSkill)
                WHERE s.organizationId = $organizationId AND req.status = 'ACTIVE'
                  AND (req.organizationId IS NULL OR req.organizationId = $organizationId)
                RETURN s, req
                ORDER BY coalesce(s.code, s.id) ASC
                """;

        String prereqCypher = """
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId
                  AND (r.id = $roleId OR r.code = $roleId)
                MATCH (r)-[first:REQUIRES_SKILL]->(s1:MicroSkill {organizationId:$organizationId})
                MATCH (r)-[second:REQUIRES_SKILL]->(s2:MicroSkill {organizationId:$organizationId})
                MATCH (s1)-[rel:HAS_SKILL_PREREQUISITE]->(s2)
                WHERE first.status='ACTIVE' AND second.status='ACTIVE' AND rel.status='ACTIVE'
                    AND (rel.organizationId IS NULL OR rel.organizationId=$organizationId)
                RETURN DISTINCT s1, s2, rel
                ORDER BY coalesce(s1.code, s1.id) ASC, coalesce(s2.code, s2.id) ASC
                """;

        Map<String, Object> parameters = Map.of("organizationId", organizationId, "roleId", roleId);
        // One read-only transaction for the role, its required skills and their prerequisites.
        return reads.execute(transaction -> {
            var roleResult = rows(roleCypher, parameters).iterator();
            if (!roleResult.hasNext()) {
                return Optional.<TargetRoleGraph>empty();
            }
            Node roleNode = roleResult.next().get("r").asNode();
            String id = roleNode.get("id").asString();
            String rawCode = roleNode.get("code").asString();
            String code = rawCode != null && rawCode.contains("#") ? rawCode.split("#")[0].trim() : rawCode;
            String name = roleNode.get("name").asString();
            String track = roleNode.containsKey("track") && !roleNode.get("track").isNull()
                    ? roleNode.get("track").asString()
                    : "PROFESSIONAL";
            String status = roleNode.containsKey("status") && !roleNode.get("status").isNull()
                    ? roleNode.get("status").asString()
                    : "ACTIVE";

            var skillsResult = rows(skillsCypher, parameters).iterator();
            List<RoleGraphSkill> requiredSkills = new ArrayList<>();
            Set<String> skillIds = new HashSet<>();
            while (skillsResult.hasNext()) {
                var record = skillsResult.next();
                Node skillNode = record.get("s").asNode();
                Relationship reqRel = record.get("req").asRelationship();

                String sId = skillNode.containsKey("id") && !skillNode.get("id").isNull() ? skillNode.get("id").asString() : "";
                String sCode = skillNode.containsKey("code") && !skillNode.get("code").isNull() ? skillNode.get("code").asString() : sId;
                String sName = skillNode.containsKey("name") && !skillNode.get("name").isNull() ? skillNode.get("name").asString() : sCode;
                var knowledge=reqRel.get("requiredKnowledgeLevels").isNull()?List.<String>of():reqRel.get("requiredKnowledgeLevels").asList(org.neo4j.driver.Value::asString);
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
                        knowledge,
                        SkillStatus.fromString(reqStatus),
                        skillLevel));
            }

            var prereqResult = rows(prereqCypher, parameters).iterator();
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
                        updatedAt,
                        rel.get("dependentKnowledgeLevel").isNull()?null:com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf(rel.get("dependentKnowledgeLevel").asString()),
                        rel.get("prerequisiteKnowledgeLevel").isNull()?null:com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf(rel.get("prerequisiteKnowledgeLevel").asString())));
            }

            return Optional.of(new TargetRoleGraph(
                    id,
                    code,
                    name,
                    track,
                    status,
                    requiredSkills,
                    prerequisites));
        });
    }
}
