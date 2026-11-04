package com.adaptlearngraph.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.MicroSkillNode;
import com.adaptlearngraph.entities.JobPositionNode;
import com.adaptlearngraph.repository.MicroSkillNodeRepository;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.data.neo4j.core.mapping.Neo4jMappingContext;
import org.springframework.data.neo4j.core.transaction.Neo4jTransactionManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.Neo4jContainer;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(classes = PersistenceConfigurationIntegrationTest.TestApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
                "spring.profiles.active=persistence-test", "spring.flyway.enabled=true",
                "spring.flyway.locations=classpath:db/workspace-migration"})
class PersistenceConfigurationIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static final Neo4jContainer<?> NEO4J = new Neo4jContainer<>("neo4j:5.26-community");
    static {
        POSTGRES.start();
        NEO4J.start();
    }

    @Autowired private ApplicationContext context;
    @Autowired private PlatformTransactionManager primary;
    @Autowired @Qualifier(TransactionManagers.JPA) private PlatformTransactionManager jpa;
    @Autowired @Qualifier(TransactionManagers.NEO4J) private PlatformTransactionManager graph;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;
    @Autowired private Neo4jClient neo4j;
    @Autowired private ModelMapper mapper;
    @Autowired private Neo4jMappingContext graphMapping;
    @Autowired private MicroSkillNodeRepository microSkills;

    @Configuration(proxyBeanMethods = false)
    @TestComponent
    @EnableAutoConfiguration(excludeName = "org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration")
    @Import({PersistenceConfiguration.class, ModelMapperConfiguration.class})
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
    static void stop() {
        NEO4J.stop();
        POSTGRES.stop();
    }

    @Test
    void exposesExactlyTheTwoNamedTransactionManagers() {
        assertThat(context.getBeansOfType(PlatformTransactionManager.class))
                .containsOnlyKeys(TransactionManagers.JPA, TransactionManagers.NEO4J);
        assertThat(jpa).isInstanceOf(JpaTransactionManager.class).isSameAs(primary);
        assertThat(graph).isInstanceOf(Neo4jTransactionManager.class);
    }

    @Test
    void jdbcAndJpaShareOnePostgresTransactionAndRollBackTogether() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        var transactions = new TransactionTemplate(jpa);
        transactions.executeWithoutResult(status -> {
            insertRateBucket(first);
            entityManager.createNativeQuery("INSERT INTO platform.registration_rate_limit(bucket_key, window_started_at, attempts) "
                    + "VALUES (?1, now(), 0)").setParameter(1, hash(second)).executeUpdate();
            assertThat(count(first) + count(second)).as("both writes visible inside one transaction").isEqualTo(2);
            status.setRollbackOnly();
        });
        assertThat(count(first) + count(second)).isZero();
    }

    @Test
    void neo4jWritesFollowTheGraphTransactionManager() {
        String rolledBack = UUID.randomUUID().toString();
        String committed = UUID.randomUUID().toString();
        var transactions = new TransactionTemplate(graph);
        transactions.executeWithoutResult(status -> {
            createProbe(rolledBack);
            status.setRollbackOnly();
        });
        transactions.executeWithoutResult(status -> createProbe(committed));
        assertThat(probes(rolledBack)).isZero();
        assertThat(probes(committed)).isEqualTo(1);
    }

    @Test
    void graphRepositoriesAreScannedForNodeClassesAndJoinTheGraphTransaction() {
        assertThat(graphMapping.hasPersistentEntityFor(MicroSkillNode.class)).isTrue();
        assertThat(graphMapping.hasPersistentEntityFor(JobPositionNode.class)).isTrue();
        String organization = UUID.randomUUID().toString();
        new TransactionTemplate(graph).executeWithoutResult(status -> {
            neo4j.query("CREATE (:MicroSkill {id: $id, organizationId: $organization, code: 'PROBE'})")
                    .bindAll(java.util.Map.of("id", UUID.randomUUID().toString(), "organization", organization)).run();
            assertThat(microSkills.existsByOrganizationIdAndCode(organization, "PROBE"))
                    .as("repository sees the uncommitted write of the surrounding graph transaction").isTrue();
            status.setRollbackOnly();
        });
        assertThat(microSkills.existsByOrganizationIdAndCode(organization, "PROBE")).isFalse();
    }

    @Test
    void sharedModelMapperIsStrictAndKeepsNulls() {
        assertThat(mapper.getConfiguration().getMatchingStrategy()).isSameAs(MatchingStrategies.STRICT);
        assertThat(mapper.getConfiguration().isSkipNullEnabled()).isFalse();
    }

    private void insertRateBucket(UUID key) {
        jdbc.update("INSERT INTO platform.registration_rate_limit(bucket_key, window_started_at, attempts) VALUES (?, now(), 0)",
                hash(key));
    }

    private int count(UUID key) {
        return jdbc.queryForObject("SELECT count(*) FROM platform.registration_rate_limit WHERE bucket_key = ?", Integer.class,
                hash(key));
    }

    /** bucket_key is the platform.content_hash domain (64 lowercase hex characters). */
    private static String hash(UUID key) {
        String hex = key.toString().replace("-", "");
        return hex + hex;
    }

    private void createProbe(String id) {
        neo4j.query("CREATE (:PersistenceProbe {id: $id})").bind(id).to("id").run();
    }

    private long probes(String id) {
        return neo4j.query("MATCH (p:PersistenceProbe {id: $id}) RETURN count(p)").bind(id).to("id")
                .fetchAs(Long.class).one().orElseThrow();
    }
}
