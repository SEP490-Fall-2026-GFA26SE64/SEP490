package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.ModuleAuthoringContentEntity;
import com.adaptlearngraph.entities.ModuleGrantAuditEntity;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import com.adaptlearngraph.entities.ModuleAuthoring.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.neo4j.driver.Driver;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import java.util.function.Supplier;

/** Module authoring documents in PostgreSQL through Spring Data JPA; the published catalog projection stays in Neo4j. */
public final class JpaModuleAuthoringAdapter implements ModuleAuthoringPort {
    private final ModuleAuthoringRepositories repositories;
    private final TransactionTemplate transactions;
    private final ObjectMapper mapper;
    private final Driver driver;
    private final String organizationId;
    /** {@code transactions} must run on the JPA transaction manager so repository calls join the advisory-locked transaction. */
    public JpaModuleAuthoringAdapter(ModuleAuthoringRepositories repositories, TransactionTemplate transactions, ObjectMapper mapper, Driver driver, String organizationId) {
        this.repositories = repositories; this.transactions = transactions; this.mapper = mapper; this.driver = driver; this.organizationId = organizationId;
    }
    @Override public Actor actor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName().equals("anonymousUser")) throw new Failure(401, "Sign in to continue");
        Set<String> roles = new HashSet<>(); auth.getAuthorities().forEach(a -> roles.add(a.getAuthority().replaceFirst("^ROLE_", "")));
        String actorOrganization = auth.getDetails() instanceof Map<?, ?> details && details.get("organizationId") instanceof String org ? org : organizationId;
        return new Actor(auth.getName(), actorOrganization, roles);
    }
    @Override public <T> T transaction(Supplier<T> work) {
        return transactions.execute(status -> {
            // Serialize coverage/grant/publication checks for the organization across API instances.
            repositories.locks().lock(actor().organizationId() + ":module-authoring");
            return work.get();
        });
    }
    @Override public List<String> occupations(Actor actor) {
        return repositories.grants().activeOccupations(actor.organizationId(), actor.id());
    }
    @Override public List<Grant> grants(String org) {
        return repositories.grants().activeGrants(org);
    }
    @Override public void grant(String org, String expert, String occupation, boolean active) {
        repositories.grants().save(org, expert, occupation, active);
        repositories.grantAudit().insert(new ModuleGrantAuditEntity(null, org, expert, occupation, active, actor().id(), null));
    }
    private String json(Object value) {
        try { return mapper.writeValueAsString(value); } catch (JsonProcessingException e) { throw new IllegalStateException("Cannot encode authoring package", e); }
    }
    private <T> T read(String json, Class<T> type) {
        try { return mapper.readValue(json, type); } catch (JsonProcessingException e) { throw new IllegalStateException("Cannot decode authoring package", e); }
    }
    @Override public List<Document> documents(String org) {
        return mutable(repositories.documents().documents(org).stream().map(document -> read(document, Document.class)).toList());
    }
    @Override public List<Intake> intakes(String org) {
        return mutable(repositories.intakes().documents(org).stream().map(document -> read(document, Intake.class)).toList());
    }
    @Override public void lockCatalogIdentity(String id) {
        repositories.locks().lock("module-catalog:" + id);
    }
    @Override public boolean intakeExists(String id) {
        return repositories.intakes().exists(id);
    }
    @Override public void saveIntake(Intake intake) {
        repositories.intakes().save(intake.moduleId(), intake.organizationId(), json(intake));
    }
    @Override public String importedMarkdown(String uri) {
        if (uri == null || !uri.matches("content/modules/[A-Za-z0-9_-]+\\.md")) throw new Failure(409, "Imported Markdown is unavailable. Restore the source content before intake.");
        try (var input = JpaModuleAuthoringAdapter.class.getResourceAsStream("/catalog-import/" + uri)) {
            if (input == null) throw new Failure(409, "Imported Markdown is unavailable. Restore the source content before intake.");
            byte[] bytes = input.readNBytes(800001);
            if (bytes.length > 800000) throw new Failure(409, "Imported Markdown exceeds the supported size");
            return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
        } catch (java.io.IOException error) { throw new Failure(409, "Cannot read imported Markdown"); }
    }
    @Override public List<String> managedModuleIds() {
        return repositories.documents().moduleIds();
    }
    private String catalogText(org.neo4j.driver.Value value) {
        return value.isNull() ? null : value.asObject().toString();
    }
    private Metadata catalogMetadata(org.neo4j.driver.Value value) {
        return new Metadata(catalogText(value.get("id")), catalogText(value.get("version")),
                catalogText(value.get("status")), catalogText(value.get("reviewStatus")),
                catalogText(value.get("reviewedBy")), catalogText(value.get("reviewedAt")));
    }
    @Override public List<CatalogModule> graphModules(String org) {
        try (var session = driver.session()) {
            return session.run("""
                    MATCH (m:LearningModule)
                    WHERE m.id IS NOT NULL AND m.organizationId=$organization
                    OPTIONAL MATCH (m)-[t:TEACHES]->(s:MicroSkill) WHERE s.organizationId=$organization
                    WITH m, s, t ORDER BY s.id, t.id
                    RETURN m AS module, collect(CASE WHEN s IS NULL THEN null ELSE
                      {metadata: properties(t), skillId: s.id, skillName: s.name,
                       teachingFocus: t.teachingFocus, difficultyLevel: t.difficultyLevel} END) AS teachings
                    ORDER BY m.id
                    """, Map.of("organization", org)).list(row -> {
                var m = row.get("module");
                var teachings = row.get("teachings").asList(t -> new CatalogTeaching(catalogMetadata(t.get("metadata")),
                        catalogText(t.get("skillId")), catalogText(t.get("skillName")),
                        catalogText(t.get("teachingFocus")), catalogText(t.get("difficultyLevel"))));
                return new CatalogModule(catalogMetadata(m), catalogText(m.get("title")), catalogText(m.get("moduleType")),
                        catalogText(m.get("contentUri")), catalogText(m.get("contentType")), catalogText(m.get("contentVersion")),
                        m.get("duration").isNull() ? null : m.get("duration").asNumber().intValue(),
                        m.get("price").isNull() ? null : new java.math.BigDecimal(m.get("price").asNumber().toString()), teachings);
            });
        }
    }
    @Override public Optional<Document> lock(String org, String id) {
        return repositories.documents().lockDocument(org, id).stream().map(document -> read(document, Document.class)).findFirst();
    }
    @Override public void save(Document doc) {
        repositories.documents().saveDocument(doc.organizationId(), doc.id(), json(doc));
    }
    @Override public void delete(Document doc) { repositories.documents().deleteDocument(doc.organizationId(), doc.id()); }
    @Override public List<Content> contents(String org) {
        return mutable(repositories.contents().documents(org).stream().map(document -> read(document, Content.class)).toList());
    }
    @Override public void saveContent(String org, Content content) {
        repositories.contents().insert(new ModuleAuthoringContentEntity(org, content.id(), json(content)));
    }
    @Override public List<Choice> catalog(String kind) {
        if (kind.equals("ReleasedModule")) return mutable(repositories.documents().releasedModules(actor().organizationId()).stream()
                .map(row -> new Choice((String) row[0], (String) row[1])).toList());
        if (kind.equals("Staff")) return repositories.directory().staff(actor().organizationId());
        if (kind.equals("Employee")) return repositories.directory().employees(actor().organizationId());
        if (kind.equals("Expert")) return repositories.directory().experts(actor().organizationId());
        if (!Set.of("Occupation", "MicroSkill").contains(kind)) throw new IllegalArgumentException("Unknown catalog");
        try (var session = driver.session()) {
            return session.run("MATCH (n:" + kind + ") WHERE n.status <> 'ARCHIVED' AND n.id IS NOT NULL AND n.name IS NOT NULL RETURN n.id AS id,n.name AS name ORDER BY name")
                    .list(r -> new Choice(r.get("id").asString(), r.get("name").asString()));
        }
    }
    private Map<String, Object> metadata(Metadata m) {
        Map<String, Object> properties = new HashMap<>(); properties.put("id", m.id()); properties.put("version", m.version());
        properties.put("status", m.status()); properties.put("reviewStatus", m.reviewStatus());
        properties.put("reviewedBy", m.reviewedBy()); properties.put("reviewedAt", m.reviewedAt()); return properties;
    }
    @Override public void project(Document doc, Revision revision, boolean archived) {
        var p = revision.payload(); Map<String, Object> properties = metadata(p.metadata());
        properties.putAll(Map.of("title", p.title(), "moduleType", p.moduleType(), "contentUri", p.contentUri(),
                "contentType", p.contentType(), "contentVersion", p.contentVersion(), "duration", p.duration(), "price", p.price().doubleValue()));
        List<Map<String, Object>> teachings = p.teachings().stream().map(t -> {
            Map<String, Object> props = metadata(t.metadata()); props.put("teachingFocus", t.teachingFocus()); props.put("difficultyLevel", t.difficultyLevel());
            return Map.<String, Object>of("skillId", t.skillId(), "props", props);
        }).toList();
        try (var session = driver.session()) {
            session.executeWrite(tx -> {
                // Lock the existing node before comparing the source snapshot and replacing it.
                if (doc.intake() != null && !doc.everReleased()) {
                    tx.run("MATCH (m:LearningModule {id:$id}) SET m.id=m.id", Map.of("id", doc.id())).consume();
                    var source = doc.intake().source();
                    Map<String, Object> expected = metadata(source.metadata());
                    expected.putAll(Map.of("title", source.title(), "moduleType", source.moduleType(), "contentUri", source.contentUri(),
                            "contentType", source.contentType(), "contentVersion", source.contentVersion(), "duration", source.duration(), "price", source.price().doubleValue()));
                    var originalTeachings = source.teachings().stream().map(t -> {
                        Map<String, Object> props = metadata(t.metadata()); props.put("teachingFocus", t.teachingFocus()); props.put("difficultyLevel", t.difficultyLevel());
                        return Map.<String, Object>of("skillId", t.skillId(), "props", props);
                    }).toList();
                    boolean original = matchesSnapshot(tx, doc.id(), doc.organizationId(), expected, originalTeachings);
                    boolean alreadyPublished = matchesSnapshot(tx, doc.id(), doc.organizationId(), properties, teachings);
                    if (!original && !alreadyPublished) throw new Failure(409, "Catalog changed since intake; publication requires reconciliation");
                }
                Neo4jTenantGuard.requireOwnedOrAbsent(tx, "LearningModule", doc.id(), doc.organizationId());
                long endpoints = tx.run("MATCH (s:MicroSkill) WHERE s.id IN $ids AND s.organizationId=$organization RETURN count(DISTINCT s.id) AS n", Map.of("ids", p.teachings().stream().map(Teaching::skillId).toList(), "organization", doc.organizationId())).single().get("n").asLong();
                if (endpoints != teachings.size()) throw new Failure(409, "A mapped skill no longer exists");
                if (!archived) {
                    boolean removesProvider = tx.run("""
                        MATCH (m:LearningModule {id:$id})-[t:TEACHES]->(s:MicroSkill)
                        WHERE t.teachingFocus='PRIMARY' AND NOT s.id IN $primary
                        AND NOT EXISTS { MATCH (other:LearningModule)-[provider:TEACHES]->(s)
                          WHERE other.id<>$id AND other.status='ACTIVE' AND other.reviewStatus='APPROVED'
                            AND provider.status='ACTIVE' AND provider.reviewStatus='APPROVED' AND provider.teachingFocus='PRIMARY' }
                        RETURN count(s)>0 AS missing
                        """, Map.of("id", doc.id(), "primary", p.teachings().stream().filter(t -> t.teachingFocus().equals("PRIMARY")).map(Teaching::skillId).toList()))
                            .single().get("missing").asBoolean();
                    if (removesProvider) throw new Failure(409, "Revision would remove a required primary skill provider");
                }
                // Graph and PostgreSQL snapshots deliberately keep independent revision identities.
                tx.run("MERGE (m:LearningModule {id:$id}) SET m=$props, m.organizationId=$organization", Map.of("id", doc.id(), "props", properties, "organization", doc.organizationId())).consume();
                tx.run("MATCH (m:LearningModule {id:$id})-[t:TEACHES]->(s:MicroSkill) WHERE NOT s.id IN $ids DELETE t", Map.of("id", doc.id(), "ids", p.teachings().stream().map(Teaching::skillId).toList())).consume();
                tx.run("MATCH (m:LearningModule {id:$id}) WHERE m.organizationId=$organization UNWIND $teachings AS item MATCH (s:MicroSkill {id:item.skillId}) WHERE s.organizationId=$organization MERGE (m)-[t:TEACHES]->(s) SET t=item.props", Map.of("id", doc.id(), "teachings", teachings, "organization", doc.organizationId())).consume();
                return null;
            });
        }
    }
    private boolean matchesSnapshot(org.neo4j.driver.TransactionContext tx, String id, String organization, Map<String, Object> props, List<Map<String, Object>> teachings) {
        return tx.run("""
                MATCH (m:LearningModule {id:$id})
                WHERE m.organizationId=$organization AND all(k IN keys($props) WHERE m[k]=$props[k] OR (m[k] IS NULL AND $props[k] IS NULL))
                OPTIONAL MATCH (m)-[t:TEACHES]->(s:MicroSkill)
                WITH collect(CASE WHEN t IS NULL THEN null ELSE {skillId:s.id,props:properties(t)} END) AS actual
                RETURN size(actual)=size($teachings) AND all(item IN $teachings WHERE any(a IN actual WHERE a.skillId=item.skillId
                  AND all(k IN keys(item.props) WHERE a.props[k]=item.props[k] OR (a.props[k] IS NULL AND item.props[k] IS NULL)))) AS matches
                """, Map.of("id", id, "organization", organization, "props", props, "teachings", teachings)).single().get("matches").asBoolean();
    }
    @Override public boolean referenced(Document doc) {
        long pins = repositories.pins().countByModule(doc.organizationId(), doc.id());
        try (var session = driver.session()) {
            boolean graph = session.run("MATCH (m:LearningModule {id:$id}) RETURN count(m)>0 AS found", Map.of("id", doc.id())).single().get("found").asBoolean();
            return graph || pins > 0;
        }
    }
    @Override public boolean retainsCoverage(Document doc) {
        try (var session = driver.session()) {
            return session.run("""
                MATCH (m:LearningModule {id:$id})-[t:TEACHES]->(s:MicroSkill)
                WHERE t.teachingFocus='PRIMARY'
                AND NOT EXISTS { MATCH (other:LearningModule)-[provider:TEACHES]->(s)
                  WHERE other.id<>$id AND other.status='ACTIVE' AND other.reviewStatus='APPROVED'
                    AND provider.status='ACTIVE' AND provider.reviewStatus='APPROVED' AND provider.teachingFocus='PRIMARY' }
                RETURN count(s)=0 AS safe
                """, Map.of("id", doc.id())).single().get("safe").asBoolean();
        }
    }
    @Override public void pin(String org, String learner, String id, int revision) {
        repositories.pins().pin(org, learner, id, revision);
    }
    @Override public Optional<Integer> pinned(String org, String learner, String id) {
        return repositories.pins().revision(org, learner, id).stream().findFirst();
    }
    private static <T> List<T> mutable(List<T> values) { return new ArrayList<>(values); }
}
