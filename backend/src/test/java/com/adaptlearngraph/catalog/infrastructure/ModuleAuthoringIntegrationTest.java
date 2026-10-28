package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.Neo4jContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class ModuleAuthoringIntegrationTest {
    private void actor(String id, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(id, "test", List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }
    @Test void readsGraphCatalogWithoutAuthoringHistoryAndMapsEverySchemaField() {
        try (var pg = new PostgreSQLContainer<>("postgres:17.6-alpine"); var graph = new Neo4jContainer<>("neo4j:5.26-community")
                .withEnv("NEO4J_server_memory_heap_initial__size", "128m")
                .withEnv("NEO4J_server_memory_heap_max__size", "384m")
                .withEnv("NEO4J_server_memory_pagecache_size", "128m")
                .withEnv("NEO4J_server_jvm_additional", "-XX:ActiveProcessorCount=2")
                .waitingFor(org.testcontainers.containers.wait.strategy.Wait.forLogMessage(".*Started\\..*\\n", 1))
                .withStartupTimeout(java.time.Duration.ofMinutes(5))) {
            pg.start(); graph.start();
            var ds = new DriverManagerDataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
            var jdbc = new JdbcTemplate(ds); jdbc.execute("CREATE SCHEMA platform");
            new ResourceDatabasePopulator(new ClassPathResource("db/migration/V27__module_authoring.sql"), new ClassPathResource("db/migration/V28__module_catalog_intake.sql")).execute(ds);
            try (var driver = GraphDatabase.driver(graph.getBoltUrl(), AuthTokens.basic("neo4j", graph.getAdminPassword()))) {
                try (var session = driver.session()) {
                    session.run("""
                        CREATE (s:MicroSkill {id:'skill',name:'Existing skill'})
                        CREATE (m:LearningModule {id:'legacy',title:'Existing lesson',version:'0.11.0',status:'ACTIVE',
                          reviewStatus:'APPROVED',reviewedBy:'reviewer',reviewedAt:'2026-10-28T00:00:00Z',
                          moduleType:'RESOURCE_GUIDED_PRACTICE',contentUri:'https://example.org/existing.md',
                          contentType:'text/markdown',contentVersion:'1.3',duration:37,price:123456.5})
                        CREATE (m)-[:TEACHES {id:'edge',version:'0.11.0',status:'ACTIVE',reviewStatus:'APPROVED',
                          reviewedBy:'reviewer',reviewedAt:'2026-10-28T00:00:00Z',teachingFocus:'PRIMARY',difficultyLevel:'MEDIUM'}]->(s)
                        CREATE (:LearningModule {id:'incomplete'})
                        CREATE (:LearningModule {id:'foreign',organizationId:'foreign-org',title:'Private'})
                        """).consume();
                }
                var adapter = new JdbcModuleAuthoringAdapter(jdbc, new TransactionTemplate(new DataSourceTransactionManager(ds)), new ObjectMapper(), driver, "org");
                var service = new ModuleAuthoringService(adapter);
                actor("expert-a", "EXPERT");
                CatalogPage result = service.catalogList("Existing", "ACTIVE", "APPROVED", "RESOURCE_GUIDED_PRACTICE", "skill", 1);
                assertEquals(1, result.total()); assertNull(result.items().getFirst().authoring());
                CatalogModule module = result.items().getFirst().module();
                assertEquals(new Metadata("legacy", "0.11.0", "ACTIVE", "APPROVED", "reviewer", "2026-10-28T00:00:00Z"), module.metadata());
                assertEquals("Existing lesson", module.title()); assertEquals("RESOURCE_GUIDED_PRACTICE", module.moduleType());
                assertEquals("https://example.org/existing.md", module.contentUri()); assertEquals("text/markdown", module.contentType());
                assertEquals("1.3", module.contentVersion()); assertEquals(37, module.duration()); assertEquals(new BigDecimal("123456.5"), module.price());
                var edge = module.teachings().getFirst();
                assertEquals(new Metadata("edge", "0.11.0", "ACTIVE", "APPROVED", "reviewer", "2026-10-28T00:00:00Z"), edge.metadata());
                assertEquals("PRIMARY", edge.teachingFocus()); assertEquals("MEDIUM", edge.difficultyLevel());
                assertEquals("skill", edge.skillId()); assertEquals("Existing skill", edge.skillName());
                assertEquals(2, service.catalogList("", "", "", "", "", 1).total());
                CatalogModule incomplete = service.catalogList("incomplete", "", "", "", "", 1).items().getFirst().module();
                assertNull(incomplete.title()); assertNull(incomplete.price()); assertNull(incomplete.duration());
                assertNull(incomplete.metadata().reviewStatus()); assertTrue(incomplete.teachings().isEmpty());
                assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM platform.module_authoring", Integer.class));
                try (var session = driver.session()) {
                    session.run("CREATE (:Occupation {id:'occ',name:'Occupation',status:'ACTIVE'})").consume();
                    session.run("MATCH (m:LearningModule {id:'legacy'}) SET m.contentUri='content/modules/MOD-FOCUS-SEC01-HIGH.md'").consume();
                }
                actor("reviewer", "LD_MANAGER");
                Intake assigned = service.assignIntake("legacy", List.of("occ"));
                adapter.grant("org", "expert-a", "occ", true);
                actor("unassigned", "EXPERT");
                assertThrows(ModuleAuthoringService.Failure.class, () -> service.acceptIntake("legacy"));
                actor("expert-a", "EXPERT");
                Document received = service.acceptIntake("legacy");
                assertEquals(received, service.detail("legacy")); assertNull(received.createdBy());
                assertEquals(assigned.source(), received.intake().source());
                assertEquals("expert-a", received.intake().acceptedBy()); assertNotNull(received.intake().acceptedAt());
                assertTrue(received.current().payload().content().markdown().contains("Primary task"));
                assertEquals("edge", received.current().payload().teachings().getFirst().metadata().id());
                assertEquals(assigned.source(), adapter.graphModules("org").stream().filter(m -> m.metadata().id().equals("legacy")).findFirst().orElseThrow());
                assertThrows(ModuleAuthoringService.Failure.class, () -> service.acceptIntake("legacy"));
                assertThrows(ModuleAuthoringService.Failure.class, () -> service.delete(received.id(), received.lockVersion()));
                Document submitted = service.action("legacy", received.lockVersion(), "submit", null);
                actor("reviewer", "LD_MANAGER");
                try (var session = driver.session()) { session.run("MATCH (m:LearningModule {id:'legacy'}) SET m.title='External change'").consume(); }
                assertThrows(ModuleAuthoringService.Failure.class, () -> service.action("legacy", submitted.lockVersion(), "approve", null));
                assertEquals("SUBMITTED", service.detail("legacy").current().state());
                try (var session = driver.session()) { session.run("MATCH (m:LearningModule {id:'legacy'}) SET m.title='Existing lesson'").consume(); }
                Document published = service.action("legacy", submitted.lockVersion(), "approve", null);
                assertEquals("RELEASED", published.current().state()); assertEquals(received.intake(), published.intake());
                var projected = adapter.graphModules("org").stream().filter(m -> m.metadata().id().equals("legacy")).findFirst().orElseThrow();
                assertEquals("APPROVED", projected.metadata().reviewStatus()); assertEquals("reviewer", projected.metadata().reviewedBy());
                assertEquals("edge", projected.teachings().getFirst().metadata().id());
                assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM platform.module_catalog_intake", Integer.class));
                // The first publication may already have reached Neo4j when SQL confirmation fails.
                adapter.project(submitted, published.current(), false);
                assertEquals(published, service.detail("legacy"));
                try (var session = driver.session()) { session.run("MATCH (m:LearningModule {id:'legacy'}) SET m.organizationId='foreign-org'").consume(); }
                assertThrows(ModuleAuthoringService.Failure.class, () -> adapter.project(submitted, published.current(), false));
                try (var session = driver.session()) { session.run("MATCH (m:LearningModule {id:'legacy'}) REMOVE m.organizationId").consume(); }

                assertThrows(ModuleAuthoringService.Failure.class, () -> adapter.importedMarkdown("content/modules/../../secret.md"));
                assertThrows(ModuleAuthoringService.Failure.class, () -> adapter.importedMarkdown("https://example.org/source.md"));
                assertThrows(ModuleAuthoringService.Failure.class, () -> adapter.importedMarkdown("content/modules/missing-file.md"));


            } finally { SecurityContextHolder.clearContext(); }
        }
    }
    @Test void roundTripsAllFieldsRevisionsGrantsAuditPinsAndRetriesAcrossRealStores() {
        try (var pg = new PostgreSQLContainer<>("postgres:17.6-alpine"); var graph = new Neo4jContainer<>("neo4j:5.26-community")
                .withEnv("NEO4J_server_memory_heap_initial__size", "128m")
                .withEnv("NEO4J_server_memory_heap_max__size", "384m")
                .withEnv("NEO4J_server_memory_pagecache_size", "128m")
                .withEnv("NEO4J_server_jvm_additional", "-XX:ActiveProcessorCount=2")
                .waitingFor(org.testcontainers.containers.wait.strategy.Wait.forLogMessage(".*Started\\..*\\n", 1))
                .withStartupTimeout(java.time.Duration.ofMinutes(5))) {
            pg.start(); graph.start();
            var ds = new DriverManagerDataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
            var jdbc = new JdbcTemplate(ds); jdbc.execute("CREATE SCHEMA platform");
            jdbc.execute("CREATE TABLE platform.account(account_id text, identifier text, organization_id text, active boolean)");
            jdbc.execute("CREATE TABLE platform.account_role(account_id text, role_code text)");
            jdbc.execute("INSERT INTO platform.account VALUES ('expert-a','Expert A','org',true),('expert-b','Expert B','org',true),('foreign-expert','Foreign','foreign-org',true),('inactive-expert','Inactive','org',false)");
            jdbc.execute("INSERT INTO platform.account_role VALUES ('expert-a','DOMAIN_EXPERT'),('expert-b','DOMAIN_EXPERT'),('foreign-expert','DOMAIN_EXPERT'),('inactive-expert','DOMAIN_EXPERT')");
            new ResourceDatabasePopulator(new ClassPathResource("db/migration/V27__module_authoring.sql"), new ClassPathResource("db/migration/V28__module_catalog_intake.sql")).execute(ds);
            try (var driver = GraphDatabase.driver(graph.getBoltUrl(), AuthTokens.basic("neo4j", graph.getAdminPassword()))) {
                try (var session = driver.session()) {
                    session.run("CREATE (:Occupation {id:'occ',name:'Occupation',status:'ACTIVE'}), (:MicroSkill {id:'skill',name:'Skill',status:'ACTIVE'}), (:MicroSkill {id:'support',name:'Support',status:'ACTIVE'})").consume();
                }
                var adapter = new JdbcModuleAuthoringAdapter(jdbc, new TransactionTemplate(new DataSourceTransactionManager(ds)), new ObjectMapper(), driver, "org");
                var service = new ModuleAuthoringService(adapter);
                actor("reviewer", "LD_MANAGER"); assertEquals(Set.of("expert-a", "expert-b"), new HashSet<>(adapter.catalog("Expert").stream().map(Choice::id).toList())); service.grant("expert-a", "occ", true); service.grant("expert-b", "occ", true);
                actor("expert-a", "EXPERT");
                Content content = service.content("Lesson", "# A lesson\n[video](https://example.org/lesson.mp4)", List.of("occ"));
                Save input = new Save("Module", "LESSON_AND_PRACTICE", content.id(), 120, new BigDecimal("150000"), List.of("occ"), List.of(
                        new TeachingInput("skill", "PRIMARY", "HIGH"), new TeachingInput("support", "SUPPORTING", "LOW")));
                Document doc = service.create(input);
                assertEquals(doc, service.detail(doc.id()));
                actor("expert-b", "EXPERT"); doc = service.update(doc.id(), doc.lockVersion(), input);
                assertEquals("expert-a", doc.createdBy()); assertEquals("expert-b", doc.current().editedBy());
                doc = service.action(doc.id(), doc.lockVersion(), "submit", null);
                actor("reviewer", "LD_MANAGER"); doc = service.action(doc.id(), doc.lockVersion(), "approve", null);
                Document released = service.detail(doc.id()); assertEquals(doc, released); assertEquals("RELEASED", released.current().state());
                assertEquals(2, released.revisions().size());
                try (var session = driver.session()) {
                    var row = session.run("MATCH (m:LearningModule {id:$id})-[t:TEACHES]->(s) RETURN properties(m) AS m,collect(properties(t)) AS edges", Map.of("id", doc.id())).single();
                    var m = row.get("m");
                    assertEquals(13, m.size());
                    assertEquals(doc.id(), m.get("id").asString()); assertEquals("0.11.0", m.get("version").asString());
                    assertEquals("ACTIVE", m.get("status").asString()); assertEquals("APPROVED", m.get("reviewStatus").asString());
                    assertEquals("reviewer", m.get("reviewedBy").asString()); assertFalse(m.get("reviewedAt").asString().isBlank());
                    assertEquals("Module", m.get("title").asString()); assertEquals("LESSON_AND_PRACTICE", m.get("moduleType").asString());
                    assertEquals("module-content:" + content.id(), m.get("contentUri").asString()); assertEquals("text/markdown", m.get("contentType").asString());
                    assertEquals("1.0", m.get("contentVersion").asString()); assertEquals(120, m.get("duration").asInt()); assertEquals(150000, m.get("price").asDouble());
                    for (var edge : row.get("edges").values()) {
                        assertEquals(8, edge.size());
                        for (String field : List.of("id", "version", "status", "reviewStatus", "reviewedBy", "reviewedAt", "teachingFocus", "difficultyLevel")) assertFalse(edge.get(field).asString().isBlank());
                    }
                }
                actor("learner", "EMPLOYEE"); Revision pinned = service.learning(doc.id(), true);
                assertEquals("Module", pinned.payload().title());
                actor("expert-a", "EXPERT");
                doc = service.action(doc.id(), doc.lockVersion(), "request-archive", null);
                actor("reviewer", "LD_MANAGER"); Document archiveRequest = doc;
                assertThrows(ModuleAuthoringService.Failure.class, () -> service.action(archiveRequest.id(), archiveRequest.lockVersion(), "approve-archive", null));
                actor("expert-a", "EXPERT");
                // A second approved primary provider is needed before archiving the first.
                Document alternative = service.create(input); alternative = service.action(alternative.id(), alternative.lockVersion(), "submit", null);
                actor("reviewer", "LD_MANAGER"); service.action(alternative.id(), alternative.lockVersion(), "approve", null);
                actor("reviewer", "LD_MANAGER"); doc = service.action(doc.id(), doc.lockVersion(), "approve-archive", null); assertTrue(doc.archived());
                actor("learner", "EMPLOYEE"); assertEquals(pinned.payload().content(), service.learning(doc.id(), false).payload().content());
                actor("new-learner", "EMPLOYEE"); String id = doc.id(); assertThrows(ModuleAuthoringService.Failure.class, () -> service.learning(id, true));
                actor("expert-a", "EXPERT"); doc = service.action(doc.id(), doc.lockVersion(), "restore", null);
                assertEquals("DRAFT", doc.current().state()); assertEquals(3, doc.revisions().size());
                actor("reviewer", "LD_MANAGER"); service.grant("expert-b", "occ", false);
                actor("expert-b", "EXPERT"); assertThrows(ModuleAuthoringService.Failure.class, () -> service.detail(id));
                assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM platform.module_grant_audit", Integer.class));
                var foreign = new JdbcModuleAuthoringAdapter(jdbc, new TransactionTemplate(new DataSourceTransactionManager(ds)), new ObjectMapper(), driver, "foreign-org");
                assertTrue(foreign.documents("foreign-org").isEmpty());
            } finally { SecurityContextHolder.clearContext(); }
        }
    }
}
