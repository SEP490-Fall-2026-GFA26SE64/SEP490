package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.entities.AccountEntity;
import com.adaptlearngraph.support.JpaTestContext;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

/** {@link InsertOnlyRepository#insert} must never merge into (overwrite) a row owned by another organization. */
class InsertOnlyRepositoryIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static JpaTestContext persistence;
    private static JdbcTemplate jdbc;

    @BeforeAll
    static void start() {
        POSTGRES.start();
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/workspace-migration").load().migrate();
        persistence = JpaTestContext.start(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        jdbc = new JdbcTemplate(persistence.dataSource());
    }

    @AfterAll
    static void stop() {
        persistence.close();
        POSTGRES.stop();
    }

    @Test
    void insertingAnExistingIdOfAnotherOrganizationFailsAndLeavesItUntouched() {
        UUID organizationA = organization("ORG-A");
        UUID organizationB = organization("ORG-B");
        UUID account = UUID.randomUUID();
        var accounts = persistence.bean(AccountJpaRepository.class);
        accounts.insert(new AccountEntity(account, organizationA, "a-" + account + "@a.test", "a-" + account + "@a.test",
                "hash-a", Instant.parse("2026-01-01T00:00:00Z")));

        assertThatThrownBy(() -> accounts.insert(new AccountEntity(account, organizationB, "b@b.test", "b@b.test", "hash-b",
                Instant.parse("2026-01-02T00:00:00Z")))).isInstanceOf(DataIntegrityViolationException.class);

        assertThat(jdbc.queryForMap("SELECT organization_id, identifier, password_hash FROM platform.account WHERE account_id = ?",
                account)).isEqualTo(Map.of("organization_id", organizationA, "identifier", "a-" + account + "@a.test",
                "password_hash", "hash-a"));
    }

    private static UUID organization(String code) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO platform.organization(organization_id, code, name) VALUES (?, ?, ?)", id,
                code + "-" + id.toString().substring(0, 8).toUpperCase(), code);
        return id;
    }
}
