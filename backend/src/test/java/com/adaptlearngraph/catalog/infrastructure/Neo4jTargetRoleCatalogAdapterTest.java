package com.adaptlearngraph.catalog.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.catalog.application.TargetRoleQueryException;
import com.adaptlearngraph.catalog.application.TargetRoleQueryException.Code;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort.Criteria;
import com.adaptlearngraph.catalog.domain.Seniority;
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
import org.testcontainers.containers.Neo4jContainer;

class Neo4jTargetRoleCatalogAdapterTest {
    private static final Neo4jContainer<?> NEO4J = new Neo4jContainer<>("neo4j:5.26-community");

    private Driver driver;
    private Neo4jTargetRoleCatalogAdapter adapter;

    @BeforeAll
    static void startNeo4j() {
        NEO4J.start();
    }

    @AfterAll
    static void stopNeo4j() {
        NEO4J.stop();
    }

    @BeforeEach
    void setUp() {
        driver = GraphDatabase.driver(
                NEO4J.getBoltUrl(), AuthTokens.basic("neo4j", NEO4J.getAdminPassword()));
        adapter = new Neo4jTargetRoleCatalogAdapter(driver);
        try (var session = driver.session()) {
            session.run("MATCH (node) DETACH DELETE node").consume();
            session.run(FIXTURE).consume();
        }
    }

    @AfterEach
    void closeDriver() {
        driver.close();
    }

    @Test
    void listEnforcesTenantStatusCatalogValidityAndDiscoveryFilters() {
        var orgARoles = adapter.findAvailableRoles("org-a", new Criteria(null, null));

        assertThat(orgARoles).extracting(role -> role.id()).containsExactly("role-a");
        assertThat(orgARoles.getFirst().requirementCount()).isEqualTo(2);

        assertThat(adapter.findAvailableRoles("org-b", new Criteria(null, null)))
                .extracting(role -> role.id()).containsExactly("role-b");
        assertThat(adapter.findAvailableRoles("org-a", new Criteria("java", Seniority.P3)))
                .extracting(role -> role.id()).containsExactly("role-a");
        assertThat(adapter.findAvailableRoles("org-a", new Criteria("python", Seniority.P3)))
                .isEmpty();
        assertThat(adapter.findAvailableRoles("org-a", new Criteria(null, Seniority.M3)))
                .isEmpty();
    }

    @Test
    void detailMapsRequirementsAndRechecksCurrentCatalogState() {
        var detail = adapter.findAvailableRole("org-a", "role-a").orElseThrow();

        assertThat(detail.familyCode()).isEqualTo("JAVA");
        assertThat(detail.responsibilities()).containsExactly("Build APIs", "Review code");
        assertThat(detail.requirements()).extracting(requirement -> requirement.skillCode())
                .containsExactlyInAnyOrder("JAVA", "SPRING");
        assertThat(adapter.findAvailableRole("org-b", "role-a")).isEmpty();

        try (var session = driver.session()) {
            session.run("MATCH (role:TargetRole {id: 'role-a'}) SET role.status = 'RETIRED'").consume();
        }

        assertThat(adapter.findAvailableRole("org-a", "role-a")).isEmpty();
    }

    @Test
    void dependencyFailureIsNotConvertedToEmptyCatalog() {
        var fastFailure = Config.builder().withMaxTransactionRetryTime(1, TimeUnit.SECONDS).build();
        try (var unavailableDriver = GraphDatabase.driver(
                "bolt://127.0.0.1:1", AuthTokens.none(), fastFailure)) {
            var unavailableAdapter = new Neo4jTargetRoleCatalogAdapter(unavailableDriver);

            assertThatThrownBy(() -> unavailableAdapter.findAvailableRoles("org-a", new Criteria(null, null)))
                    .isInstanceOfSatisfying(TargetRoleQueryException.class,
                            exception -> assertThat(exception.code()).isEqualTo(Code.CATALOG_UNAVAILABLE));
        }
    }

    private static final String FIXTURE = """
            CREATE (java:MicroSkill {id: 'skill-java', code: 'JAVA', name: 'Java', status: 'ACTIVE'})
            CREATE (spring:MicroSkill {id: 'skill-spring', code: 'SPRING', name: 'Spring', status: 'ACTIVE'})
            CREATE (inactiveSkill:MicroSkill {id: 'skill-inactive', code: 'OLD', name: 'Old Skill', status: 'RETIRED'})
            CREATE (roleA:TargetRole {
                id: 'role-a', code: 'JAVA_P3', name: 'Java Backend Developer', familyCode: 'JAVA',
                track: 'PROFESSIONAL', seniority: 'P3', organizationId: 'org-a', status: 'ACTIVE',
                description: 'Backend role', responsibilities: ['Build APIs', 'Review code']})
            CREATE (roleB:TargetRole {
                id: 'role-b', code: 'FIN_P3', name: 'Finance Analyst', familyCode: 'FIN',
                track: 'PROFESSIONAL', seniority: 'P3', organizationId: 'org-b', status: 'ACTIVE'})
            CREATE (retired:TargetRole {
                id: 'role-retired', code: 'OLD_P3', name: 'Retired Role', familyCode: 'OLD',
                track: 'PROFESSIONAL', seniority: 'P3', organizationId: 'org-a', status: 'RETIRED'})
            CREATE (noRequirements:TargetRole {
                id: 'role-empty', code: 'EMPTY_P3', name: 'Empty Role', familyCode: 'EMPTY',
                track: 'PROFESSIONAL', seniority: 'P3', organizationId: 'org-a', status: 'ACTIVE'})
            CREATE (badMastery:TargetRole {
                id: 'role-bad', code: 'BAD_P3', name: 'Bad Role', familyCode: 'BAD',
                track: 'PROFESSIONAL', seniority: 'P3', organizationId: 'org-a', status: 'ACTIVE'})
            CREATE (inactiveRequirement:TargetRole {
                id: 'role-inactive-skill', code: 'INACTIVE_P3', name: 'Inactive Skill Role', familyCode: 'OLD',
                track: 'PROFESSIONAL', seniority: 'P3', organizationId: 'org-a', status: 'ACTIVE'})
            CREATE (roleA)-[:REQUIRES_SKILL {status: 'ACTIVE', targetMastery: 0.6}]->(java)
            CREATE (roleA)-[:REQUIRES_SKILL {status: 'ACTIVE', targetMastery: 0.7}]->(spring)
            CREATE (roleB)-[:REQUIRES_SKILL {status: 'ACTIVE', targetMastery: 0.6}]->(java)
            CREATE (retired)-[:REQUIRES_SKILL {status: 'ACTIVE', targetMastery: 0.6}]->(java)
            CREATE (badMastery)-[:REQUIRES_SKILL {status: 'ACTIVE', targetMastery: 1.2}]->(java)
            CREATE (inactiveRequirement)-[:REQUIRES_SKILL {status: 'ACTIVE', targetMastery: 0.5}]->(inactiveSkill)
            """;
}
