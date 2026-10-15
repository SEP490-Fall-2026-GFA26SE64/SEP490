package com.adaptlearngraph.assessment.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort.DependencyUnavailable;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Config;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.Neo4jContainer;

/** REQ-002-F02 R10/R12 disposable ontology traversal integration. */
class Neo4jBaselineOccupationCatalogAdapterIntegrationTest {
    private static final Neo4jContainer<?> NEO4J = new Neo4jContainer<>("neo4j:5.26-community");
    private static boolean dockerAvailable;

    private Driver driver;
    private Neo4jBaselineOccupationCatalogAdapter adapter;

    @BeforeAll
    static void startNeo4jWhenDockerIsAvailable() {
        dockerAvailable = DockerClientFactory.instance().isDockerAvailable();
        if (dockerAvailable) NEO4J.start();
    }

    @AfterAll
    static void stopNeo4j() {
        if (NEO4J.isRunning()) NEO4J.stop();
    }

    @BeforeEach
    void setUp() {
        assumeTrue(dockerAvailable, "Docker Desktop Linux engine is required for Neo4j integration");
        driver = GraphDatabase.driver(
                NEO4J.getBoltUrl(), AuthTokens.basic("neo4j", NEO4J.getAdminPassword()));
        adapter = new Neo4jBaselineOccupationCatalogAdapter(driver);
        try (var session = driver.session()) {
            session.run("MATCH (node) DETACH DELETE node").consume();
            session.run(FIXTURE).consume();
        }
    }

    @AfterEach
    void closeDriver() {
        if (driver != null) driver.close();
    }

    @Test
    void listsActiveOccupationsAndCountsOnlyActiveMemberships() {
        var occupations = adapter.findAvailableOccupations("org-alpha");

        assertThat(occupations).singleElement().satisfies(occupation -> {
            assertThat(occupation.id()).isEqualTo("occupation-engineering");
            assertThat(occupation.name()).isEqualTo("Software Engineering");
            assertThat(occupation.version()).isEqualTo("occupation-v1");
            assertThat(occupation.roleCount()).isEqualTo(2);
        });
    }

    @Test
    void resolvesAllRolesAndDeduplicatesSkillUnionAcrossLevels() {
        var occupation = adapter.findAvailableOccupation(
                "org-alpha", "occupation-engineering").orElseThrow();

        assertThat(occupation.roles()).extracting(role -> role.id())
                .containsExactly("role-a", "role-b");
        assertThat(occupation.roles().getFirst().skills()).extracting(skill -> skill.id())
                .containsExactly("skill-shared", "skill-unique");
        assertThat(occupation.roles().get(1).skills()).isEmpty();
        assertThat(adapter.findAvailableOccupation("org-alpha", "occupation-inactive")).isEmpty();
        assertThat(adapter.findAvailableOccupation("org-alpha", "missing")).isEmpty();
    }

    @Test
    void mapsDriverFailureToDependencyUnavailable() {
        var fastFailure = Config.builder().withMaxTransactionRetryTime(1, TimeUnit.SECONDS).build();
        try (var unavailable = GraphDatabase.driver("bolt://127.0.0.1:1", AuthTokens.none(), fastFailure)) {
            var unavailableAdapter = new Neo4jBaselineOccupationCatalogAdapter(unavailable);
            assertThatThrownBy(() -> unavailableAdapter.findAvailableOccupations("org-alpha"))
                    .isInstanceOf(DependencyUnavailable.class);
        }
    }

    private static final String FIXTURE = """
            CREATE (occupation:Occupation {
                id: 'occupation-engineering', name: 'Software Engineering',
                version: 'occupation-v1', status: 'ACTIVE'})
            CREATE (inactiveOccupation:Occupation {
                id: 'occupation-inactive', name: 'Inactive', version: 'v1', status: 'RETIRED'})
            CREATE (roleA:TargetRole {id: 'role-a', name: 'Backend Engineer', version: 'role-v1', status: 'ACTIVE'})
            CREATE (roleB:TargetRole {id: 'role-b', name: 'Platform Engineer', version: 'role-v1', status: 'ACTIVE'})
            CREATE (inactiveRole:TargetRole {
                id: 'role-inactive', name: 'Inactive Role', version: 'role-v1', status: 'RETIRED'})
            CREATE (levelOne:Level {id: 'level-1', status: 'ACTIVE'})
            CREATE (levelTwo:Level {id: 'level-2', status: 'ACTIVE'})
            CREATE (inactiveLevel:Level {id: 'level-inactive', status: 'RETIRED'})
            CREATE (shared:MicroSkill {
                id: 'skill-shared', name: 'Shared Engineering', version: 'skill-v1', status: 'ACTIVE'})
            CREATE (unique:MicroSkill {
                id: 'skill-unique', name: 'Unique Backend', version: 'skill-v1', status: 'ACTIVE'})
            CREATE (inactiveSkill:MicroSkill {
                id: 'skill-inactive', name: 'Inactive Skill', version: 'skill-v1', status: 'RETIRED'})
            CREATE (occupation)-[:HAS_ROLE {status: 'ACTIVE'}]->(roleA)
            CREATE (occupation)-[:HAS_ROLE {status: 'ACTIVE'}]->(roleB)
            CREATE (occupation)-[:HAS_ROLE {status: 'ACTIVE'}]->(inactiveRole)
            CREATE (inactiveOccupation)-[:HAS_ROLE {status: 'ACTIVE'}]->(roleA)
            CREATE (roleA)-[:HAS_LEVEL {status: 'ACTIVE'}]->(levelOne)
            CREATE (roleA)-[:HAS_LEVEL {status: 'ACTIVE'}]->(levelTwo)
            CREATE (roleA)-[:HAS_LEVEL {status: 'ACTIVE'}]->(inactiveLevel)
            CREATE (levelOne)-[:REQUIRES_SKILL {status: 'ACTIVE'}]->(shared)
            CREATE (levelTwo)-[:REQUIRES_SKILL {status: 'ACTIVE'}]->(shared)
            CREATE (levelTwo)-[:REQUIRES_SKILL {status: 'ACTIVE'}]->(unique)
            CREATE (levelTwo)-[:REQUIRES_SKILL {status: 'ACTIVE'}]->(inactiveSkill)
            """;
}
