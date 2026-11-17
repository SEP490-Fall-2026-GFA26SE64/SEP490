package com.adaptlearngraph.repository;

import static org.junit.jupiter.api.Assertions.*;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.support.JpaTestContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

/** Disposable PG only. Never connects to the shared local database or modifies learner data there. */
class SharedSkillScopePostgresTest {
    static final PostgreSQLContainer<?> PG=new PostgreSQLContainer<>("postgres:17.6-alpine")
        .withCommand("postgres","-c","shared_buffers=32MB","-c","max_connections=40")
        .withCreateContainerCmdModifier(c->c.getHostConfig().withMemory(256L*1024*1024));
    static final ObjectMapper JSON=new ObjectMapper().findAndRegisterModules();
    static JdbcTemplate jdbc;static DriverManagerDataSource ds;static JpaTestContext jpa;
    static Fixture legacy,unresolved;static UUID oldFinal,oldA,oldB,evidence;
    static String oldSnapshot;static List<Map<String,Object>> oldEvidence,oldResults;
    record Fixture(UUID org,UUID user,UUID selection,UUID skillPolicy,UUID baselinePolicy) {}
    static String write(Object o){try{return JSON.writeValueAsString(o);}catch(Exception e){throw new AssertionError(e);}}
    @BeforeAll static void start() {
        PG.start();ds=new DriverManagerDataSource(PG.getJdbcUrl(),PG.getUsername(),PG.getPassword());jdbc=new JdbcTemplate(ds);
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("68").load().migrate();
        legacy=fixture();oldFinal=paper(legacy,"A","v1","FOUNDATION","FINALIZED",null,"old-final",false);
        oldA=paper(legacy,"A","v1","FOUNDATION","IN_PROGRESS",null,"old-active-A",false);
        oldB=paper(legacy,"B","v1","FOUNDATION","IN_PROGRESS",null,"old-active-B",true);
        unresolved=fixture();paper(unresolved,"orphan","","FOUNDATION","FINALIZED",null,"orphan-key",false);
        oldSnapshot=jdbc.queryForObject("SELECT context_snapshot::text FROM platform.rule_assessment_attempt WHERE id=?",String.class,oldFinal);
        UUID group=jdbc.queryForObject("SELECT group_id FROM platform.rule_assessment_group WHERE attempt_id=?",UUID.class,oldFinal);
        jdbc.update("INSERT INTO platform.rule_assessment_group_result(attempt_id,group_id,correct_count,total_count,mandatory_satisfied,passed,veto_triggered,reasons,finalized_at) VALUES (?,?,1,1,true,true,false,'[]',clock_timestamp())",oldFinal,group);
        evidence=UUID.randomUUID();jdbc.update("INSERT INTO platform.skill_knowledge_evidence(id,organization_id,learner_id,skill_id,knowledge_level,requirement_snapshot,source_kind,source_id,source_version,achieved_at) VALUES (?,?,?,'skill','FOUNDATION','{\"skillVersion\":\"v1\",\"skillName\":\"Skill\"}','MODULE_ASSESSMENT',?,1,clock_timestamp())",evidence,legacy.org,legacy.user,oldFinal);
        oldEvidence=jdbc.queryForList("SELECT * FROM platform.skill_knowledge_evidence WHERE id=?",evidence);oldResults=jdbc.queryForList("SELECT * FROM platform.rule_assessment_group_result WHERE attempt_id=?",oldFinal);
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").load().migrate();
        jpa=JpaTestContext.start(ds);
    }
    @AfterAll static void stop(){if(jpa!=null)jpa.close();PG.stop();}
    static Fixture fixture() {
        UUID org=UUID.randomUUID(),user=UUID.randomUUID(),selection=UUID.randomUUID();
        jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,?, 'Isolated shared Skill scope')",org,"SCOPE-"+org.toString().substring(0,8).toUpperCase(java.util.Locale.ROOT));
        jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?, 'unusable-test-only')",user,org,user+"@scope.test",user+"@scope.test");
        jdbc.update("INSERT INTO platform.learner_state(learner_id) VALUES (?)",user);
        jdbc.update("INSERT INTO platform.employee_role_selection(selection_id,organization_id,learner_id,role_id,job_position_id,role_snapshot,target_revision,selected_at) VALUES (?,?,?,'role','job','{}',1,clock_timestamp())",selection,org,user);
        UUID skillPolicy=policy(org,user,"SKILL_ASSESSMENT"),baselinePolicy=policy(org,user,"BASELINE");return new Fixture(org,user,selection,skillPolicy,baselinePolicy);
    }
    static UUID policy(UUID org,UUID user,String purpose) {
        UUID id=UUID.randomUUID();String scope="a".repeat(64),hash="b".repeat(64);
        jdbc.update("INSERT INTO platform.assessment_rule_policy_version(id,organization_id,purpose,version,configuration,configuration_hash,created_by,created_at,published_by,published_at,scope_key,catalog_hash) VALUES (?,?,?,1,'{}',?,?,clock_timestamp(),?,clock_timestamp(),?,?)",id,org,purpose,hash,user,user,scope,"c".repeat(64));
        jdbc.update("INSERT INTO platform.assessment_rule_scoped_activation(organization_id,purpose,scope_key,current_policy_version_id,revision,changed_by,changed_at) VALUES (?,?,?,?,1,?,clock_timestamp())",org,purpose,scope,id,user);return id;
    }
    static UUID paper(Fixture f,String module,String version,String level,String state,UUID previous,String key,boolean pathway) {
        UUID id=UUID.randomUUID();Instant start=Instant.now().minusSeconds(60),deadline=start.plusSeconds(600);
        var req=Map.of("requirement",Map.of("skillId","skill","knowledgeLevel",level,"outcomeCodes",List.of()),"skillVersion",version,"skillName","Skill");
        var context=new LinkedHashMap<String,Object>();context.put("requirements",List.of(req));context.put("policyScopeKey","a".repeat(64));context.put("learningContext",pathway?"ROLE_PATHWAY":"INDEPENDENT_SKILL");context.put("moduleId",module);context.put("moduleRevision",1);context.put("contentVersion","1");
        var command=new com.adaptlearngraph.services.RuleAssessmentAttemptService.Start(com.adaptlearngraph.entities.domain.RuleAssessment.Purpose.SKILL_ASSESSMENT,pathway?f.selection:null,pathway?1:0,null,pathway?UUID.randomUUID():null,module,1);context.put("start",command);
        jdbc.update("INSERT INTO platform.rule_assessment_attempt(id,organization_id,learner_id,purpose,context_key,selection_id,selection_revision,policy_id,policy_hash,context_snapshot,state,revision,started_at,deadline_at,finished_at,finish_reason,previous_attempt_id,processing_status) VALUES (?,?,?,'SKILL_ASSESSMENT',?,?,?,?,?,CAST(? AS jsonb),?,1,?,?,?,?,?,'PENDING')",id,f.org,f.user,key,pathway?f.selection:null,pathway?1:0,f.skillPolicy,"b".repeat(64),write(Map.of("context",context,"groupCount",1,"itemCount",1)),state,Timestamp.from(start),Timestamp.from(deadline),state.equals("FINALIZED")?Timestamp.from(Instant.now()):null,state.equals("FINALIZED")?"SUBMITTED":null,previous);
        jdbc.update("INSERT INTO platform.rule_assessment_group(attempt_id,group_id,organization_id,learner_id,skill_id,knowledge_level,outcome_codes,group_role,total_count,required_correct_count,mandatory_required,all_wrong_veto) VALUES (?,?,?,?,'skill',?,'[]','MAIN',1,1,false,false)",id,UUID.randomUUID(),f.org,f.user,level);
        return id;
    }
    @Test void migrationPreservesLegacyPapersResultsEvidenceAndMultipleActiveAttempts() {
        assertEquals(oldSnapshot,jdbc.queryForObject("SELECT context_snapshot::text FROM platform.rule_assessment_attempt WHERE id=?",String.class,oldFinal));
        assertEquals(oldEvidence,jdbc.queryForList("SELECT * FROM platform.skill_knowledge_evidence WHERE id=?",evidence));
        assertEquals(oldResults,jdbc.queryForList("SELECT * FROM platform.rule_assessment_group_result WHERE attempt_id=?",oldFinal));
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM platform.rule_assessment_attempt WHERE id IN (?,?) AND state='IN_PROGRESS'",Integer.class,oldA,oldB));
        assertThrows(DataAccessException.class,()->paper(legacy,"C","v1","FOUNDATION","IN_PROGRESS",oldFinal,new SkillAssessmentScope("skill",KnowledgeLevel.FOUNDATION,"v1").contextKey(),false));
    }
    @Test void realRepositoryAggregatesBothSourcesAndKeepsOwnerVersionLevelIsolation() {
        var repo=jpa.bean(RuleAssessmentAttemptJpaRepository.class);
        assertEquals(3,repo.skillCount(legacy.org,legacy.user,"skill","FOUNDATION","v1"));
        assertEquals(2,repo.skillActive(legacy.org,legacy.user,"skill","FOUNDATION","v1").size());
        assertEquals(0,repo.skillCount(legacy.org,UUID.randomUUID(),"skill","FOUNDATION","v1"));
        assertEquals(0,repo.skillCount(UUID.randomUUID(),legacy.user,"skill","FOUNDATION","v1"));
        assertEquals(0,repo.skillCount(legacy.org,legacy.user,"skill","ADVANCED","v1"));assertEquals(0,repo.skillCount(legacy.org,legacy.user,"skill","FOUNDATION","v2"));
        assertEquals(1,repo.skillHistory(legacy.org,legacy.user,"skill","FOUNDATION","v1",1,1).size());
        assertEquals(oldFinal,repo.skillLatestFinished(legacy.org,legacy.user,"skill","FOUNDATION","v1").getFirst().getId());
    }
    @Test void crossModuleAndFlowRetakeCanReferenceItsActualLegacyPredecessor() {
        var f=fixture();UUID previous=paper(f,"A","v1","FOUNDATION","FINALIZED",null,"module-A",true);
        UUID child=paper(f,"B","v1","FOUNDATION","IN_PROGRESS",previous,new SkillAssessmentScope("skill",KnowledgeLevel.FOUNDATION,"v1").contextKey(),false);
        assertEquals(previous,jdbc.queryForObject("SELECT previous_attempt_id FROM platform.rule_assessment_attempt WHERE id=?",UUID.class,child));
        assertThrows(DataAccessException.class,()->jdbc.update("UPDATE platform.rule_assessment_attempt SET context_key='rewritten',revision=revision+1 WHERE id=?",previous));
        assertThrows(DataAccessException.class,()->jdbc.update("DELETE FROM platform.rule_assessment_attempt WHERE id=?",previous));
    }
    @Test void rejectsPredecessorsOfAnotherVersionLevelOwnerOrPurpose() {
        var f=fixture();UUID previous=paper(f,"A","v1","FOUNDATION","FINALIZED",null,"module-A",false);
        assertThrows(DataAccessException.class,()->paper(f,"B","v2","FOUNDATION","IN_PROGRESS",previous,"v2",false));
        assertThrows(DataAccessException.class,()->paper(f,"B","v1","ADVANCED","IN_PROGRESS",previous,"advanced",false));
        var foreign=fixture();assertThrows(DataAccessException.class,()->paper(foreign,"B","v1","FOUNDATION","IN_PROGRESS",previous,"foreign",false));
    }
    @Test void exactScopeGuardSerializesRacingStartsEvenWithDifferentLegacyKeys() throws Exception {
        var f=fixture();var executor=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
        try {
            List<Future<Boolean>> futures=new ArrayList<>();
            for(int i=0;i<2;i++){final int n=i;futures.add(executor.submit(()->{gate.await();try{return new TransactionTemplate(new DataSourceTransactionManager(ds)).execute(s->{paper(f,"m"+n,"v1","FOUNDATION","IN_PROGRESS",null,"racing-key-"+n,false);return true;});}catch(DataAccessException conflict){return false;}}));}
            gate.countDown();int successes=0;for(var future:futures)if(future.get(30,TimeUnit.SECONDS))successes++;
            assertEquals(1,successes);assertEquals(1,jpa.bean(RuleAssessmentAttemptJpaRepository.class).skillActive(f.org,f.user,"skill","FOUNDATION","v1").size());
        }finally{executor.shutdownNow();}
    }
    static UUID baseline(Fixture f,String key,UUID previous) {
        UUID id=UUID.randomUUID();var c=new LinkedHashMap<String,Object>();c.put("policyScopeKey","a".repeat(64));c.put("start",new com.adaptlearngraph.services.RuleAssessmentAttemptService.Start(com.adaptlearngraph.entities.domain.RuleAssessment.Purpose.BASELINE,f.selection,1,previous,null,null,null));c.put("requirements",List.of());
        jdbc.update("INSERT INTO platform.rule_assessment_attempt(id,organization_id,learner_id,purpose,context_key,selection_id,selection_revision,policy_id,policy_hash,context_snapshot,state,revision,started_at,deadline_at,finished_at,finish_reason,previous_attempt_id,processing_status) VALUES (?,?,?,'BASELINE',?,?,1,?,?,CAST(? AS jsonb),'FINALIZED',1,clock_timestamp()-interval '60 seconds',clock_timestamp()+interval '600 seconds',clock_timestamp(),'SUBMITTED',?,'PENDING')",id,f.org,f.user,key,f.selection,f.baselinePolicy,"b".repeat(64),write(Map.of("context",c)),previous);
        return id;
    }
    @Test void baselinePredecessorStillRequiresSamePurposeAndContext() {
        var f=fixture();UUID prior=baseline(f,"baseline-A",null);
        assertThrows(DataAccessException.class,()->baseline(f,"baseline-B",prior));
        UUID child=baseline(f,"baseline-A",prior);assertEquals(prior,jdbc.queryForObject("SELECT previous_attempt_id FROM platform.rule_assessment_attempt WHERE id=?",UUID.class,child));
        assertThrows(DataAccessException.class,()->paper(f,"B","v1","FOUNDATION","IN_PROGRESS",prior,"skill-key",false));
        UUID skill=paper(f,"A","v1","FOUNDATION","FINALIZED",null,"skill-parent",false);
        assertThrows(DataAccessException.class,()->baseline(f,"baseline-A",skill));
    }
    @Test void legacyMissingVersionBlocksANewAllowanceWithoutChangingItsRecord() {
        var repo=jpa.bean(RuleAssessmentAttemptJpaRepository.class);
        assertEquals(1,repo.unresolvedSkillCount(unresolved.org,unresolved.user,"skill","FOUNDATION"));
        assertEquals(0,repo.skillCount(unresolved.org,unresolved.user,"skill","FOUNDATION","v1"));
        assertThrows(DataAccessException.class,()->paper(unresolved,"new","v1","FOUNDATION","IN_PROGRESS",null,"new-key",false));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM platform.rule_assessment_attempt WHERE organization_id=? AND learner_id=?",Integer.class,unresolved.org,unresolved.user));
    }
    @Test void migrationAlsoPreservesTheRunningLocalLineageInAnIsolatedDatabase() {
        String migrations=System.getProperty("scope.compat.migrations");
        assertNotNull(migrations,"Supply isolated old66 + new69 resources to verify local compatibility");
        jdbc.execute("CREATE DATABASE shared_scope_compat");
        var compatDs=new DriverManagerDataSource(PG.getJdbcUrl().replace("/"+PG.getDatabaseName(),"/shared_scope_compat"),PG.getUsername(),PG.getPassword());
        Flyway.configure().dataSource(compatDs).locations("filesystem:"+migrations).target("66").load().migrate();
        var original=jdbc;jdbc=new JdbcTemplate(compatDs);
        try {
            var before=jdbc.queryForList("SELECT version,description,checksum FROM public.flyway_schema_history ORDER BY installed_rank");
            var f=fixture();UUID prior=paper(f,"old","v1","FOUNDATION","FINALIZED",null,"old-context",false);
            String frozen=jdbc.queryForObject("SELECT context_snapshot::text FROM platform.rule_assessment_attempt WHERE id=?",String.class,prior);
            assertEquals(1,Flyway.configure().dataSource(compatDs).locations("filesystem:"+migrations).load().migrate().migrationsExecuted);
            assertEquals(before,jdbc.queryForList("SELECT version,description,checksum FROM public.flyway_schema_history WHERE version<>'69' ORDER BY installed_rank"));
            UUID child=paper(f,"new","v1","FOUNDATION","IN_PROGRESS",prior,new SkillAssessmentScope("skill",KnowledgeLevel.FOUNDATION,"v1").contextKey(),true);
            assertEquals(prior,jdbc.queryForObject("SELECT previous_attempt_id FROM platform.rule_assessment_attempt WHERE id=?",UUID.class,child));
            assertEquals(frozen,jdbc.queryForObject("SELECT context_snapshot::text FROM platform.rule_assessment_attempt WHERE id=?",String.class,prior));
        }finally{jdbc=original;}
    }
    @Test void malformedHistoricalDefinitionsAreUnresolvedRatherThanGuessed() {
        assertNull(jdbc.queryForObject("SELECT platform.rule_skill_snapshot_scope(CAST(? AS jsonb),'skill','FOUNDATION')::text",String.class,"{\"context\":{\"requirements\":[{\"requirement\":{\"skillId\":\"skill\",\"knowledgeLevel\":\"FOUNDATION\"}}]}}"));
        String duplicate="{\"context\":{\"requirements\":[{\"requirement\":{\"skillId\":\"skill\",\"knowledgeLevel\":\"FOUNDATION\"},\"skillVersion\":\"v1\"},{\"requirement\":{\"skillId\":\"skill\",\"knowledgeLevel\":\"FOUNDATION\"},\"skillVersion\":\"v2\"}]}}";
        assertNull(jdbc.queryForObject("SELECT platform.rule_skill_snapshot_scope(CAST(? AS jsonb),'skill','FOUNDATION')::text",String.class,duplicate));
    }
}
