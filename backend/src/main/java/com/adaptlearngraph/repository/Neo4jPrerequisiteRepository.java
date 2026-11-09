package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.MicroSkillNode;
import com.adaptlearngraph.entities.domain.PrerequisiteEdge;
import com.adaptlearngraph.entities.domain.SkillStatus;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.PrerequisiteRules;
import org.neo4j.driver.Value;
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
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionTemplate;

public class Neo4jPrerequisiteRepository implements PrerequisiteRepository {
    private static final Instant BASELINE = Instant.parse("2026-01-01T00:00:00Z");
    // Neo4jClient: each row is a whole edge (source node, target node, relationship properties) in one statement.
    private static final String ALL = """
            MATCH (source:MicroSkill)-[rel:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(target:MicroSkill)
            WHERE source.organizationId = $organizationId AND target.organizationId = $organizationId
                AND coalesce(rel.status, 'ACTIVE') = 'ACTIVE'
            RETURN source, target, rel
            ORDER BY coalesce(source.code, source.id) ASC, coalesce(target.code, target.id) ASC
            """;
    private static final String FOR_ROLE = """
            MATCH (role:TargetRole)
            WHERE role.organizationId = $organizationId AND (role.id = $roleId OR role.code = $roleId)
            MATCH (role)-[:REQUIRES_SKILL]->(source:MicroSkill)
            MATCH (role)-[:REQUIRES_SKILL]->(target:MicroSkill)
            MATCH (source)-[rel:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(target)
            WHERE coalesce(rel.status, 'ACTIVE') = 'ACTIVE'
            RETURN source, target, rel
            ORDER BY coalesce(source.code, source.id) ASC, coalesce(target.code, target.id) ASC
            """;
    private final MicroSkillNodeRepository skills;
    private final Neo4jClient client;
    private final Neo4jMappingContext mappingContext;
    private final TransactionOperations reads;
    private final TransactionTemplate writes;

    public Neo4jPrerequisiteRepository(MicroSkillNodeRepository skills, Neo4jClient client,
            Neo4jMappingContext mappingContext, PlatformTransactionManager transactions) {
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

    @Override public PrerequisiteEdge savePrerequisite(String organizationId,String sourceSkillId,String targetSkillId,double minMastery,SkillStatus status) {
        throw new IllegalArgumentException("Numeric prerequisites are retired; select both knowledge levels");
    }
    @Override public void deletePrerequisite(String organizationId,String sourceSkillId,String targetSkillId) {
        deletePrerequisite(organizationId, sourceSkillId, targetSkillId, null, null);
    }

    @Override public PrerequisiteEdge savePrerequisite(String organizationId,String sourceSkillId,String targetSkillId,
            KnowledgeLevel dependentLevel,KnowledgeLevel prerequisiteLevel,SkillStatus status) {
        String organization=Neo4jTenantGuard.requireOrganization(organizationId);
        if(status!=SkillStatus.ACTIVE)throw new IllegalArgumentException("Create an active prerequisite; use removal to retire an exact pair");
        return writes.execute(tx->{
            lockCatalog(organization);
            String canonicalSource = requireLevel(organization,sourceSkillId,dependentLevel);
            String canonicalTarget = requireLevel(organization,targetSkillId,prerequisiteLevel);
            var pair=new PrerequisiteRules.Pair(canonicalSource,dependentLevel,canonicalTarget,prerequisiteLevel);
            var rows=client.query("""
                    MATCH (a:MicroSkill {organizationId:$org})-[p:HAS_SKILL_PREREQUISITE]->(b:MicroSkill {organizationId:$org})
                    WHERE p.status='ACTIVE'
                    RETURN a.id AS dependent,b.id AS prerequisite,p.organizationId AS owner,
                        p.dependentKnowledgeLevel AS dependentLevel,p.prerequisiteKnowledgeLevel AS prerequisiteLevel
                    LIMIT 5001
                    """).bind(organization).to("org").fetchAs(PrerequisiteRules.Pair.class).mappedBy((types,row)->{
                        if(!row.get("owner").isNull() && !organization.equals(row.get("owner").asString()))
                            throw new IllegalArgumentException("Prerequisite relationship ownership conflicts");
                        try{return new PrerequisiteRules.Pair(row.get("dependent").asString(),KnowledgeLevel.valueOf(row.get("dependentLevel").asString()),
                                row.get("prerequisite").asString(),KnowledgeLevel.valueOf(row.get("prerequisiteLevel").asString()));}
                        catch(RuntimeException invalid){throw new IllegalArgumentException("Classify or retire legacy prerequisites before changing this catalog");}
                    }).all();
            if(rows.size()>5000)throw new IllegalArgumentException("Prerequisite catalog capacity exceeded");
            PrerequisiteRules.assertAddition(new ArrayList<>(rows),pair);
            var params=parameters(organization,canonicalSource,canonicalTarget,dependentLevel,prerequisiteLevel);
            var existing=client.query("""
                    MATCH (a:MicroSkill {id:$source,organizationId:$org})-[p:HAS_SKILL_PREREQUISITE]->(b:MicroSkill {id:$target,organizationId:$org})
                    WHERE p.dependentKnowledgeLevel=$dependent AND p.prerequisiteKnowledgeLevel=$prerequisite
                    RETURN p.organizationId AS owner
                    """).bindAll(params).fetchAs(Value.class).mappedBy((types,row)->row.get("owner")).all();
            if(existing.size()>1 || existing.stream().anyMatch(owner->!owner.isNull() && !organization.equals(owner.asString())))
                throw new IllegalArgumentException("Duplicate or foreign prerequisite relationship");
            return client.query("""
                    MATCH (source:MicroSkill {id:$source,organizationId:$org}), (target:MicroSkill {id:$target,organizationId:$org})
                    MERGE (source)-[rel:HAS_SKILL_PREREQUISITE {dependentKnowledgeLevel:$dependent,prerequisiteKnowledgeLevel:$prerequisite}]->(target)
                    ON CREATE SET rel.id=randomUUID(),rel.createdAt=datetime()
                    SET rel.organizationId=$org,rel.status='ACTIVE',rel.version=randomUUID(),rel.updatedAt=datetime()
                    RETURN source,target,rel
                    """).bindAll(params).fetchAs(PrerequisiteEdge.class).mappedBy(edgeMapper()).one().orElseThrow();
        });
    }

    @Override public void deletePrerequisite(String organizationId,String sourceSkillId,String targetSkillId,
            KnowledgeLevel dependentLevel,KnowledgeLevel prerequisiteLevel) {
        String organization=Neo4jTenantGuard.requireOrganization(organizationId);
        writes.executeWithoutResult(tx->{
            lockCatalog(organization);
            client.query("""
                    MATCH (a:MicroSkill {organizationId:$org})-[p:HAS_SKILL_PREREQUISITE|PREREQUISITE_OF]->(b:MicroSkill {organizationId:$org})
                    WHERE (a.id=$source OR a.code=$source) AND (b.id=$target OR b.code=$target)
                        AND ($dependent IS NULL OR p.dependentKnowledgeLevel IS NULL OR p.dependentKnowledgeLevel=$dependent)
                        AND ($prerequisite IS NULL OR p.prerequisiteKnowledgeLevel IS NULL OR p.prerequisiteKnowledgeLevel=$prerequisite)
                        AND (p.organizationId IS NULL OR p.organizationId=$org)
                    DELETE p
                    """).bindAll(parameters(organization,sourceSkillId,targetSkillId,dependentLevel,prerequisiteLevel)).run();
        });
    }
    private Map<String,Object> parameters(String org,String source,String target,KnowledgeLevel dependent,KnowledgeLevel prerequisite) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("org", org);
        map.put("source", source);
        map.put("target", target);
        map.put("dependent", dependent != null ? dependent.name() : null);
        map.put("prerequisite", prerequisite != null ? prerequisite.name() : null);
        return map;
    }
    @Override public PrerequisiteEdge reversePrerequisite(String organization,String source,String target,KnowledgeLevel dependent,KnowledgeLevel prerequisite) {
        Neo4jTenantGuard.requireOrganization(organization);
        return writes.execute(tx->{
            lockCatalog(organization);
            var current=client.query("""
                    MATCH (a:MicroSkill {organizationId:$org})-[p:HAS_SKILL_PREREQUISITE]->(b:MicroSkill {organizationId:$org})
                    WHERE p.status='ACTIVE' AND p.dependentKnowledgeLevel=$dependent AND p.prerequisiteKnowledgeLevel=$prerequisite
                        AND (p.organizationId IS NULL OR p.organizationId=$org)
                        AND (a.id=$source OR a.code=$source) AND (b.id=$target OR b.code=$target)
                    RETURN count(p) AS total
                    """).bindAll(parameters(organization,source,target,dependent,prerequisite)).fetchAs(Long.class).mappedBy((types,row)->row.get("total").asLong()).one().orElse(0L);
            if(current!=1)throw new IllegalArgumentException("Reload the exact active prerequisite before reversing it");
            deletePrerequisite(organization,source,target,dependent,prerequisite);
            // Both nested operations join this Neo4j transaction; a failed addition restores the original active edge.
            return savePrerequisite(organization,target,source,prerequisite,dependent,SkillStatus.ACTIVE);
        });
    }
    private void lockCatalog(String organization) {
        // Bounded administrative writes lock existing owned nodes in one order; no lock node or cross-store transaction.
        var locked=client.query("""
                MATCH (s:MicroSkill {organizationId:$org}) WITH s ORDER BY s.id LIMIT 5001
                SET s.version=s.version RETURN s.id AS id
                """).bind(organization).to("org").fetchAs(String.class).mappedBy((types,row)->row.get("id").asString()).all();
        if(locked.size()>5000)throw new IllegalArgumentException("Skill catalog capacity exceeded");
    }
    private String requireLevel(String organization,String skill,KnowledgeLevel level) {
        var rows=client.query("""
                MATCH (s:MicroSkill {organizationId:$org})
                WHERE (s.id=$id OR s.code=$id)
                    AND (s.status IS NULL OR s.status='ACTIVE')
                    AND coalesce(s.reviewStatus, 'APPROVED')='APPROVED'
                    AND (
                        (coalesce(size(s.moduleOnlyKnowledgeLevels), 0) = 0 AND coalesce(size(s.certificateOnlyKnowledgeLevels), 0) = 0)
                        OR $level IN coalesce(s.moduleOnlyKnowledgeLevels,[])
                        OR $level IN coalesce(s.certificateOnlyKnowledgeLevels,[])
                    )
                RETURN s.id AS id LIMIT 2
                """).bindAll(Map.of("org",organization,"id",skill,"level",level.name())).fetchAs(String.class).mappedBy((types,row)->row.get("id").asString()).all();
        if(rows.size()!=1)throw new IllegalArgumentException("Select an owned active approved skill with this configured knowledge level");
        return rows.iterator().next();
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
                updatedAt,
                rel.get("dependentKnowledgeLevel").isNull()?null:KnowledgeLevel.valueOf(rel.get("dependentKnowledgeLevel").asString()),
                rel.get("prerequisiteKnowledgeLevel").isNull()?null:KnowledgeLevel.valueOf(rel.get("prerequisiteKnowledgeLevel").asString()));
    }
}
