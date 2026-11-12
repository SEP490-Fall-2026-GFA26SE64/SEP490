package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.ModuleAuthoring.CatalogModule;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.CatalogTeaching;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Choice;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Document;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Metadata;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Revision;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Teaching;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.KnowledgeDefinition;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.neo4j.driver.Value;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Published module catalog projection in Neo4j behind {@link JpaModuleAuthoringAdapter}. Every call runs in its own
 * {@code neo4jTransactionManager} transaction that commits when the call returns, so the adapter's PostgreSQL
 * transaction keeps its existing order: the graph projection commits before the PostgreSQL revision.
 */
public final class Neo4jModuleCatalogGraph {
    // Neo4jClient: one statement for the whole list; each module node and its TEACHES metadata are mapped field by field.
    private static final String MODULES = """
            MATCH (m:LearningModule)
            WHERE m.id IS NOT NULL AND m.organizationId=$organization
            OPTIONAL MATCH (m)-[t:TEACHES]->(s:MicroSkill) WHERE s.organizationId=$organization
            WITH m, s, t ORDER BY s.id, t.id
            RETURN m AS module, collect(CASE WHEN s IS NULL THEN null ELSE
              {metadata: properties(t), skillId: s.id, skillName: s.name,
               teachingFocus: t.teachingFocus, difficultyLevel: t.difficultyLevel} END) AS teachings
            ORDER BY m.id
            """;
    // Neo4jClient: map-valued comparison of the stored node and TEACHES properties against a snapshot.
    private static final String MATCHES_SNAPSHOT = """
            MATCH (m:LearningModule {id:$id})
            WHERE m.organizationId=$organization AND all(k IN keys($props) WHERE m[k]=$props[k] OR (m[k] IS NULL AND $props[k] IS NULL))
            OPTIONAL MATCH (m)-[t:TEACHES]->(s:MicroSkill)
            WITH collect(CASE WHEN t IS NULL THEN null ELSE {skillId:s.id,props:properties(t)} END) AS actual
            RETURN size(actual)=size($teachings) AND all(item IN $teachings WHERE any(a IN actual WHERE a.skillId=item.skillId
              AND all(k IN keys(item.props) WHERE a.props[k]=item.props[k] OR (a.props[k] IS NULL AND item.props[k] IS NULL)))) AS matches
            """;
    // Neo4jClient: aggregate count of same-organization endpoints.
    private static final String ENDPOINTS = "MATCH (s:MicroSkill) WHERE s.id IN $ids AND s.organizationId=$organization RETURN count(DISTINCT s.id) AS n";
    // Neo4jClient: existential subquery over other approved primary providers.
    private static final String REMOVES_PROVIDER = """
            MATCH (m:LearningModule {id:$id})-[t:TEACHES]->(s:MicroSkill)
            WHERE NOT s.id IN $primary
            AND NOT EXISTS { MATCH (other:LearningModule)-[provider:TEACHES]->(s)
              WHERE other.id<>$id AND other.status='ACTIVE' AND other.reviewStatus='APPROVED'
                AND provider.status='ACTIVE' AND provider.reviewStatus='APPROVED' }
            RETURN count(s)>0 AS missing
            """;
    private static final String RETAINS_COVERAGE = """
            MATCH (m:LearningModule {id:$id})-[t:TEACHES]->(s:MicroSkill)
            WHERE NOT EXISTS { MATCH (other:LearningModule)-[provider:TEACHES]->(s)
              WHERE other.id<>$id AND other.status='ACTIVE' AND other.reviewStatus='APPROVED'
                AND provider.status='ACTIVE' AND provider.reviewStatus='APPROVED' }
            RETURN count(s)=0 AS safe
            """;
    private static final String EXISTS = "MATCH (m:LearningModule {id:$id}) RETURN count(m)>0 AS found";

    private final LearningModuleNodeRepository modules;
    private final Neo4jClient client;
    private final TransactionOperations reads;
    private final TransactionTemplate writes;

    public Neo4jModuleCatalogGraph(LearningModuleNodeRepository modules, Neo4jClient client, PlatformTransactionManager transactions) {
        this.modules = Objects.requireNonNull(modules, "modules cannot be null");
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.reads = Neo4jCatalogTransactions.autoCommitReads(transactions);
        this.writes = Neo4jCatalogTransactions.readWrite(transactions);
    }

    public List<CatalogModule> modules(String org) {
        return reads.execute(status -> new ArrayList<>(client.query(MODULES).bindAll(Map.of("organization", org))
                .fetchAs(CatalogModule.class).mappedBy((types, row) -> {
                    var m = row.get("module");
                    var teachings = row.get("teachings").asList(t -> new CatalogTeaching(catalogMetadata(t.get("metadata")),
                            catalogText(t.get("skillId")), catalogText(t.get("skillName")),
                            catalogText(t.get("teachingFocus")), catalogText(t.get("difficultyLevel"))));
                    return new CatalogModule(catalogMetadata(m), catalogText(m.get("title")), catalogText(m.get("moduleType")),
                            catalogText(m.get("contentUri")), catalogText(m.get("contentType")), catalogText(m.get("contentVersion")),
                            m.get("duration").isNull() ? null : m.get("duration").asNumber().intValue(),
                            teachings,
                            m.get("knowledgeLevel").isNull()?null:KnowledgeLevel.valueOf(m.get("knowledgeLevel").asString()),
                            m.get("outcomeCodes").isNull()?List.of():m.get("outcomeCodes").asList(Value::asString),catalogText(m.get("skillVersion")));
                }).all()));
    }

    /** Active {@code JobPosition}/{@code MicroSkill} choices; the label is interpolated only after the allow-list check. */
    public List<Choice> choices(String kind, String organization) {
        if (!Set.of("JobPosition", "MicroSkill", "ModuleSkill").contains(kind)) throw new IllegalArgumentException("Unknown catalog");
        String label = kind.equals("ModuleSkill") ? "MicroSkill" : kind;
        String eligibility = kind.equals("ModuleSkill")
                ? "n.status='ACTIVE' AND n.reviewStatus='APPROVED'" : "n.status <> 'ARCHIVED'";
        return reads.execute(status -> new ArrayList<>(client.query("MATCH (n:" + label
                        + ") WHERE n.organizationId=$organization AND " + eligibility
                        + " AND n.id IS NOT NULL AND n.name IS NOT NULL RETURN n.id AS id,n.name AS name ORDER BY name")
                .bind(organization).to("organization").fetchAs(Choice.class).mappedBy((types, r) -> new Choice(r.get("id").asString(), r.get("name").asString())).all()));
    }

    public KnowledgeDefinition requireKnowledge(String organization,String skill,String level,List<String> outcomes) {
        return reads.execute(status->knowledge(organization,skill,level,outcomes));
    }
    private KnowledgeDefinition knowledge(String organization,String skill,String level,List<String> outcomes) {
        KnowledgeLevel knowledge;
        try{knowledge=KnowledgeLevel.valueOf(level);}catch(RuntimeException invalid){throw new Failure(400,"Select a knowledge level");}
        var rows=client.query("""
                MATCH (s:MicroSkill {id:$skill,organizationId:$organization})
                WHERE s.status='ACTIVE' AND s.reviewStatus='APPROVED' RETURN properties(s) AS skill LIMIT 2
                """).bindAll(Map.of("organization",organization,"skill",skill)).fetchAs(Value.class).mappedBy((types,row)->row.get("skill")).all();
        if(rows.size()!=1)throw new Failure(409,"Select an owned active approved skill");
        var s=rows.iterator().next();
        var modules=s.get("moduleOnlyKnowledgeLevels").isNull()?List.<String>of():s.get("moduleOnlyKnowledgeLevels").asList(Value::asString);
        var certificates=s.get("certificateOnlyKnowledgeLevels").isNull()?List.<String>of():s.get("certificateOnlyKnowledgeLevels").asList(Value::asString);
        if(new java.util.HashSet<>(modules).size()!=modules.size() || new java.util.HashSet<>(certificates).size()!=certificates.size()
            || java.util.stream.Stream.concat(modules.stream(),certificates.stream()).anyMatch(k->!Set.of("FOUNDATION","INTERMEDIATE","ADVANCED").contains(k)))
            throw new Failure(409,"Invalid skill-level provision configuration");
        try {
            if(com.adaptlearngraph.entities.domain.SkillProvisionMode.resolve(catalogText(s.get("provisionMode")),modules,certificates,knowledge)
                    !=com.adaptlearngraph.entities.domain.SkillProvisionMode.MODULE_ONLY)
                throw new Failure(409,"This skill level is not configured for module learning");
        } catch(IllegalArgumentException invalid) {throw new Failure(409,"Invalid skill-level provision configuration");}
        String version=catalogText(s.get("version"));if(version==null || version.isBlank())throw new Failure(409,"Skill version is not configured");
        return new KnowledgeDefinition(knowledge,version,List.of());
    }

    public void project(Document doc, Revision revision, boolean archived) {
        var p = revision.payload();
        if (p.teachings().size() != 1) throw new Failure(409, "Publication requires exactly one skill");
        Map<String, Object> properties = metadata(p.metadata());
        properties.putAll(Map.of("title", p.title(), "moduleType", p.moduleType(), "contentUri", p.contentUri(),
                "contentType", p.contentType(), "contentVersion", p.contentVersion(), "duration", p.duration()));
        if(p.knowledgeLevel()!=null)properties.putAll(Map.of("knowledgeLevel",p.knowledgeLevel().name(),"skillVersion",p.skillVersion()));
        else if(!archived)throw new Failure(409,"Configure module knowledge scope before publication");
        List<Map<String, Object>> teachings = p.teachings().stream().map(t -> {
            Map<String, Object> props = metadata(t.metadata());
            return Map.<String, Object>of("skillId", t.skillId(), "props", props);
        }).toList();
        writes.executeWithoutResult(status -> {
            if(!archived) {
                var current=knowledge(doc.organizationId(),p.teachings().getFirst().skillId(),p.knowledgeLevel().name(),p.outcomeCodes());
                if(!current.skillVersion().equals(p.skillVersion()))throw new Failure(409,"Skill knowledge definition changed; revise the module");
            }
            // Lock the existing node before comparing the source snapshot and replacing it.
            if (doc.intake() != null && !doc.everReleased()) {
                modules.lockForPublication(doc.id());
                var source = doc.intake().source();
                Map<String, Object> expected = metadata(source.metadata());
                expected.putAll(Map.of("title", source.title(), "moduleType", source.moduleType(), "contentUri", source.contentUri(),
                        "contentType", source.contentType(), "contentVersion", source.contentVersion(), "duration", source.duration()));
                if(source.knowledgeLevel()!=null)expected.putAll(Map.of("knowledgeLevel",source.knowledgeLevel().name(),"skillVersion",source.skillVersion()));
                var originalTeachings = source.teachings().stream().map(t -> {
                    Map<String, Object> props = metadata(t.metadata());
                    return Map.<String, Object>of("skillId", t.skillId(), "props", props);
                }).toList();
                boolean original = matchesSnapshot(doc.id(), doc.organizationId(), expected, originalTeachings);
                boolean alreadyPublished = matchesSnapshot(doc.id(), doc.organizationId(), properties, teachings);
                if (!original && !alreadyPublished) throw new Failure(409, "Catalog changed since intake; publication requires reconciliation");
            }
            Neo4jTenantGuard.requireOwnedOrAbsent(client, "LearningModule", doc.id(), doc.organizationId());
            long endpoints = client.query(ENDPOINTS).bindAll(Map.of("ids", p.teachings().stream().map(Teaching::skillId).toList(), "organization", doc.organizationId()))
                    .fetchAs(Long.class).mappedBy((types, row) -> row.get("n").asLong()).one().orElseThrow();
            if (endpoints != teachings.size()) throw new Failure(409, "A mapped skill no longer exists");
            if (!archived) {
                boolean removesProvider = client.query(REMOVES_PROVIDER).bindAll(Map.of("id", doc.id(), "primary",
                                p.teachings().stream().map(Teaching::skillId).toList()))
                        .fetchAs(Boolean.class).mappedBy((types, row) -> row.get("missing").asBoolean()).one().orElseThrow();
                if (removesProvider) throw new Failure(409, "Revision would remove a required skill provider");
            }
            // Graph and PostgreSQL snapshots deliberately keep independent revision identities.
            modules.replaceProperties(doc.id(), properties, doc.organizationId());
            modules.deleteTeachingsExcept(doc.id(), p.teachings().stream().map(Teaching::skillId).toList());
            modules.mergeTeachings(doc.id(), teachings, doc.organizationId());
        });
    }

    public boolean exists(String id) {
        return Boolean.TRUE.equals(reads.execute(status -> client.query(EXISTS).bindAll(Map.of("id", id))
                .fetchAs(Boolean.class).mappedBy((types, row) -> row.get("found").asBoolean()).one().orElseThrow()));
    }

    public boolean retainsCoverage(String id) {
        return Boolean.TRUE.equals(reads.execute(status -> client.query(RETAINS_COVERAGE).bindAll(Map.of("id", id))
                .fetchAs(Boolean.class).mappedBy((types, row) -> row.get("safe").asBoolean()).one().orElseThrow()));
    }

    private boolean matchesSnapshot(String id, String organization, Map<String, Object> props, List<Map<String, Object>> teachings) {
        return client.query(MATCHES_SNAPSHOT).bindAll(Map.of("id", id, "organization", organization, "props", props, "teachings", teachings))
                .fetchAs(Boolean.class).mappedBy((types, row) -> row.get("matches").asBoolean()).one().orElseThrow();
    }

    private static Map<String, Object> metadata(Metadata m) {
        Map<String, Object> properties = new HashMap<>(); properties.put("id", m.id()); properties.put("version", m.version());
        properties.put("status", m.status()); properties.put("reviewStatus", m.reviewStatus());
        properties.put("reviewedBy", m.reviewedBy()); properties.put("reviewedAt", m.reviewedAt()); return properties;
    }

    private static String catalogText(Value value) {
        return value.isNull() ? null : value.asObject().toString();
    }

    private static Metadata catalogMetadata(Value value) {
        return new Metadata(catalogText(value.get("id")), catalogText(value.get("version")),
                catalogText(value.get("status")), catalogText(value.get("reviewStatus")),
                catalogText(value.get("reviewedBy")), catalogText(value.get("reviewedAt")));
    }
}
