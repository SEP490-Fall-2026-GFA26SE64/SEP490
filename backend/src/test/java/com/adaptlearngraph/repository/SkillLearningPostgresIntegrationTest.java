package com.adaptlearngraph.repository;

import com.adaptlearngraph.support.JpaTestContext;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class SkillLearningPostgresIntegrationTest {
    @Test void forwardMigrationsBackfillOnlyProvenHistoryAndPreserveImmutableTenantScopedEvidence() throws Exception {
        try(var pg=new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            pg.start();
            for(String lineage:List.of("migration","module-migration","workspace-migration")) {
                String db="skill_"+lineage.replace('-','_');
                try(var conn=java.sql.DriverManager.getConnection(pg.getJdbcUrl(),pg.getUsername(),pg.getPassword());var statement=conn.createStatement()) {
                    statement.execute("CREATE DATABASE "+db);
                }
                String url=pg.getJdbcUrl().substring(0,pg.getJdbcUrl().lastIndexOf('/')+1)+db;
                var source=new DriverManagerDataSource(url,pg.getUsername(),pg.getPassword());var jdbc=new JdbcTemplate(source);
                Flyway.configure().dataSource(source).locations("filesystem:src/main/resources/db/"+lineage).target("49").load().migrate();
                String document="""
                    {"revisions":[{"number":1,"state":"RELEASED","payload":{"metadata":{"reviewStatus":"APPROVED"},"contentVersion":"original","teachings":[{"skillId":"skill"}],"content":{"lessons":[{"id":"a"},{"id":"b"}]}}}]}
                    """;
                for(String module:List.of("complete","partial","ambiguous","draft"))jdbc.update("INSERT INTO platform.module_authoring VALUES ('org',?,?::jsonb)",module,
                        module.equals("draft")?document.replace("RELEASED","DRAFT"):module.equals("ambiguous")?document.replace("[{\"skillId\":\"skill\"}]","[{\"skillId\":\"skill\"},{\"skillId\":\"other\"}]"):document);
                for(String module:List.of("complete","partial","ambiguous","draft")) {
                    jdbc.update("INSERT INTO platform.learning_lesson_progress(organization_id,learner_id,module_id,revision,lesson_id,completed_at) VALUES ('org','learner',?,1,'a','2026-10-01T00:00:00Z')",module);
                    if(!module.equals("partial"))jdbc.update("INSERT INTO platform.learning_lesson_progress(organization_id,learner_id,module_id,revision,lesson_id,completed_at) VALUES ('org','learner',?,1,'b','2026-10-02T00:00:00Z')",module);
                }
                var flyway=Flyway.configure().dataSource(source).locations("filesystem:src/main/resources/db/"+lineage).load();flyway.migrate();
                assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM platform.learning_module_completion",Integer.class));
                assertTrue(jdbc.queryForObject("SELECT document=?::jsonb FROM platform.module_authoring WHERE module_id='complete'",Boolean.class,document));
                try(var context=JpaTestContext.start(source)) {
                    var completions=context.bean(LearningModuleCompletionJpaRepository.class);
                    var admission=context.bean(LearningSelfStudyJpaRepository.class);
                    var rows=completions.find("org","learner","skill");assertEquals(1,rows.size());
                    assertEquals("complete",rows.getFirst().moduleId());assertEquals("original",rows.getFirst().contentVersion());
                    assertEquals(java.time.Instant.parse("2026-10-02T00:00:00Z"),rows.getFirst().completedAt());
                    assertTrue(completions.find("other","learner","skill").isEmpty());assertTrue(completions.find("org","other","skill").isEmpty());
                    assertEquals(0,completions.insert("org","learner","complete",1,"other","wrong","2026-10-03T00:00:00Z"));
                    assertEquals("skill",completions.find("org","learner","skill").getFirst().skillId());
                    assertEquals(1,admission.admit("org","learner","complete",1,"skill"));assertEquals(0,admission.admit("org","learner","complete",1,"skill"));
                    assertTrue(admission.admitted("org","learner","complete"));assertFalse(admission.admitted("org","other","complete"));
                }
                assertThrows(Exception.class,()->jdbc.update("UPDATE platform.learning_module_completion SET skill_id='changed'"));
                assertThrows(Exception.class,()->jdbc.update("DELETE FROM platform.learning_self_study"));
                assertEquals(0,flyway.migrate().migrationsExecuted);
            }
        }
    }
}
