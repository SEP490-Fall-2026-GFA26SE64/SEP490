package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.MicroSkillNode;
import com.adaptlearngraph.entities.domain.PrerequisiteEdge;
import com.adaptlearngraph.entities.domain.SkillStatus;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.BiFunction;
import org.neo4j.driver.Record;
import org.neo4j.driver.types.MapAccessor;
import org.neo4j.driver.types.Relationship;
import org.neo4j.driver.types.TypeSystem;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.data.neo4j.core.mapping.Neo4jMappingContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

public class Neo4jPrerequisiteRepository implements PrerequisiteRepository {
    private static final Instant BASELINE = Instant.parse("2026-01-01T00:00:00Z");
    // Neo4jClient: each row is a whole edge (source node, target node, relationship properties) in one statement.
    private static final String ALL = """
            MATCH (source:MicroSkill)-[rel:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(target:MicroSkill)
            WHERE source.organizationId = $organizationId AND target.organizationId = $organizationId
            RETURN source, target, rel
            ORDER BY coalesce(source.code, source.id) ASC, coalesce(target.code, target.id) ASC
            """;
    private static final String FOR_ROLE = """
            MATCH (role:TargetRole)
            WHERE role.organizationId = $organizationId AND (role.id = $roleId OR role.code = $roleId)
            MATCH (role)-[:REQUIRES_SKILL]->(source:MicroSkill)
            MATCH (role)-[:REQUIRES_SKILL]->(target:MicroSkill)
            MATCH (source)-[rel:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(target)
            RETURN source, target, rel
            ORDER BY coalesce(source.code, source.id) ASC, coalesce(target.code, target.id) ASC
            """;
    // Relationship write matching both endpoints inside one organization; returns the stored edge in the same round trip.
    private static final String SAVE = """
            MATCH (source:MicroSkill), (target:MicroSkill)
            WHERE source.organizationId = $organizationId AND target.organizationId = $organizationId
              AND (source.id = $sourceSkillId OR source.code = $sourceSkillId)
              AND (target.id = $targetSkillId OR target.code = $targetSkillId)
            MERGE (source)-[rel:HAS_SKILL_PREREQUISITE]->(target)
            ON CREATE SET
                rel.requiredScore = $minMastery,
                rel.minMastery = $minMastery,
                rel.version = '0.10.0',
                rel.status = $status,
                rel.createdAt = datetime(),
                rel.updatedAt = datetime()
            ON MATCH SET
                rel.requiredScore = $minMastery,
                rel.minMastery = $minMastery,
                rel.version = '0.10.0',
                rel.status = $status,
                rel.updatedAt = datetime()
            RETURN source, target, rel
            """;

    private final MicroSkillNodeRepository skills;
    private final Neo4jClient client;
    private final Neo4jMappingContext mappingContext;
    private final TransactionTemplate reads;
    private final TransactionTemplate writes;

    public Neo4jPrerequisiteRepository(MicroSkillNodeRepository skills, Neo4jClient client,
            Neo4jMappingContext mappingContext, PlatformTransactionManager transactions) {
        this.skills = Objects.requireNonNull(skills, "skills cannot be null");
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.mappingContext = Objects.requireNonNull(mappingContext, "mapping context cannot be null");
        mappingContext.getRequiredPersistentEntity(MicroSkillNode.class);
        this.reads = Neo4jCatalogTransactions.readOnly(transactions);
        this.writes = Neo4jCatalogTransactions.readWrite(transactions);
    }

    // SDN mapping functions keep an identity cache for one result set; obtain a fresh one per query.
    private BiFunction<TypeSystem, MapAccessor, MicroSkillNode> nodes() {
        return mappingContext.getRequiredMappingFunctionFor(MicroSkillNode.class);
    }

    @Override
    public List<PrerequisiteEdge> findAll(String organizationId) {
        return edges(ALL, Map.of("organizationId", organizationId));
    }

    @Override
    public List<PrerequisiteEdge> findForRole(String organizationId, String roleId) {
        return edges(FOR_ROLE, Map.of("organizationId", organizationId, "roleId", roleId));
    }

    @Override
    public boolean hasPath(String organizationId, String fromSkillId, String toSkillId) {
        String organization = Neo4jTenantGuard.requireOrganization(organizationId);
        Objects.requireNonNull(fromSkillId, "fromSkillId");
        Objects.requireNonNull(toSkillId, "toSkillId");
        return Boolean.TRUE.equals(reads.execute(status -> skills.hasPrerequisitePath(organization, fromSkillId, toSkillId)));
    }

    @Override
    public PrerequisiteEdge savePrerequisite(
            String organizationId,
            String sourceSkillId,
            String targetSkillId,
            double minMastery,
            SkillStatus status) {
        Map<String, Object> params = Map.of(
                "organizationId", Neo4jTenantGuard.requireOrganization(organizationId),
                "sourceSkillId", sourceSkillId,
                "targetSkillId", targetSkillId,
                "minMastery", minMastery,
                "status", status != null ? status.name() : "ACTIVE");
        return writes.execute(tx -> client.query(SAVE).bindAll(params).fetchAs(PrerequisiteEdge.class)
                .mappedBy(edgeMapper()).first()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Source or target micro-skill not found for ids: " + sourceSkillId + ", " + targetSkillId)));
    }

    @Override
    public void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId) {
        String organization = Neo4jTenantGuard.requireOrganization(organizationId);
        Objects.requireNonNull(sourceSkillId, "sourceSkillId");
        Objects.requireNonNull(targetSkillId, "targetSkillId");
        writes.executeWithoutResult(status -> skills.deletePrerequisite(organization, sourceSkillId, targetSkillId));
    }

    private List<PrerequisiteEdge> edges(String cypher, Map<String, Object> parameters) {
        return reads.execute(status -> new ArrayList<>(client.query(cypher).bindAll(parameters)
                .fetchAs(PrerequisiteEdge.class).mappedBy(edgeMapper()).all()));
    }

    private BiFunction<TypeSystem, Record, PrerequisiteEdge> edgeMapper() {
        var nodes = nodes();
        return (types, record) -> toEdge(nodes.apply(types, record.get("source")), nodes.apply(types, record.get("target")), record);
    }

    private static PrerequisiteEdge toEdge(MicroSkillNode source, MicroSkillNode target, Record record) {
        Relationship rel = record.get("rel").asRelationship();

        String sourceId = source.id() != null ? source.id() : "";
        String sourceCode = source.code() != null ? source.code() : sourceId;
        String sourceName = source.name() != null ? source.name() : sourceId;

        String targetId = target.id() != null ? target.id() : "";
        String targetCode = target.code() != null ? target.code() : targetId;
        String targetName = target.name() != null ? target.name() : targetId;

        double minMastery = rel.containsKey("requiredScore") && !rel.get("requiredScore").isNull()
                ? rel.get("requiredScore").asDouble()
                : (rel.containsKey("minMastery") && !rel.get("minMastery").isNull()
                        ? rel.get("minMastery").asDouble()
                        : 0.60);
        String statusStr = rel.containsKey("status") && !rel.get("status").isNull()
                ? rel.get("status").asString()
                : "ACTIVE";

        Instant createdAt = BASELINE;
        if (rel.containsKey("createdAt") && !rel.get("createdAt").isNull()) {
            try {
                createdAt = rel.get("createdAt").asZonedDateTime().toInstant();
            } catch (Exception e1) {
                try {
                    createdAt = Instant.parse(rel.get("createdAt").asString());
                } catch (Exception ignored) {}
            }
        }
        Instant updatedAt = createdAt;
        if (rel.containsKey("updatedAt") && !rel.get("updatedAt").isNull()) {
            try {
                updatedAt = rel.get("updatedAt").asZonedDateTime().toInstant();
            } catch (Exception e1) {
                try {
                    updatedAt = Instant.parse(rel.get("updatedAt").asString());
                } catch (Exception ignored) {}
            }
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