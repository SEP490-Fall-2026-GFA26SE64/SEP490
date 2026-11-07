package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.MicroSkill;
import com.adaptlearngraph.entities.domain.MicroSkillId;
import com.adaptlearngraph.entities.MicroSkillNode;
import com.adaptlearngraph.entities.domain.SkillStatus;
import com.adaptlearngraph.entities.domain.SkillProvision;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BiFunction;
import org.neo4j.driver.types.MapAccessor;
import org.neo4j.driver.types.TypeSystem;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.data.neo4j.core.mapping.Neo4jMappingContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionTemplate;

public class Neo4jMicroSkillRepository implements MicroSkillRepository {
    private static final Instant BASELINE = Instant.parse("2026-01-01T00:00:00Z");
    private static final String BY_ID = """
            MATCH (s:MicroSkill {id: $id})
            WHERE s.organizationId = $organizationId
            RETURN s
            """;
    private static final String BY_CODE = """
            MATCH (s:MicroSkill)
            WHERE s.organizationId = $organizationId AND s.code = $code
            RETURN s
            """;

    private final MicroSkillNodeRepository skills;
    private final Neo4jClient client;
    private final Neo4jMappingContext mappingContext;
    private final TransactionOperations reads;
    private final TransactionTemplate writes;

    public Neo4jMicroSkillRepository(MicroSkillNodeRepository skills, Neo4jClient client, Neo4jMappingContext mappingContext,
            PlatformTransactionManager transactions) {
        this.skills = Objects.requireNonNull(skills, "skills cannot be null");
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.mappingContext = Objects.requireNonNull(mappingContext, "mapping context cannot be null");
        mappingContext.getRequiredPersistentEntity(MicroSkillNode.class);
        this.reads = Neo4jCatalogTransactions.autoCommitReads(transactions);
        this.writes = Neo4jCatalogTransactions.readWrite(transactions);
    }

    // SDN mapping functions keep an identity cache for one result set; obtain a fresh one per query.
    private BiFunction<TypeSystem, MapAccessor, MicroSkillNode> nodes() {
        return mappingContext.getRequiredMappingFunctionFor(MicroSkillNode.class);
    }

    @Override
    public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
        Objects.requireNonNull(organizationId, "organizationId");
        Objects.requireNonNull(code, "code");
        return Boolean.TRUE.equals(reads.execute(status -> skills.existsByOrganizationIdAndCode(organizationId, code)));
    }

    @Override
    public MicroSkill save(MicroSkill microSkill) {
        writes.executeWithoutResult(status -> {
            Neo4jTenantGuard.requireOwnedOrAbsent(client, "MicroSkill", microSkill.getId().toString(), microSkill.getOrganizationId());
            // Serialize with other edits of this exact owned node before checking the source version.
            var versions=client.query("MATCH (s:MicroSkill {id:$id,organizationId:$org}) SET s.version=s.version RETURN s.version AS version")
                    .bindAll(Map.of("id",microSkill.getId().toString(),"org",microSkill.getOrganizationId()))
                    .fetchAs(org.neo4j.driver.Value.class).mappedBy((types,row)->row.get("version")).all();
            if(versions.size()>1 || !versions.isEmpty() && !Objects.equals(
                    versions.iterator().next().isNull()?null:versions.iterator().next().asString(),microSkill.getExpectedVersion()))
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Skill changed; reload before saving");
            skills.merge(
                    microSkill.getId().toString(),
                    microSkill.getOrganizationId(),
                    microSkill.getCode(),
                    microSkill.getName(),
                    microSkill.getDescription(),
                    microSkill.getStatus().name(),
                    microSkill.getCreatedAt().toString(),
                    microSkill.getUpdatedAt().toString());
            var provision=microSkill.getProvision();
            var parameters=new HashMap<String,Object>();
            parameters.put("id",microSkill.getId().toString());parameters.put("org",microSkill.getOrganizationId());
            parameters.put("version",microSkill.getVersion());
            parameters.put("modules",provision.moduleOnlyKnowledgeLevels());parameters.put("certificates",provision.certificateOnlyKnowledgeLevels());
            parameters.put("foundation",provision.foundationOutcomeCodes());parameters.put("intermediate",provision.intermediateOutcomeCodes());parameters.put("advanced",provision.advancedOutcomeCodes());
            var incompatible=client.query("""
                    MATCH (s:MicroSkill {id:$id,organizationId:$org})-[r:REQUIRES_CERTIFICATE]->(c:Certificate)
                    WHERE r.status='ACTIVE' AND c.status='ACTIVE' AND
                        (coalesce(c.organizationId,'')<>$org OR coalesce(r.organizationId,$org)<>$org
                            OR NOT coalesce(c.knowledgeLevel,'') IN $certificates)
                    RETURN count(c) AS total
                    """).bindAll(parameters).fetchAs(Long.class).mappedBy((types,row)->row.get("total").asLong()).one().orElse(0L);
            if(incompatible>0)throw new IllegalArgumentException("Deactivate incompatible certificates before changing provision mode");
            client.query("""
                    MATCH (s:MicroSkill {id:$id,organizationId:$org})
                    SET s.version=$version,s.moduleOnlyKnowledgeLevels=$modules,s.certificateOnlyKnowledgeLevels=$certificates,
                        s.foundationOutcomeCodes=$foundation,s.intermediateOutcomeCodes=$intermediate,s.advancedOutcomeCodes=$advanced
                    """).bindAll(parameters).run();
        });
        return microSkill;
    }

    @Override
    public Optional<MicroSkill> findById(String organizationId, MicroSkillId id) {
        Map<String, Object> parameters = Map.of("organizationId", organizationId, "id", id.toString());
        return reads.execute(status -> findOne(BY_ID, parameters, organizationId));
    }

    @Override
    public Optional<MicroSkill> findByCode(String organizationId, String code) {
        Map<String, Object> parameters = Map.of("organizationId", organizationId, "code", code);
        return reads.execute(status -> findOne(BY_CODE, parameters, organizationId));
    }

    @Override
    public List<MicroSkill> findAll(String organizationId) {
        return search(organizationId, null, null);
    }

    // Neo4jClient: optional filters are appended to one statement (one query per list, never per row).
    @Override
    public List<MicroSkill> search(String organizationId, String query, SkillStatus status) {
        StringBuilder cypher = new StringBuilder("""
                MATCH (s:MicroSkill)
                WHERE s.organizationId = $organizationId
                """);

        Map<String, Object> params = new HashMap<>();
        params.put("organizationId", organizationId);

        if (query != null && !query.isBlank()) {
            cypher.append(" AND (toLower(s.name) CONTAINS toLower($query) OR toLower(coalesce(s.code, s.id)) CONTAINS toLower($query))");
            params.put("query", query.trim());
        }

        if (status != null) {
            cypher.append(" AND s.status = $status");
            params.put("status", status.name());
        }

        cypher.append(" RETURN s ORDER BY coalesce(s.code, s.id) ASC");

        var nodes = nodes();
        return reads.execute(tx -> new ArrayList<>(client.query(cypher.toString()).bindAll(params)
                .fetchAs(MicroSkill.class)
                .mappedBy((types, row) -> toDomain(nodes.apply(types, row.get("s")), organizationId))
                .all()));
    }

    @Override
    public int countDependencies(String organizationId, MicroSkillId id) {
        String skillId = id.toString();
        String organization = Neo4jTenantGuard.requireOrganization(organizationId);
        Long total = reads.execute(status -> skills.countDependencies(skillId, organization));
        return total == null ? 0 : Math.toIntExact(total);
    }

    @Override
    public void delete(String organizationId, MicroSkillId id) {
        Objects.requireNonNull(organizationId, "organizationId");
        String skillId = id.toString();
        writes.executeWithoutResult(status -> skills.detachDelete(organizationId, skillId));
    }

    private Optional<MicroSkill> findOne(String cypher, Map<String, Object> parameters, String organizationId) {
        var nodes = nodes();
        return client.query(cypher).bindAll(parameters).fetchAs(MicroSkill.class)
                .mappedBy((types, row) -> toDomain(nodes.apply(types, row.get("s")), organizationId))
                .first();
    }

    private static MicroSkill toDomain(MicroSkillNode node, String defaultOrgId) {
        String idStr = node.id() != null ? node.id() : UUID.randomUUID().toString();
        String orgId = node.organizationId() != null ? node.organizationId() : defaultOrgId;
        String code = node.code() != null ? node.code() : idStr;
        String name = node.name() != null ? node.name() : idStr;
        String desc = node.description() != null ? node.description()
                : (node.definition() != null ? node.definition() : "");
        String statusStr = node.status() != null ? node.status() : "ACTIVE";
        Instant createdAt = node.createdAt() != null ? node.createdAt() : BASELINE;
        Instant updatedAt = node.updatedAt() != null ? node.updatedAt() : createdAt;

        return new MicroSkill(
                MicroSkillId.fromString(idStr),
                orgId,
                code,
                name,
                desc,
                SkillStatus.fromString(statusStr),
                createdAt,
                updatedAt,
                new SkillProvision(orEmpty(node.moduleOnlyKnowledgeLevels()),orEmpty(node.certificateOnlyKnowledgeLevels()),
                        orEmpty(node.foundationOutcomeCodes()),orEmpty(node.intermediateOutcomeCodes()),orEmpty(node.advancedOutcomeCodes())),
                node.version(),node.version());
    }
    private static List<String> orEmpty(List<String> values){return values==null?List.of():values;}
}
