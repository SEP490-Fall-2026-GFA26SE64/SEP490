package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.PasswordResetEntity;
import com.adaptlearngraph.support.JpaTestContext;
import java.time.Instant;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import static org.junit.jupiter.api.Assertions.*;

class PasswordResetPersistenceTest {
    @Test void scopedInvalidationAndManagedConsumptionNeverOverwriteAnotherAccountsProof() {
        try (var pg=new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            pg.start();
            var ds=new DriverManagerDataSource(pg.getJdbcUrl(),pg.getUsername(),pg.getPassword());
            Flyway.configure().dataSource(ds).locations("classpath:db/migration").load().migrate();
            var sql=new JdbcTemplate(ds);UUID first=UUID.randomUUID(),second=UUID.randomUUID();
            for(UUID account:new UUID[]{first,second}) sql.update(
                    "INSERT INTO platform.account(account_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,'test-only')",
                    account,account+"@example.test",account+"@example.test");
            try(var jpa=JpaTestContext.start(ds)) {
                var tokens=jpa.bean(PasswordResetJpaRepository.class);var tx=new TransactionTemplate(jpa.transactionManager());
                Instant now=Instant.parse("2026-11-18T00:00:00Z");
                tx.executeWithoutResult(status->{
                    tokens.insert(new PasswordResetEntity(UUID.randomUUID(),first,"a".repeat(64),now.plusSeconds(600),now));
                    tokens.insert(new PasswordResetEntity(UUID.randomUUID(),second,"b".repeat(64),now.plusSeconds(600),now));
                });
                tx.executeWithoutResult(status->assertEquals(1,tokens.invalidateExistingForAccount(first,now)));
                tx.executeWithoutResult(status->{
                    assertTrue(tokens.findValidByDigest("a".repeat(64)).isEmpty());
                    var proof=tokens.findValidByDigest("b".repeat(64)).orElseThrow();
                    assertEquals(second,proof.getAccountId());proof.consume(now.plusSeconds(1));
                });
                tx.executeWithoutResult(status->assertTrue(tokens.findValidByDigest("b".repeat(64)).isEmpty()));
                assertEquals(now.plusSeconds(1),sql.queryForObject(
                        "SELECT consumed_at FROM platform.password_reset WHERE account_id=?",java.sql.Timestamp.class,second).toInstant());
            }
        }
    }
}
