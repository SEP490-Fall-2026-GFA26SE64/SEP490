package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.port.out.LearningModuleRepository;
import com.adaptlearngraph.catalog.domain.LearningModuleRecord;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Value;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class Neo4jLearningModuleRepository implements LearningModuleRepository {
    private final Driver driver;

    public Neo4jLearningModuleRepository(Driver driver) {
        this.driver = Objects.requireNonNull(driver, "Driver cannot be null");
    }

    @Override
    public List<LearningModuleRecord> findAll(String organizationId) {
        String cypher = """
                MATCH (m:LearningModule)
                WHERE (m.organizationId = $organizationId OR m.organizationId IS NULL)
                OPTIONAL MATCH (m)-[:TEACHES]->(s:MicroSkill)
                RETURN m.id AS id,
                       coalesce(m.title, m.name, m.id) AS title,
                       coalesce(m.moduleType, 'LESSON_AND_PRACTICE') AS moduleType,
                       coalesce(m.contentUri, '') AS contentUri,
                       coalesce(m.contentType, 'text/markdown') AS contentType,
                       coalesce(m.contentVersion, '1.0') AS contentVersion,
                       coalesce(m.version, '0.9.0') AS version,
                       coalesce(m.status, 'ACTIVE') AS status,
                       coalesce(m.reviewStatus, 'NEEDS_EXPERT_REVIEW') AS reviewStatus,
                       coalesce(m.durationMinutes, 45) AS durationMinutes,
                       collect(DISTINCT s.id) AS teachesSkillIds,
                       collect(DISTINCT coalesce(s.name, s.id)) AS teachesSkillNames
                ORDER BY m.id ASC
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("organizationId", organizationId != null ? organizationId : ""));
            List<LearningModuleRecord> list = new ArrayList<>();
            while (result.hasNext()) {
                list.add(mapRecordToModule(result.next()));
            }
            return list;
        }
    }

    @Override
    public Optional<LearningModuleRecord> findById(String organizationId, String id) {
        String cypher = """
                MATCH (m:LearningModule {id: $id})
                WHERE (m.organizationId = $organizationId OR m.organizationId IS NULL)
                OPTIONAL MATCH (m)-[:TEACHES]->(s:MicroSkill)
                RETURN m.id AS id,
                       coalesce(m.title, m.name, m.id) AS title,
                       coalesce(m.moduleType, 'LESSON_AND_PRACTICE') AS moduleType,
                       coalesce(m.contentUri, '') AS contentUri,
                       coalesce(m.contentType, 'text/markdown') AS contentType,
                       coalesce(m.contentVersion, '1.0') AS contentVersion,
                       coalesce(m.version, '0.9.0') AS version,
                       coalesce(m.status, 'ACTIVE') AS status,
                       coalesce(m.reviewStatus, 'NEEDS_EXPERT_REVIEW') AS reviewStatus,
                       coalesce(m.durationMinutes, 45) AS durationMinutes,
                       collect(DISTINCT s.id) AS teachesSkillIds,
                       collect(DISTINCT coalesce(s.name, s.id)) AS teachesSkillNames
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, Map.of("id", id, "organizationId", organizationId != null ? organizationId : ""));
            if (result.hasNext()) {
                return Optional.of(mapRecordToModule(result.next()));
            }
            return Optional.empty();
        }
    }

    @Override
    public LearningModuleRecord save(String organizationId, LearningModuleRecord m) {
        String cypher = """
                MERGE (mod:LearningModule {id: $id})
                ON CREATE SET
                    mod.organizationId = $organizationId,
                    mod.title = $title,
                    mod.moduleType = $moduleType,
                    mod.contentUri = $contentUri,
                    mod.contentType = $contentType,
                    mod.contentVersion = $contentVersion,
                    mod.version = $version,
                    mod.status = $status,
                    mod.reviewStatus = $reviewStatus,
                    mod.durationMinutes = $durationMinutes
                ON MATCH SET
                    mod.title = $title,
                    mod.moduleType = $moduleType,
                    mod.contentUri = $contentUri,
                    mod.contentType = $contentType,
                    mod.contentVersion = $contentVersion,
                    mod.version = $version,
                    mod.status = $status,
                    mod.reviewStatus = $reviewStatus,
                    mod.durationMinutes = $durationMinutes
                WITH mod
                OPTIONAL MATCH (mod)-[oldRel:TEACHES]->(:MicroSkill)
                DELETE oldRel
                WITH mod
                UNWIND $teachesSkillIds AS skillId
                MATCH (s:MicroSkill {id: skillId})
                MERGE (mod)-[:TEACHES]->(s)
                RETURN mod.id AS id
                """;
        Map<String, Object> params = new java.util.HashMap<>();
        params.put("id", m.id());
        params.put("organizationId", organizationId != null ? organizationId : "");
        params.put("title", m.title() != null ? m.title() : m.id());
        params.put("moduleType", m.moduleType() != null ? m.moduleType() : "LESSON_AND_PRACTICE");
        params.put("contentUri", m.contentUri() != null ? m.contentUri() : "");
        params.put("contentType", m.contentType() != null ? m.contentType() : "text/markdown");
        params.put("contentVersion", m.contentVersion() != null ? m.contentVersion() : "1.0");
        params.put("version", m.version() != null ? m.version() : "0.9.0");
        params.put("status", m.status() != null ? m.status() : "ACTIVE");
        params.put("reviewStatus", m.reviewStatus() != null ? m.reviewStatus() : "NEEDS_EXPERT_REVIEW");
        params.put("durationMinutes", m.durationMinutes() > 0 ? m.durationMinutes() : 45);
        params.put("teachesSkillIds", m.teachesSkillIds() != null ? m.teachesSkillIds() : List.of());

        try (var session = driver.session()) {
            session.run(cypher, params).consume();
            return m;
        }
    }

    @Override
    public void delete(String organizationId, String id) {
        String cypher = """
                MATCH (m:LearningModule {id: $id})
                DETACH DELETE m
                """;
        try (var session = driver.session()) {
            session.run(cypher, Map.of("id", id)).consume();
        }
    }

    private LearningModuleRecord mapRecordToModule(Record record) {
        String id = record.get("id").asString();
        String title = record.get("title").asString();
        String moduleType = record.get("moduleType").asString();
        String contentUri = record.get("contentUri").asString();
        String contentType = record.get("contentType").asString();
        String contentVersion = record.get("contentVersion").asString();
        String version = record.get("version").asString();
        String status = record.get("status").asString();
        String reviewStatus = record.get("reviewStatus").asString();
        int duration = record.get("durationMinutes").asInt();

        List<String> teachesSkillIds = record.get("teachesSkillIds").asList(Value::asString);
        List<String> teachesSkillNames = record.get("teachesSkillNames").asList(Value::asString);

        return new LearningModuleRecord(
                id,
                id,
                title,
                moduleType,
                contentUri,
                contentType,
                contentVersion,
                version,
                status,
                reviewStatus,
                duration,
                teachesSkillIds,
                teachesSkillNames
        );
    }
}
