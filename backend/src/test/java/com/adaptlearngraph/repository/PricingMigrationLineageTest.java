package com.adaptlearngraph.repository;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.file.Files;
import java.nio.file.Path;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;

class PricingMigrationLineageTest {
    @Test void deployedPricing67UpgradesWithoutRepeatingPricing() throws Exception {
        try (var pg = new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            pg.start();
            var ds = new DriverManagerDataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
            var jdbc = new JdbcTemplate(ds);
            var location = "filesystem:" + Path.of("src/main/resources/db/workspace-migration").toAbsolutePath();
            Flyway.configure().dataSource(ds).locations(location).target("67").load().migrate();
            var history = jdbc.queryForList("SELECT version,script,checksum FROM flyway_schema_history ORDER BY installed_rank");
            var localRepair = Files.readString(Path.of("../deploy/scripts/reconcile-local-assessment-history.sql"));
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.execute(localRepair));
            assertEquals(history, jdbc.queryForList("SELECT version,script,checksum FROM flyway_schema_history ORDER BY installed_rank"));
            var flyway = Flyway.configure().dataSource(ds).locations(location).load();
            flyway.migrate(); flyway.validate();
            assertEquals(history, jdbc.queryForList("SELECT version,script,checksum FROM flyway_schema_history WHERE version::int<=67 ORDER BY installed_rank"));
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE script LIKE '%demo_subscription_prices%'", Integer.class));
            assertEquals(0, flyway.migrate().migrationsExecuted);
        }
    }

    @Test void oldLocalHistoryCanBeReconciledWithoutRepeatingAssessmentSql() throws Exception {
        var legacy = Files.createTempDirectory("legacy-assessment-migrations-");
        try (var pg = new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            var current = Path.of("src/main/resources/db/workspace-migration");
            try (var files = Files.list(current)) {
                for (var file : files.toList()) {
                    var name = file.getFileName().toString();
                    if (name.equals("V67__demo_subscription_prices.sql")) continue;
                    name = name.replace("V71__", "V67__").replace("V72__", "V68__").replace("V73__", "V69__");
                    Files.copy(file, legacy.resolve(name));
                }
            }
            pg.start();
            var ds = new DriverManagerDataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
            var jdbc = new JdbcTemplate(ds);
            Flyway.configure().dataSource(ds).locations("filesystem:" + legacy).load().migrate();
            var checksums = jdbc.queryForList("SELECT installed_rank,checksum FROM flyway_schema_history ORDER BY installed_rank");
            jdbc.execute(Files.readString(Path.of("../deploy/scripts/reconcile-local-assessment-history.sql")));
            assertEquals(checksums, jdbc.queryForList("SELECT installed_rank,checksum FROM flyway_schema_history ORDER BY installed_rank"));
            var flyway = Flyway.configure().dataSource(ds).locations("filesystem:" + current.toAbsolutePath()).outOfOrder(true).load();
            assertEquals(1, flyway.migrate().migrationsExecuted);
            flyway.validate();
            assertEquals(0, flyway.migrate().migrationsExecuted);
        } finally {
            try (var files = Files.list(legacy)) { for (var file : files.toList()) Files.delete(file); }
            Files.delete(legacy);
        }
    }
}
