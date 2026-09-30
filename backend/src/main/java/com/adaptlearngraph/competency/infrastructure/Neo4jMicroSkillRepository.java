package com.adaptlearngraph.competency.infrastructure;

import com.adaptlearngraph.competency.application.port.out.MicroSkillRepository;
import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillId;
import com.adaptlearngraph.competency.domain.SkillStatus;
import org.neo4j.driver.Driver;
import org.neo4j.driver.types.Node;

import java.time.Instant;
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
                WHERE s.organizationId = $organizationId AND s.code = $code
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
                MATCH (s:MicroSkill)
                WHERE s.organizationId = $organizationId AND s.id = $id
                RETURN s
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("organizationId", organizationId, "id", id.toString()));
            if (result.hasNext()) {
                return Optional.of(mapNodeToMicroSkill(result.next().get("s").asNode()));
            }
            return Optional.empty();
        }
    }

    @Override
    public Optional<MicroSkill> findByCode(String organizationId, String code) {
        String cypher = """
                MATCH (s:MicroSkill)
                WHERE s.organizationId = $organizationId AND s.code = $code
                RETURN s
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("organizationId", organizationId, "code", code));
            if (result.hasNext()) {
                return Optional.of(mapNodeToMicroSkill(result.next().get("s").asNode()));
            }
            return Optional.empty();
        }
    }

    private MicroSkill mapNodeToMicroSkill(Node node) {
        String idStr = node.get("id").asString();
        String orgId = node.get("organizationId").asString();
        String code = node.get("code").asString();
        String name = node.get("name").asString();
        String desc = node.containsKey("description") && !node.get("description").isNull()
                ? node.get("description").asString()
                : "";
        String macroCode = node.containsKey("macroCompetencyCode") && !node.get("macroCompetencyCode").isNull()
                ? node.get("macroCompetencyCode").asString()
                : "KNOWLEDGE";
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
