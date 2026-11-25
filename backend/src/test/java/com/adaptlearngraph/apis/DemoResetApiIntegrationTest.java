package com.adaptlearngraph.apis;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.config.DemoResetConfiguration;
import com.adaptlearngraph.config.DevelopmentWorkspaceAccountBootstrap;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.Neo4jContainer;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(classes = DemoResetApiIntegrationTest.TestApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
                "spring.profiles.active=demo-reset-test", "spring.flyway.enabled=true",
                "spring.flyway.locations=classpath:db/workspace-migration",
                "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration"
        })
class DemoResetApiIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static final Neo4jContainer<?> NEO4J = new Neo4jContainer<>("neo4j:5.26-community").withAdminPassword("demo-reset-test");
    private static final UUID TECHNOVA = DevelopmentWorkspaceAccountBootstrap.TECHNOVA_ORG_ID;
    private static final UUID SEEDED = com.adaptlearngraph.config.DemoOrganizationsSeedBootstrap.DETAILED_ORG_ID;
    static { POSTGRES.start(); NEO4J.start(); }

    @LocalServerPort private int port;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private Driver neo4j;
    @Autowired private ObjectMapper json;

    private final UUID seedAdmin = UUID.randomUUID();
    private final UUID platformAdmin = UUID.randomUUID();
    private final UUID demoOrg = UUID.randomUUID();
    private final UUID demoAdmin = UUID.randomUUID();
    private final UUID demoMembership = UUID.randomUUID();
    private final UUID pendingAccount = UUID.randomUUID();

    @Configuration(proxyBeanMethods = false)
    @TestComponent
    @EnableAutoConfiguration
    @Import({DemoResetConfiguration.class, DemoResetController.class})
    static class TestApplication {}

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.neo4j.uri", NEO4J::getBoltUrl);
        registry.add("spring.neo4j.authentication.username", () -> "neo4j");
        registry.add("spring.neo4j.authentication.password", NEO4J::getAdminPassword);
    }

    @AfterAll
    static void stop() { POSTGRES.stop(); NEO4J.stop(); }

    @BeforeEach
    void seed() {
        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, 'TECHNOVA', 'TechNova Cognitive Labs') ON CONFLICT DO NOTHING", TECHNOVA);
        account(seedAdmin, TECHNOVA, "seed-admin");
        account(platformAdmin, null, "platform-admin");
        jdbc.update("INSERT INTO platform.account_role(account_id, role_code) VALUES (?, 'PLATFORM_ADMINISTRATOR')", platformAdmin);
        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, 'SEED-LOTUS', 'Lotus Digital Solutions') ON CONFLICT DO NOTHING", SEEDED);
        jdbc.update("""
                INSERT INTO platform.department_reference(department_id, organization_id, name, active)
                SELECT ?, ?, 'Engineering', true WHERE NOT EXISTS (SELECT 1 FROM platform.department_reference WHERE organization_id = ?)
                """, UUID.randomUUID(), SEEDED, SEEDED);

        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, ?, 'Sao Mai Software JSC')", demoOrg, "SAOMAI-" + demoOrg.toString().substring(0, 8).toUpperCase());
        account(demoAdmin, demoOrg, "demo-admin");
        UUID registration = UUID.randomUUID();
        UUID workspace = UUID.randomUUID();
        new TransactionTemplate(new DataSourceTransactionManager(jdbc.getDataSource())).executeWithoutResult(status -> {
        jdbc.update("""
                INSERT INTO platform.organization_registration(registration_id, account_id, organization_name, workspace_slug, industry, headcount,
                    admin_name, state, email_verified_at, completed_at, auth_version, recovery_required, created_at, updated_at,
                    email_verification_bypassed, mfa_bypassed, country, admin_phone)
                VALUES (?, ?, 'Sao Mai Software JSC', 'saomai', 'Software Engineering & AI', '51 - 200 employees', 'Tran Minh Quan',
                    'REGISTERED', now(), now(), 0, false, now(), now(), false, false, 'VN', '+84901234567')
                """, registration, demoAdmin);
        jdbc.update("INSERT INTO platform.organization_workspace(workspace_id, organization_id, registration_id, slug, setup_state, created_at, ready_at) VALUES (?, ?, ?, 'saomai', 'READY', now(), now())",
                workspace, demoOrg, registration);
        jdbc.update("INSERT INTO platform.department_reference(department_id, organization_id, name, active) VALUES (?, ?, 'Software Engineering', true)", UUID.randomUUID(), demoOrg);
        jdbc.update("INSERT INTO platform.audit_event(audit_event_id, actor_id, action, resource_id, outcome, correlation_id) VALUES (?, ?, 'DEMO_ACTION', ?, 'SUCCEEDED', ?)",
                UUID.randomUUID(), demoAdmin, demoOrg, UUID.randomUUID());
        jdbc.update("""
                INSERT INTO platform.organization_membership(membership_id, account_id, organization_id, active, created_at, updated_at)
                VALUES (?, ?, ?, true, now(), now())
                """, demoMembership, demoAdmin, demoOrg);
        jdbc.update("INSERT INTO platform.organization_membership_role(membership_id, role_code) VALUES (?, 'ORGANIZATION_ADMINISTRATOR')", demoMembership);
        });

        account(pendingAccount, null, "pending-owner");
        jdbc.update("""
                INSERT INTO platform.organization_registration(registration_id, account_id, organization_name, workspace_slug, industry, headcount,
                    admin_name, state, auth_version, recovery_required, created_at, updated_at, email_verification_bypassed, mfa_bypassed)
                VALUES (?, ?, 'Pending Co', ?, 'Software Engineering & AI', '1 - 20 employees', 'Pending Owner', 'EMAIL_PENDING', 0, false, now(), now(), false, false)
                """, UUID.randomUUID(), pendingAccount, "pending-" + pendingAccount.toString().substring(0, 8));

        try (var session = neo4j.session()) {
            session.run("CREATE (:Competency {organizationId:$keep, code:'KEEP'})", java.util.Map.of("keep", TECHNOVA.toString())).consume();
            session.run("MERGE (:Department {organizationId:$keep, code:'SEEDED'})", java.util.Map.of("keep", SEEDED.toString())).consume();
            session.run("CREATE (:Competency {organizationId:$org, code:'COMP-JAVA-CORE'})-[:REQUIRES]->(:MicroSkill {organizationId:$org, code:'MS-JAVA-OOP'})",
                    java.util.Map.of("org", demoOrg.toString())).consume();
        }
    }

    @Test
    void publicResetRemovesOnboardedDataAndKeepsTheSeedTenant() throws Exception {
        var response = reset();
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("cache-control").orElseThrow()).contains("no-store");
        JsonNode body = json.readTree(response.body());
        assertThat(body.get("organizationsRemoved").asInt()).isEqualTo(1);
        assertThat(body.get("accountsRemoved").asInt()).isEqualTo(2);
        assertThat(body.get("registrationsRemoved").asInt()).isEqualTo(2);
        assertThat(body.get("graphNodesRemoved").asInt()).isEqualTo(2);
        assertThat(body.get("relatedRowsRemoved").asInt()).isGreaterThanOrEqualTo(5);
        assertThat(body.get("warnings")).isEmpty();

        assertThat(count("SELECT count(*) FROM platform.organization WHERE organization_id = ?", demoOrg)).isZero();
        assertThat(count("SELECT count(*) FROM platform.organization_workspace WHERE organization_id = ?", demoOrg)).isZero();
        assertThat(count("SELECT count(*) FROM platform.department_reference WHERE organization_id = ?", demoOrg)).isZero();
        assertThat(count("SELECT count(*) FROM platform.organization_membership_role WHERE membership_id = ?", demoMembership)).isZero();
        assertThat(count("SELECT count(*) FROM platform.audit_event WHERE actor_id = ?", demoAdmin)).isZero();
        assertThat(count("SELECT count(*) FROM platform.account WHERE account_id IN (?, ?)", demoAdmin, pendingAccount)).isZero();
        assertThat(count("SELECT count(*) FROM platform.organization WHERE organization_id = ?", TECHNOVA)).isOne();
        assertThat(count("SELECT count(*) FROM platform.organization WHERE organization_id = ?", SEEDED)).isOne();
        assertThat(count("SELECT count(*) FROM platform.department_reference WHERE organization_id = ?", SEEDED)).isOne();
        assertThat(count("SELECT count(*) FROM platform.account WHERE account_id IN (?, ?)", seedAdmin, platformAdmin)).isEqualTo(2);
        try (var session = neo4j.session()) {
            assertThat(session.run("MATCH (n) RETURN collect(n.organizationId) AS orgs").single().get("orgs").asList())
                    .containsOnly(TECHNOVA.toString(), SEEDED.toString());
        }

        var again = json.readTree(reset().body());
        assertThat(again.get("organizationsRemoved").asInt()).isZero();
        assertThat(again.get("accountsRemoved").asInt()).isZero();
        assertThat(again.get("graphNodesRemoved").asInt()).isZero();

        // The workspace address and owner email can be registered again.
        account(UUID.randomUUID(), null, "demo-admin");
        jdbc.update("""
                INSERT INTO platform.organization_registration(registration_id, account_id, organization_name, workspace_slug, industry, headcount,
                    admin_name, state, auth_version, recovery_required, created_at, updated_at, email_verification_bypassed, mfa_bypassed)
                SELECT ?, account_id, 'Sao Mai Software JSC', 'saomai', 'Software Engineering & AI', '51 - 200 employees', 'Tran Minh Quan',
                    'EMAIL_PENDING', 0, false, now(), now(), false, false FROM platform.account WHERE normalized_identifier = ?
                """, UUID.randomUUID(), "demo-admin-" + demoOrg + "@example.test");
        assertThat(count("SELECT count(*) FROM platform.organization_registration WHERE workspace_slug = 'saomai'")).isOne();
        reset();
    }

    private HttpResponse<String> reset() throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + DemoResetController.PATH))
                .POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
    }

    private void account(UUID id, UUID organization, String alias) {
        String email = alias + "-" + demoOrg + "@example.test";
        jdbc.update("INSERT INTO platform.account(account_id, identifier, normalized_identifier, password_hash, organization_id) VALUES (?, ?, ?, 'hash', ?)",
                id, email, email, organization);
    }

    private Long count(String sql, Object... args) {
        return jdbc.queryForObject(sql, Long.class, args);
    }
}
