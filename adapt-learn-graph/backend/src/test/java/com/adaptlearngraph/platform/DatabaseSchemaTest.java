package com.adaptlearngraph.platform;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ClassPathResource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DatabaseSchemaTest {
    @Test
    void migratesCleanDatabaseAndRemainsRepeatable() throws Exception {
        try (var postgres = new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            postgres.start();
            var flyway = Flyway.configure()
                    .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .locations("classpath:db/migration").load();
            flyway.migrate();
            assertEquals(0, flyway.migrate().migrationsExecuted);
            flyway.validate();
            try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(),
                    postgres.getPassword());
                    var statement = connection.createStatement()) {
                try (var result = statement
                        .executeQuery("SELECT state FROM platform.catalog_guard WHERE guard_id = 1")) {
                    result.next();
                    assertEquals("BLOCKED", result.getString(1));
                }
                for (String invalid : new String[] { "-0.1", "1.1", "'NaN'", "'Infinity'", "'-Infinity'" }) {
                    assertEquals("23514", assertThrows(SQLException.class,
                            () -> statement.execute("SELECT (" + invalid + ")::platform.unit_interval")).getSQLState());
                }
                statement.execute(
                        """
                                INSERT INTO platform.account(account_id, identifier, normalized_identifier, password_hash)
                                VALUES ('00000000-0000-0000-0000-000000000001', 'synthetic', 'synthetic', 'not-a-login');
                                INSERT INTO platform.learner_state(learner_id) VALUES ('00000000-0000-0000-0000-000000000001');
                                INSERT INTO platform.catalog_release VALUES ('00000000-0000-0000-0000-000000000002', 1, repeat('a',64), '00000000-0000-0000-0000-000000000003', now());
                                INSERT INTO platform.catalog_reference VALUES ('00000000-0000-0000-0000-000000000004', gen_random_uuid(), gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'TARGET_ROLE', repeat('a',64), now());
                                INSERT INTO platform.target_selection(selection_id, learner_id, role_ref_id)
                                VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004');
                                """);
                assertEquals("23505",
                        assertThrows(SQLException.class,
                                () -> statement.execute(
                                        """
                                                INSERT INTO platform.target_selection(selection_id, learner_id, role_ref_id)
                                                VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004')
                                                """))
                                .getSQLState());
                assertEquals("23514", assertThrows(SQLException.class,
                        () -> statement.execute("DELETE FROM platform.catalog_reference")).getSQLState());
                try (var fixture = new ClassPathResource("db/schema_invariants.sql").getInputStream()) {
                    statement.execute(new String(fixture.readAllBytes(), StandardCharsets.UTF_8));
                }
            }
        }
    }
}