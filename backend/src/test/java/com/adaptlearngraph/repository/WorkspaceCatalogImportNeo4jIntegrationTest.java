package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.adaptlearngraph.entities.domain.JobPosition;
import com.adaptlearngraph.exception.CrossTenantWriteException;
import com.adaptlearngraph.services.PlatformCatalogService;
import com.adaptlearngraph.services.WorkspaceCatalogImportWorker;
import com.adaptlearngraph.support.Neo4jTestContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.slf4j.LoggerFactory;
import org.testcontainers.containers.Neo4jContainer;

/** Real Neo4j copy of the platform template into two organizations, including reads through tenant-scoped adapters. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class WorkspaceCatalogImportNeo4jIntegrationTest {
    private final Neo4jContainer<?> graph = new Neo4jContainer<>("neo4j:5.26-community");
    private Driver driver;
    private Neo4jTestContext persistence;
    private PlatformCatalogTemplate template;
    private PlatformCatalogService catalog;
    private Neo4jWorkspaceCatalogWriter writer;

    @BeforeAll
    void start() throws Exception {
        graph.start();
        driver = GraphDatabase.driver(graph.getBoltUrl(), AuthTokens.basic("neo4j", graph.getAdminPassword()));
        try (var session = driver.session()) {
            for (String label : List.of("JobPosition", "TargetRole", "Level", "Competency", "MicroSkill", "LearningModule"))
                session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:" + label + ") REQUIRE n.id IS UNIQUE").consume();
        }
        try (var input = getClass().getResourceAsStream("/platform-catalog/template-fixture.json")) {
            template = new PlatformCatalogTemplate(input.readAllBytes(), new ObjectMapper());
        }
        catalog = new PlatformCatalogService(() -> Optional.of(template));
        persistence = Neo4jTestContext.start(driver);
        writer = new Neo4jWorkspaceCatalogWriter(persistence::cypher);
    }

    @AfterAll
    void stop() {
        if (persistence != null) persistence.close();
        if (driver != null) driver.close();
        graph.stop();
    }

    private void copy(String organization, List<String> selection) {
        var closure = catalog.closure(selection);
        writer.copy(organization, closure.templateVersion(), closure.nodeIds().stream().map(template.nodes()::get).toList(), closure.edges());
    }

    private long count(String query, Map<String, Object> parameters) {
        try (var session = driver.session()) {
            return session.run(query, parameters).single().get(0).asLong();
        }
    }

    @Test
    void twoOrganizationsReceiveIndependentIdempotentCopiesReadOnlyThroughTheirOwnScope() {
        String a = UUID.randomUUID().toString(), b = UUID.randomUUID().toString();
        copy(a, List.of("ROLE-A"));
        copy(a, List.of("ROLE-A"));
        copy(b, List.of("ROLE-A"));

        for (String org : List.of(a, b)) {
            assertThat(count("MATCH (n {organizationId:$org}) RETURN count(n)", Map.of("org", org))).isEqualTo(10);
            assertThat(count("MATCH ()-[r {organizationId:$org}]->() RETURN count(r)", Map.of("org", org))).isEqualTo(10);
            assertThat(count("MATCH (x {organizationId:$org})-[r]-(y) WHERE coalesce(y.organizationId,'') <> $org RETURN count(r)",
                    Map.of("org", org))).as("no relationship crosses organizations").isZero();
        }
        String roleA = Neo4jWorkspaceCatalogWriter.copiedId(a, "ROLE-A");
        assertThat(roleA).isNotEqualTo(Neo4jWorkspaceCatalogWriter.copiedId(b, "ROLE-A"));
        try (var session = driver.session()) {
            var level = session.run("MATCH (l:Level {sourceId:'LV-A1', organizationId:$org}) RETURN l", Map.of("org", a)).single().get("l").asNode();
            assertThat(level.get("targetRoleId").asString()).isEqualTo(roleA);
            assertThat(level.get("sourceTemplateVersion").asString()).isEqualTo("fixture-1");
            var role = session.run("MATCH (r:TargetRole {id:$id}) RETURN r", Map.of("id", roleA)).single().get("r").asNode();
            assertThat(role.get("reviewStatus").asString()).as("review state is copied, never invented").isEqualTo("NEEDS_EXPERT_REVIEW");
            assertThat(role.get("code").asString()).isEqualTo("ROLE_A");
        }

        var jobPositions = new Neo4jJobPositionRepository(persistence.bean(JobPositionNodeRepository.class),
                persistence.client(), persistence.transactionManager());
        assertThat(jobPositions.findAllJobPositions(a)).extracting(JobPosition::id).containsExactly(Neo4jWorkspaceCatalogWriter.copiedId(a, "OCC-1"));
        assertThat(jobPositions.findAllJobPositions(b)).extracting(JobPosition::id).containsExactly(Neo4jWorkspaceCatalogWriter.copiedId(b, "OCC-1"));
        assertThat(jobPositions.findAllJobPositions("")).isEmpty();
        var skills = persistence.bean(MicroSkillNodeRepository.class);
        assertThat(new Neo4jMicroSkillRepository(skills, persistence.client(), persistence.mappingContext(),
                persistence.transactionManager()).findAll(b)).hasSize(3);
        assertThat(new Neo4jPrerequisiteRepository(skills, persistence.client(), persistence.mappingContext(),
                persistence.transactionManager()).findAll(a)).hasSize(1);

        var foreign = jobPositions.findAllJobPositions(a).getFirst();
        assertThatThrownBy(() -> jobPositions.save(b, foreign)).isInstanceOf(CrossTenantWriteException.class);
        assertThat(jobPositions.findByIdOrCode(a, foreign.id())).get().extracting(JobPosition::name).isEqualTo("JobPosition One");
        assertThat(jobPositions.findByIdOrCode(b, foreign.id())).isEmpty();
    }

    @Test
    void copyIntoWorkspaceBNeverTouchesWorkspaceANodesPropertiesOrRelationships() {
        String a = UUID.randomUUID().toString(), b = UUID.randomUUID().toString(), c = UUID.randomUUID().toString();
        copy(a, List.of("ROLE-A"));
        var before = snapshot(a);
        assertThat(before).isNotEmpty();

        copy(b, List.of("ROLE-A"));
        copy(b, List.of("MS-A"));
        assertThat(snapshot(a)).as("workspace A after copies into B").isEqualTo(before);
        assertThat(count("MATCH (x {organizationId:$a})-[r]-(y {organizationId:$b}) RETURN count(r)", Map.of("a", a, "b", b)))
                .as("no relationship connects A and B").isZero();

        // A node owned by A that already carries C's deterministic copy id: the whole copy into C is rejected and rolled back.
        String collision = Neo4jWorkspaceCatalogWriter.copiedId(c, "OCC-1");
        try (var session = driver.session()) {
            session.run("CREATE (:JobPosition {id:$id, organizationId:$a, name:'Owned by A'})", Map.of("id", collision, "a", a)).consume();
        }
        var withCollision = snapshot(a);
        assertThatThrownBy(() -> copy(c, List.of("ROLE-A"))).isInstanceOf(CrossTenantWriteException.class);
        assertThat(snapshot(a)).as("workspace A after a rejected copy into C").isEqualTo(withCollision);
        assertThat(count("MATCH (n {organizationId:$c}) RETURN count(n)", Map.of("c", c))).as("rejected copy rolled back").isZero();
        assertThat(count("MATCH ()-[r {organizationId:$c}]->() RETURN count(r)", Map.of("c", c))).isZero();
    }

    @Test
    void copyIssuesOneOwnershipCheckAndOneUnwindPerLabelAndOneUnwindPerRelationshipGroup() {
        String organization = UUID.randomUUID().toString();
        var closure = catalog.closure(List.of("ROLE-A"));
        var nodes = closure.nodeIds().stream().map(template.nodes()::get).toList();
        var labels = new java.util.HashMap<String, String>();
        nodes.forEach(node -> labels.put(node.id(), node.label()));
        long labelGroups = nodes.stream().map(PlatformCatalogTemplate.Node::label).distinct().count();
        long edgeGroups = closure.edges().stream()
                .map(edge -> edge.type() + "|" + labels.get(edge.fromId()) + "|" + labels.get(edge.toId())).distinct().count();
        assertThat(nodes.size()).as("fixture has more rows than label groups").isGreaterThan((int) labelGroups);

        var logger = (Logger) LoggerFactory.getLogger("org.springframework.data.neo4j.cypher");
        Level previous = logger.getLevel();
        var appender = new ListAppender<ILoggingEvent>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            writer.copy(organization, closure.templateVersion(), nodes, closure.edges());
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(previous);
        }
        var statements = appender.list.stream()
                .filter(event -> event.getLoggerName().equals("org.springframework.data.neo4j.cypher"))
                .map(ILoggingEvent::getFormattedMessage).toList();
        assertThat(statements).hasSize((int) (2 * labelGroups + edgeGroups));
        assertThat(statements).allSatisfy(statement -> assertThat(statement).contains("UNWIND $"));
        assertThat(count("MATCH (n {organizationId:$org}) RETURN count(n)", Map.of("org", organization))).isEqualTo(nodes.size());
        assertThat(count("MATCH ()-[r {organizationId:$org}]->() RETURN count(r)", Map.of("org", organization)))
                .isEqualTo(closure.edges().size());
    }

    private List<String> snapshot(String organization) {
        try (var session = driver.session()) {
            var nodes = session.run("""
                    MATCH (n) WHERE n.organizationId = $org
                    RETURN labels(n) AS labels, properties(n) AS props ORDER BY n.id
                    """, Map.of("org", organization)).list(row -> row.asMap().toString());
            var relationships = session.run("""
                    MATCH (x)-[r]-(y) WHERE x.organizationId = $org
                    RETURN x.id + '-' + type(r) + '-' + y.id AS key, startNode(r) = x AS outgoing, properties(r) AS props
                    ORDER BY key, outgoing, r.id
                    """, Map.of("org", organization)).list(row -> row.asMap().toString());
            var result = new ArrayList<String>(nodes);
            result.addAll(relationships);
            return result;
        }
    }

    @Test
    void workerCopiesSucceedsRejectsInvalidSelectionsAndRetriesUntilFailure() {
        var store = new FakeStore();
        var clock = Clock.fixed(Instant.parse("2026-11-02T00:00:00Z"), ZoneOffset.UTC);
        String org = UUID.randomUUID().toString();
        store.jobs.add(new WorkspaceCatalogImportStore.Job(UUID.fromString(org), UUID.randomUUID(), UUID.randomUUID(), 1, List.of("MS-A")));
        store.jobs.add(new WorkspaceCatalogImportStore.Job(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 1, List.of("LV-A1")));
        var worker = new WorkspaceCatalogImportWorker(store, catalog, writer, clock);
        worker.process();
        assertThat(store.events).containsExactly("SUCCEEDED:4:3", "FAILED:CATALOG_SELECTION_INVALID");
        assertThat(count("MATCH (n {organizationId:$org}) RETURN count(n)", Map.of("org", org))).isEqualTo(4);

        var broken = new WorkspaceCatalogImportWorker(store, catalog, (o, v, n, e) -> { throw new IllegalStateException("graph down"); }, clock);
        store.events.clear();
        store.jobs.add(new WorkspaceCatalogImportStore.Job(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 1, List.of("MS-A")));
        store.jobs.add(new WorkspaceCatalogImportStore.Job(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                WorkspaceCatalogImportWorker.MAX_ATTEMPTS, List.of("MS-A")));
        broken.process();
        assertThat(store.events).containsExactly("RETRY:CATALOG_COPY_FAILED", "FAILED:CATALOG_COPY_FAILED");
    }

    private static final class FakeStore implements WorkspaceCatalogImportStore {
        final List<Job> jobs = new ArrayList<>();
        final List<String> events = new ArrayList<>();

        @Override public Optional<Job> claim(Instant now) { return jobs.isEmpty() ? Optional.empty() : Optional.of(jobs.removeFirst()); }
        @Override public void succeed(Job job, String version, String sha, int nodes, int relationships, Instant now) {
            events.add("SUCCEEDED:" + nodes + ":" + relationships);
        }
        @Override public void retry(Job job, String code, Instant next, Instant now) { events.add("RETRY:" + code); }
        @Override public void fail(Job job, String code, Instant now) { events.add("FAILED:" + code); }
    }
}
