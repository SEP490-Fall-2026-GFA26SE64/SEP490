package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearningModuleRecord;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.neo4j.driver.Record;
import org.neo4j.driver.Value;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

public class Neo4jLearningModuleRepository implements LearningModuleRepository {
    // Neo4jClient: one statement per list; taught skills are collected per module and legacy defaults applied in Cypher.
    private static final String PROJECTION = """
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
    private static final String LIST = """
            MATCH (m:LearningModule)
            WHERE m.organizationId = $organizationId
            """ + PROJECTION + """
            ORDER BY m.id ASC
            """;
    private static final String DETAIL = """
            MATCH (m:LearningModule {id: $id})
            WHERE m.organizationId = $organizationId
            """ + PROJECTION;

    private final LearningModuleNodeRepository modules;
    private final Neo4jClient client;
    private final TransactionTemplate reads;
    private final TransactionTemplate writes;

    public Neo4jLearningModuleRepository(LearningModuleNodeRepository modules, Neo4jClient client,
            PlatformTransactionManager transactions) {
        this.modules = Objects.requireNonNull(modules, "modules cannot be null");
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.reads = Neo4jCatalogTransactions.readOnly(transactions);
        this.writes = Neo4jCatalogTransactions.readWrite(transactions);
    }

    @Override
    public List<LearningModuleRecord> findAll(String organizationId) {
        Map<String, Object> parameters = Map.of("organizationId", organizationId != null ? organizationId : "");
        return reads.execute(status -> new ArrayList<>(client.query(LIST).bindAll(parameters)
                .fetchAs(LearningModuleRecord.class).mappedBy((types, row) -> mapRecordToModule(row)).all()));
    }

    @Override
    public Optional<LearningModuleRecord> findById(String organizationId, String id) {
        Map<String, Object> parameters = Map.of("id", id, "organizationId", organizationId != null ? organizationId : "");
        return reads.execute(status -> client.query(DETAIL).bindAll(parameters)
                .fetchAs(LearningModuleRecord.class).mappedBy((types, row) -> mapRecordToModule(row)).first());
    }

    @Override
    public LearningModuleRecord save(String organizationId, LearningModuleRecord m) {
        String organization = Neo4jTenantGuard.requireOrganization(organizationId);
        writes.executeWithoutResult(status -> {
            Neo4jTenantGuard.requireOwnedOrAbsent(client, "LearningModule", m.id(), organizationId);
            modules.merge(m.id(), organization,
                    m.title() != null ? m.title() : m.id(),
                    m.moduleType() != null ? m.moduleType() : "LESSON_AND_PRACTICE",
                    m.contentUri() != null ? m.contentUri() : "",
                    m.contentType() != null ? m.contentType() : "text/markdown",
                    m.contentVersion() != null ? m.contentVersion() : "1.0",
                    m.version() != null ? m.version() : "0.9.0",
                    m.status() != null ? m.status() : "ACTIVE",
                    m.reviewStatus() != null ? m.reviewStatus() : "NEEDS_EXPERT_REVIEW",
                    m.durationMinutes() > 0 ? m.durationMinutes() : 45,
                    m.teachesSkillIds() != null ? m.teachesSkillIds() : List.of());
        });
        return m;
    }

    @Override
    public void delete(String organizationId, String id) {
        String organization = Neo4jTenantGuard.requireOrganization(organizationId);
        writes.executeWithoutResult(status -> modules.detachDelete(organization, id));
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