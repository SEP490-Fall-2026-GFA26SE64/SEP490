package com.adaptlearngraph.catalog.infrastructure;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;

class MergedMigrationLineageIntegrationTest {
    @Test void canonicalQuestionBankHistory29UpgradesWithoutChangingChecksums() { upgrade("migration", "29"); }
    @Test void workspaceHistory35ReceivesQuestionBankAndContent() { upgrade("workspace-migration", "35"); }
    @Test void workspaceQuestionBankHistory36KeepsInstalledQuestionBankMigration() { upgrade("workspace-migration", "36"); }
    @Test void moduleHistory38UpgradesWithoutChangingInstalledChecksums() { upgrade("module-migration", "38"); }
    @Test void moduleHistory41ReceivesQuestionBank() { upgrade("module-migration", "41"); }
    private void upgrade(String directory,String previous) {
        try(var pg=new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            pg.start();
            var source=new DriverManagerDataSource(pg.getJdbcUrl(),pg.getUsername(),pg.getPassword());
            var jdbc=new JdbcTemplate(source);String location="classpath:db/"+directory;
            Flyway.configure().dataSource(source).locations(location).target(previous).load().migrate();
            var before=jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history ORDER BY installed_rank");
            var flyway=Flyway.configure().dataSource(source).locations(location).load();flyway.migrate();flyway.validate();
            assertEquals(0,flyway.migrate().migrationsExecuted);
            assertEquals(before,jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history WHERE installed_rank<=? ORDER BY installed_rank",before.size()));
            assertEquals("42",jdbc.queryForObject("SELECT version FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 1",String.class));
            for(String table:new String[]{"initial_pathway_request","initial_pathway_teaching_v2","module_authoring","learning_lesson_progress","manual_learning_pathway","question_bank_workspace","question_bank_identity","question_bank_mail","workspace_baseline_resource","registration_session"})
                assertEquals("platform."+table,jdbc.queryForObject("SELECT to_regclass(?)::text",String.class,"platform."+table));
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM platform.initial_pathway_request",Integer.class));
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM platform.manual_learning_pathway",Integer.class));
        }
    }
}
