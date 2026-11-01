package com.adaptlearngraph.development;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.*;
import com.adaptlearngraph.catalog.infrastructure.JdbcModuleAuthoringAdapter;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.GraphDatabase;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionTemplate;

/** User-authorized local snapshot adoption. Never runs from a web endpoint or normal startup. */
public final class DevModulesAdoption {
    private static String env(String key) { return Objects.requireNonNull(System.getenv(key), key); }
    private static void actor(String id, String organization, String role) {
        var auth = UsernamePasswordAuthenticationToken.authenticated(id, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        auth.setDetails(Map.of("organizationId", organization)); SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private static List<Event> resequence(List<Event> source) {
        List<Event> result = new ArrayList<>();
        for (Event event : source) result.add(new Event(result.size()+1, event.revision(), event.action(), event.actorId(), event.occurredAt(), event.detail()));
        return result;
    }
    private static void restorePendingHistory(com.fasterxml.jackson.databind.JsonNode saved, ObjectMapper json,
            JdbcModuleAuthoringAdapter port, String organization, String manager) {
        for (var row : saved.get("module_catalog_intake")) {
            try {
                Intake old = json.treeToValue(row.get("document"), Intake.class);
                if (old.acceptedBy() != null || old.history().isEmpty()) continue;
                Document doc = port.lock(organization, old.moduleId()).orElseThrow();
                Event first = old.history().getFirst();
                if (doc.history().stream().anyMatch(e -> e.actorId().equals(first.actorId()) && e.occurredAt().equals(first.occurredAt()) && e.action().equals(first.action()))) continue;
                var history = new ArrayList<>(old.history()); history.addAll(doc.history());
                history.add(new Event(0, doc.current().number(), "HISTORY_RESTORED", manager, java.time.Instant.now().toString(), "Retained the original pending intake assignment history from the source snapshot"));
                var intakeHistory = new ArrayList<>(old.history()); intakeHistory.addAll(doc.intake().history());
                Intake current = doc.intake();
                Intake intake = new Intake(current.moduleId(), organization, current.occupationIds(), current.assignedBy(), current.assignedAt(), current.source(), current.acceptedBy(), current.acceptedAt(), resequence(intakeHistory), current.expertId());
                port.saveIntake(intake);
                port.save(new Document(doc.id(), organization, doc.occupationIds(), doc.createdBy(), doc.createdAt(), doc.lockVersion()+1, doc.everReleased(), doc.archived(), doc.releasedRevision(), doc.revisions(), resequence(history), intake));
            } catch (Exception e) { throw new IllegalStateException("Could not retain original pending assignment history", e); }
        }
    }
    public static void main(String[] args) throws Exception {
        String url = env("DEV_ACCOUNTS_DB_URL");
        if (!"true".equals(env("DEV_ACCOUNTS_SEED_ALLOWED")) || !url.matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/adapt_learn_graph_dev_accounts")) throw new IllegalStateException("Dedicated local database required");
        var ds = new DriverManagerDataSource(url, env("DEV_ACCOUNTS_DB_USER"), env("DEV_ACCOUNTS_DB_PASSWORD"));
        var jdbc = new JdbcTemplate(ds); var tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
        String expert = jdbc.queryForObject("SELECT account_id::text FROM platform.account WHERE normalized_identifier='expert@example.test'", String.class);
        String manager = jdbc.queryForObject("SELECT account_id::text FROM platform.account WHERE normalized_identifier='ld.manager@example.test'", String.class);
        String org = jdbc.queryForObject("SELECT organization_id::text FROM platform.account WHERE account_id::text=?", String.class, expert);
        var json = new ObjectMapper(); var saved = json.readTree(Files.readString(Path.of(env("DEV_MODULE_SNAPSHOT"))));
        try (var driver = GraphDatabase.driver("bolt://127.0.0.1:28187", AuthTokens.basic("neo4j", env("DEV_ACCOUNTS_NEO4J_PASSWORD")))) {
            var port = new JdbcModuleAuthoringAdapter(jdbc, tx, json, driver, org);
            var service = new ModuleAuthoringService(port);
            actor(expert, org, "EXPERT");
            tx.executeWithoutResult(outer -> {
            boolean first = jdbc.queryForObject("SELECT count(*) FROM platform.audit_event WHERE action='DEV_MODULES_ADOPTED'", Integer.class) == 0;
            if (!first) { restorePendingHistory(saved, json, port, org, manager); System.out.println("Existing adoption receipt verified; prior assignment history retained."); return; }
            if (jdbc.queryForObject("SELECT count(*) FROM platform.module_authoring", Integer.class) != 0) throw new IllegalStateException("Target authoring must be empty before first snapshot adoption");
            tx.executeWithoutResult(status -> {
                for (var row : saved.get("module_authoring_content")) {
                    try { port.saveContent(org, json.treeToValue(row.get("document"), Content.class)); }
                    catch (Exception e) { throw new IllegalStateException("Invalid saved content", e); }
                }
                for (var row : saved.get("module_authoring")) {
                    try {
                        Document old = json.treeToValue(row.get("document"), Document.class);
                        String now = java.time.Instant.now().toString();
                        var history = new ArrayList<>(old.history());
                        history.add(new Event(history.size()+1, old.current().number(), "OWNER_ASSIGNED", manager, now,
                                "Local migration: responsible Expert assigned to expert@example.test; previous createdBy=" + old.createdBy() + "; earlier revisions and decisions preserved"));
                        Intake intake = old.intake() == null ? null : new Intake(old.id(), org, old.intake().occupationIds(), old.intake().assignedBy(), old.intake().assignedAt(), old.intake().source(), old.intake().acceptedBy(), old.intake().acceptedAt(), old.intake().history(), expert);
                        Document doc = new Document(old.id(), org, old.occupationIds(), expert, old.createdAt(), old.lockVersion()+1,
                                old.everReleased(), old.archived(), old.releasedRevision(), old.revisions(), history, intake);
                        port.save(doc); if (intake != null) port.saveIntake(intake);
                    } catch (Exception e) { throw new IllegalStateException("Invalid saved module", e); }
                }
            });
            actor(manager, org, "LD_MANAGER");
            for (Choice occupation : port.catalog("Occupation")) service.grant(expert, occupation.id(), true);
            List<String> occupations = port.catalog("Occupation").stream().map(Choice::id).toList();
            if (occupations.isEmpty()) throw new IllegalStateException("Source catalog has no Occupation");
            // All source catalog modules are handed to the selected Expert, never auto-approved or graph-rewritten.
            int imported = 0;
            for (CatalogModule module : port.graphModules(org)) {
                if (port.managedModuleIds().contains(module.metadata().id())) continue;
                actor(manager, org, "LD_MANAGER");
                List<String> relevant;
                try (var session = driver.session()) {
                    relevant = session.run("MATCH (m:LearningModule {id:$id})-[:TEACHES]->(:MicroSkill)<-[:REQUIRES_SKILL]-(:Level)<-[:HAS_LEVEL]-(:TargetRole)<-[:HAS_ROLE]-(o:Occupation) RETURN DISTINCT o.id AS id ORDER BY id", Map.of("id", module.metadata().id())).list(row -> row.get("id").asString());
                }
                if (relevant.isEmpty()) throw new IllegalStateException("Cannot infer catalog scope for " + module.metadata().id());
                service.assignIntake(module.metadata().id(), relevant, null, expert);
                actor(expert, org, "EXPERT"); service.acceptIntake(module.metadata().id()); imported++;
            }
            restorePendingHistory(saved, json, port, org, manager);
            jdbc.update("INSERT INTO platform.audit_event(audit_event_id,service_name,action,resource_id,occurred_at,outcome,correlation_id) VALUES (?,'LOCAL_DEV_MIGRATION','DEV_MODULES_ADOPTED',?,now(),'SUCCEEDED',?)", UUID.randomUUID(), UUID.fromString(org), UUID.randomUUID());
            System.out.println("Preserved " + saved.get("module_authoring").size() + " historical documents; received " + imported + " catalog modules. Owner: expert@example.test. Graph and prior revisions unchanged.");
            });
        } finally { SecurityContextHolder.clearContext(); }
    }
}
