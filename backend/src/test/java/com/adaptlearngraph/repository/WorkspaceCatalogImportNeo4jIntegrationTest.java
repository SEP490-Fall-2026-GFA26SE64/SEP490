package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.entities.domain.JobPosition;
import com.adaptlearngraph.entities.domain.OrganizationStructure;
import com.adaptlearngraph.exception.CrossTenantWriteException;
import com.adaptlearngraph.services.OrganizationStructureFixtures;
import com.adaptlearngraph.services.WorkspaceCatalogImportWorker;
import com.adaptlearngraph.support.Neo4jTestContext;
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
import org.testcontainers.containers.Neo4jContainer;

/** Real Neo4j import of a Guest organization structure into two organizations, read through tenant-scoped adapters. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class WorkspaceCatalogImportNeo4jIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-11-18T00:00:00Z");
    private final Neo4jContainer<?> graph = new Neo4jContainer<>("neo4j:5.26-community");
    private final OrganizationStructure structure = OrganizationStructureFixtures.structure();
    private Driver driver;
    private Neo4jTestContext persistence;
    private Neo4jWorkspaceCatalogWriter writer;

    @BeforeAll
    void start() {
        graph.start();
        driver = GraphDatabase.driver(graph.getBoltUrl(), AuthTokens.basic("neo4j", graph.getAdminPassword()));
        try (var session = driver.session()) {
            for (String label : List.of("Department", "JobPosition", "TargetRole", "Level"))
                session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:" + label + ") REQUIRE n.id IS UNIQUE").consume();
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:Department) REQUIRE (n.organizationId, n.code) IS UNIQUE").consume();
        }
        persistence = Neo4jTestContext.start(driver);
        writer = new Neo4jWorkspaceCatalogWriter(persistence::cypher);
    }

    @AfterAll
    void stop() {
        if (persistence != null) persistence.close();
        if (driver != null) driver.close();
        graph.stop();
    }

    private long count(String query, Map<String, Object> parameters) {
        try (var session = driver.session()) {
            return session.run(query, parameters).single().get(0).asLong();
        }
    }

    @Test
    void twoOrganizationsReceiveIndependentIdempotentStructuresReadOnlyThroughTheirOwnScope() {
        String a = UUID.randomUUID().toString(), b = UUID.randomUUID().toString();
        writer.writeStructure(a, structure, NOW);
        writer.writeStructure(a, structure, NOW.plusSeconds(5));
        writer.writeStructure(b, structure, NOW);

        for (String org : List.of(a, b)) {
            assertThat(count("MATCH (n {organizationId:$org}) RETURN count(n)", Map.of("org", org))).isEqualTo(12);
            assertThat(count("MATCH ()-[r {organizationId:$org}]->() RETURN count(r)", Map.of("org", org))).isEqualTo(10);
            assertThat(count("MATCH (:Department {organizationId:$org})-[:HAS_JOB_POSITION]->(:JobPosition)-[:HAS_ROLE]->"
                    + "(:TargetRole)-[:HAS_LEVEL]->(l:Level) RETURN count(l)", Map.of("org", org))).isEqualTo(5);
            assertThat(count("MATCH (x {organizationId:$org})-[r]-(y) WHERE coalesce(y.organizationId,'') <> $org RETURN count(r)",
                    Map.of("org", org))).as("no relationship crosses organizations").isZero();
        }
        String roleA = Neo4jWorkspaceCatalogWriter.importedId(a, "TargetRole", "TR-BE");
        assertThat(roleA).isNotEqualTo(Neo4jWorkspaceCatalogWriter.importedId(b, "TargetRole", "TR-BE"));
        try (var session = driver.session()) {
            var department = session.run("MATCH (d:Department {organizationId:$org, code:'ENG'}) RETURN d", Map.of("org", a))
                    .single().get("d").asNode();
            assertThat(department.get("name").asString()).isEqualTo("ENG name");
            assertThat(department.get("description").asString()).isEqualTo("ENG description");
            assertThat(department.get("status").asString()).isEqualTo("ACTIVE");
            assertThat(department.containsKey("headOfDepartment")).as("optional fields are not invented").isFalse();
            var role = session.run("MATCH (r:TargetRole {id:$id}) RETURN r", Map.of("id", roleA)).single().get("r").asNode();
            assertThat(role.get("scope").asString()).isEqualTo("TR-BE scope");
            assertThat(role.containsKey("assignedExpertId")).isFalse();
            var levels = session.run("MATCH (:TargetRole {id:$id})-[:HAS_LEVEL]->(l:Level) RETURN l.name AS name, l.rank AS rank, "
                    + "l.code AS code ORDER BY l.rank", Map.of("id", roleA)).list(row -> row.get("name").asString() + ":"
                    + row.get("rank").asLong() + ":" + row.get("code").asString());
            assertThat(levels).containsExactly("Junior:1:L1", "Senior:2:L2");
        }

        var jobPositions = new Neo4jJobPositionRepository(persistence.bean(JobPositionNodeRepository.class),
                persistence.client(), persistence.transactionManager());
        assertThat(jobPositions.findAllJobPositions(a)).extracting(JobPosition::code).containsExactlyInAnyOrder("JP-DEV", "JP-QA");
        assertThat(jobPositions.findAllJobPositions("")).isEmpty();
        var foreign = jobPositions.findAllJobPositions(a).getFirst();
        assertThatThrownBy(() -> jobPositions.saveChange(b, new com.adaptlearngraph.entities.domain.JobPositionChange(foreign.id(), foreign.code(), foreign.name(), foreign.jobZone(), foreign.status(), foreign.version(), "manager-b", false, null, null))).isInstanceOf(CrossTenantWriteException.class);
        assertThat(jobPositions.findByIdOrCode(b, foreign.id())).isEmpty();
    }

    @Test
    void aCollidingForeignNodeRejectsAndRollsBackTheWholeImport() {
        String a = UUID.randomUUID().toString(), c = UUID.randomUUID().toString();
        writer.writeStructure(a, structure, NOW);
        String collision = Neo4jWorkspaceCatalogWriter.importedId(c, "JobPosition", "JP-QA");
        try (var session = driver.session()) {
            session.run("CREATE (:JobPosition {id:$id, organizationId:$a, name:'Owned by A'})", Map.of("id", collision, "a", a)).consume();
        }
        assertThatThrownBy(() -> writer.writeStructure(c, structure, NOW)).isInstanceOf(CrossTenantWriteException.class);
        assertThat(count("MATCH (n {organizationId:$c}) RETURN count(n)", Map.of("c", c))).as("rejected import rolled back").isZero();
        assertThat(count("MATCH ()-[r {organizationId:$c}]->() RETURN count(r)", Map.of("c", c))).isZero();
        assertThat(count("MATCH (n {organizationId:$a}) RETURN count(n)", Map.of("a", a))).isEqualTo(13);
    }

    @Test
    void workerWritesSucceedsEmptyLegacyJobsAndRetriesUntilFailure() {
        var store = new FakeStore();
        var clock = Clock.fixed(NOW, ZoneOffset.UTC);
        String org = UUID.randomUUID().toString();
        store.jobs.add(new WorkspaceCatalogImportStore.Job(UUID.fromString(org), UUID.randomUUID(), UUID.randomUUID(), 1, structure));
        store.jobs.add(new WorkspaceCatalogImportStore.Job(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 1, null));
        new WorkspaceCatalogImportWorker(store, writer, clock).process();
        assertThat(store.events).containsExactly("SUCCEEDED:12:10", "SUCCEEDED:0:0");
        assertThat(count("MATCH (n {organizationId:$org}) RETURN count(n)", Map.of("org", org))).isEqualTo(12);

        var broken = new WorkspaceCatalogImportWorker(store, (o, s, n) -> { throw new IllegalStateException("graph down"); }, clock);
        store.events.clear();
        store.jobs.add(new WorkspaceCatalogImportStore.Job(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 1, structure));
        store.jobs.add(new WorkspaceCatalogImportStore.Job(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                WorkspaceCatalogImportWorker.MAX_ATTEMPTS, structure));
        broken.process();
        assertThat(store.events).containsExactly("RETRY:STRUCTURE_IMPORT_FAILED", "FAILED:STRUCTURE_IMPORT_FAILED");
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
