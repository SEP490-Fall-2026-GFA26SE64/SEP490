package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.support.JpaTestContext;
import jakarta.persistence.metamodel.EntityType;
import java.util.stream.Collectors;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;

/** Every JPA entity must match the Flyway schema of each lineage; Hibernate never creates or alters tables. */
class JpaSchemaValidationIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");

    @BeforeAll
    static void start() {
        POSTGRES.start();
    }

    @AfterAll
    static void stop() {
        POSTGRES.stop();
    }

    @ParameterizedTest
    @ValueSource(strings = {"db/migration", "db/workspace-migration", "db/module-migration"})
    void mappedEntitiesValidateAgainstLineage(String lineage) {
        String database = lineage.substring(3).replace('-', '_');
        new JdbcTemplate(new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()))
                .execute("CREATE DATABASE " + database);
        String url = POSTGRES.getJdbcUrl().replaceFirst("/[^/?]+(\\?|$)", "/" + database + "$1");
        Flyway.configure().dataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword()).locations("classpath:" + lineage)
                .load().migrate();
        var before = new JdbcTemplate(new DriverManagerDataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword()))
                .queryForList("SELECT table_name || ':' || column_name FROM information_schema.columns WHERE table_schema='platform'"
                        + " ORDER BY 1", String.class);

        try (var context = JpaTestContext.start(url, POSTGRES.getUsername(), POSTGRES.getPassword())) {
            var mapped = context.entityManagerFactory().getMetamodel().getEntities().stream()
                    .map(EntityType::getJavaType).map(Class::getName).collect(Collectors.toSet());
            assertThat(mapped).containsExactlyInAnyOrderElementsOf(JpaTestContext.declaredEntities());
            var after = new JdbcTemplate(context.dataSource()).queryForList(
                    "SELECT table_name || ':' || column_name FROM information_schema.columns WHERE table_schema='platform' ORDER BY 1",
                    String.class);
            assertThat(after).as("validate must not change the schema").isEqualTo(before);
        }
    }
}
