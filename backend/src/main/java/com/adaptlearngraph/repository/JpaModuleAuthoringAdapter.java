package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.ModuleAuthoringContentEntity;
import com.adaptlearngraph.entities.ModuleGrantAuditEntity;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import com.adaptlearngraph.entities.ModuleAuthoring.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import java.util.function.Supplier;

/** Module authoring documents in PostgreSQL through Spring Data JPA; the published catalog projection stays in Neo4j ({@link Neo4jModuleCatalogGraph}). */
public final class JpaModuleAuthoringAdapter implements ModuleAuthoringPort {
    private final ModuleAuthoringRepositories repositories;
    private final TransactionTemplate transactions;
    private final ObjectMapper mapper;
    private final Neo4jModuleCatalogGraph graph;
    private final String organizationId;
    /** {@code transactions} must run on the JPA transaction manager so repository calls join the advisory-locked transaction. */
    public JpaModuleAuthoringAdapter(ModuleAuthoringRepositories repositories, TransactionTemplate transactions, ObjectMapper mapper, Neo4jModuleCatalogGraph graph, String organizationId) {
        this.repositories = repositories; this.transactions = transactions; this.mapper = mapper; this.graph = graph; this.organizationId = organizationId;
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
    @Override public List<CatalogModule> graphModules(String org) {
        return graph.modules(org);
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
        return graph.choices(kind);
    }
    @Override public void project(Document doc, Revision revision, boolean archived) {
        graph.project(doc, revision, archived);
    }
    @Override public boolean referenced(Document doc) {
        long pins = repositories.pins().countByModule(doc.organizationId(), doc.id());
        boolean found = graph.exists(doc.id());
        return found || pins > 0;
    }
    @Override public boolean retainsCoverage(Document doc) {
        return graph.retainsCoverage(doc.id());
    }
    @Override public void pin(String org, String learner, String id, int revision) {
        repositories.pins().pin(org, learner, id, revision);
    }
    @Override public Optional<Integer> pinned(String org, String learner, String id) {
        return repositories.pins().revision(org, learner, id).stream().findFirst();
    }
    private static <T> List<T> mutable(List<T> values) { return new ArrayList<>(values); }
}
