package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.port.out.CompetencyRepository;
import com.adaptlearngraph.catalog.domain.CompetencyRecord;
import com.adaptlearngraph.catalog.domain.CompetencyRecord.MemberSkill;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class Neo4jCompetencyRepository implements CompetencyRepository {
    private final Driver driver;

    public Neo4jCompetencyRepository(Driver driver) {
        this.driver = Objects.requireNonNull(driver, "Driver cannot be null");
    }

    @Override
    public List<CompetencyRecord> findAllCompetencies(String organizationId, String search) {
        String cypher = """
                MATCH (c:Competency)
                WHERE c.organizationId = $organizationId
                  AND ($search IS NULL OR $search = ''
                   OR toLower(c.name) CONTAINS toLower($search)
                   OR toLower(c.id) CONTAINS toLower($search)
                   OR toLower(coalesce(c.code, '')) CONTAINS toLower($search)
                   OR toLower(coalesce(c.description, '')) CONTAINS toLower($search))
                OPTIONAL MATCH (l:Level)-[:HAS_COMPETENCY]->(c)
                OPTIONAL MATCH (r:TargetRole)-[:HAS_LEVEL]->(l)
                OPTIONAL MATCH (c)-[:HAS_SKILL]->(s:MicroSkill)
                WITH c, l, r, collect(DISTINCT CASE WHEN s IS NOT NULL THEN {id: s.id, code: coalesce(s.code, s.id), name: s.name} END) AS skills
                RETURN c.id AS id,
                       coalesce(c.code, c.id) AS code,
                       c.name AS name,
                       coalesce(c.description, '') AS description,
                       coalesce(c.attainmentRule, 'ALL_MEMBER_SKILLS_AT_OWNING_LEVEL') AS attainmentRule,
                       coalesce(c.status, 'ACTIVE') AS status,
                       coalesce(c.version, '0.11.0') AS version,
                       l.id AS levelId,
                       coalesce(l.name, '') AS levelName,
                       coalesce(r.name, '') AS roleName,
                       skills
                ORDER BY coalesce(c.code, c.name) ASC
                """;

        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of(
                    "organizationId", organizationId != null ? organizationId : "",
                    "search", search != null ? search.trim() : ""));
            List<CompetencyRecord> competencies = new ArrayList<>();
            while (result.hasNext()) {
                competencies.add(mapRecord(result.next()));
            }
            return competencies;
        }
    }

    @Override
    public Optional<CompetencyRecord> findById(String organizationId, String id) {
        String cypher = """
                MATCH (c:Competency {id: $id})
                WHERE c.organizationId = $organizationId
                OPTIONAL MATCH (l:Level)-[:HAS_COMPETENCY]->(c)
                OPTIONAL MATCH (r:TargetRole)-[:HAS_LEVEL]->(l)
                OPTIONAL MATCH (c)-[:HAS_SKILL]->(s:MicroSkill)
                WITH c, l, r, collect(DISTINCT CASE WHEN s IS NOT NULL THEN {id: s.id, code: coalesce(s.code, s.id), name: s.name} END) AS skills
                RETURN c.id AS id,
                       coalesce(c.code, c.id) AS code,
                       c.name AS name,
                       coalesce(c.description, '') AS description,
                       coalesce(c.attainmentRule, 'ALL_MEMBER_SKILLS_AT_OWNING_LEVEL') AS attainmentRule,
                       coalesce(c.status, 'ACTIVE') AS status,
                       coalesce(c.version, '0.11.0') AS version,
                       l.id AS levelId,
                       coalesce(l.name, '') AS levelName,
                       coalesce(r.name, '') AS roleName,
                       skills
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of(
                    "organizationId", organizationId != null ? organizationId : "",
                    "id", id));
            if (result.hasNext()) {
                return Optional.of(mapRecord(result.next()));
            }
            return Optional.empty();
        }
    }

    @Override
    public CompetencyRecord save(String organizationId, CompetencyRecord record, List<String> skillIds, String levelId) {
        String mergeCypher = """
                MERGE (c:Competency {id: $id})
                ON CREATE SET c.organizationId = $organizationId,
                              c.code = $code,
                              c.name = $name,
                              c.description = $description,
                              c.attainmentRule = $attainmentRule,
                              c.status = $status,
                              c.version = $version,
                              c.reviewStatus = 'APPROVED'
                ON MATCH SET c.code = $code,
                             c.name = $name,
                             c.description = $description,
                             c.attainmentRule = $attainmentRule,
                             c.status = $status
                """;

        Map<String, Object> params = new HashMap<>();
        params.put("id", record.id());
        params.put("organizationId", organizationId != null ? organizationId : "");
        params.put("code", record.code());
        params.put("name", record.name());
        params.put("description", record.description());
        params.put("attainmentRule", record.attainmentRule());
        params.put("status", record.status());
        params.put("version", record.version());

        try (var session = driver.session()) {
            session.run(mergeCypher, params).consume();

            // Link to Level if provided
            if (levelId != null && !levelId.isBlank()) {
                String linkLevelCypher = """
                        MATCH (l:Level {id: $levelId}), (c:Competency {id: $compId})
                        MERGE (l)-[r:HAS_COMPETENCY]->(c)
                        ON CREATE SET r.status = 'ACTIVE', r.version = '0.11.0'
                        """;
                session.run(linkLevelCypher, Map.of("levelId", levelId, "compId", record.id())).consume();
            }

            // Sync HAS_SKILL relationships
            if (skillIds != null) {
                if (skillIds.isEmpty()) {
                    String deleteAllSkills = """
                            MATCH (c:Competency {id: $id})-[r:HAS_SKILL]->(:MicroSkill)
                            DELETE r
                            """;
                    session.run(deleteAllSkills, Map.of("id", record.id())).consume();
                } else {
                    String deleteOldSkills = """
                            MATCH (c:Competency {id: $id})-[r:HAS_SKILL]->(s:MicroSkill)
                            WHERE NOT (s.id IN $skillIds OR coalesce(s.code, '') IN $skillIds)
                            DELETE r
                            """;
                    session.run(deleteOldSkills, Map.of("id", record.id(), "skillIds", skillIds)).consume();

                    String linkSkills = """
                            UNWIND $skillIds AS sid
                            MATCH (c:Competency {id: $id})
                            MATCH (s:MicroSkill) WHERE s.id = sid OR coalesce(s.code, '') = sid
                            WITH DISTINCT c, s
                            MERGE (c)-[r:HAS_SKILL]->(s)
                            ON CREATE SET r.status = 'ACTIVE', r.version = '0.11.0'
                            """;
                    session.run(linkSkills, Map.of("id", record.id(), "skillIds", skillIds)).consume();
                }
            }

            return findById(organizationId, record.id()).orElse(record);
        }
    }

    @Override
    public void deleteById(String organizationId, String id) {
        String cypher = """
                MATCH (c:Competency {id: $id})
                WHERE c.organizationId = $organizationId
                DETACH DELETE c
                """;
        try (var session = driver.session()) {
            session.run(cypher, Map.of(
                    "organizationId", organizationId != null ? organizationId : "",
                    "id", id)).consume();
        }
    }

    private CompetencyRecord mapRecord(Record record) {
        List<MemberSkill> skills = new ArrayList<>();
        var rawSkills = record.get("skills").asList();
        for (var obj : rawSkills) {
            if (obj instanceof Map<?, ?> map) {
                String sId = Objects.toString(map.get("id"), "");
                String sCode = Objects.toString(map.get("code"), "");
                String sName = Objects.toString(map.get("name"), "");
                if (!sId.isBlank() || !sCode.isBlank()) {
                    skills.add(new MemberSkill(sId, sCode, sName));
                }
            }
        }

        String code = record.containsKey("code") && !record.get("code").isNull()
                ? record.get("code").asString()
                : record.get("id").asString();

        return new CompetencyRecord(
                record.get("id").asString(),
                code,
                record.get("name").asString(),
                record.get("description").asString(),
                record.get("attainmentRule").asString(),
                record.get("status").asString(),
                record.get("version").asString(),
                record.containsKey("levelId") && !record.get("levelId").isNull() ? record.get("levelId").asString() : null,
                record.get("levelName").asString(),
                record.get("roleName").asString(),
                skills
        );
    }
}
