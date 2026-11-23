package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.*;
import jakarta.persistence.EntityManager;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Real selection, papers, answer/result/outbox/job persistence. Catalog/admission are explicit controlled ports. */
class WF05AttemptPersistenceTest {
    WF05PolicyPersistenceTest f; CurrentRoleSelectionStore selections; RoleBaselineFlow flow;
    RuleAssessmentAttemptService service; RuleAssessmentAttemptService.Start command;
    RoleBaselineFlow.Actor current; RoleBaselineFlow.Selection selection; List<RoleBaselineFlow.Role> roles;
    @BeforeAll static void start(){WF05PolicyPersistenceTest.start();}
    @AfterAll static void stop(){WF05PolicyPersistenceTest.stop();}
    @BeforeEach void setup() throws Exception {
        f=new WF05PolicyPersistenceTest();f.setup();var db=WF05PolicyPersistenceTest.db;var sql=WF05PolicyPersistenceTest.sql;
        var locks=new PostgresAdvisoryLocks(db.bean(EntityManager.class));var tx=new TransactionTemplate(db.transactionManager());
        selections=new CurrentRoleSelectionStore(RoleSelectionRepositories.from(db::bean,locks),f.json,tx);
        roles=List.of(role("R1","L1"),role("R2","L2"));current=new RoleBaselineFlow.Actor(f.org,f.actor);
        flow=new RoleBaselineFlow(()->current,org->roles,selections,mock(RoleBaselineFlow.Baseline.class));
        selection=flow.choose("R1","L1",null,UUID.randomUUID().toString());
        f.publish(f.baseline,f.save(f.baseline,f.draft(f.baseline)));
        UUID bank=UUID.randomUUID();sql.update("INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,'WF05 bank',?)",bank,f.actor);
        sql.update("INSERT INTO platform.question_bank_scope(organization_id,question_bank_id) VALUES (?,?)",f.org,bank);
        for(int i=0;i<2;i++){UUID item=UUID.randomUUID();
            sql.update("INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,protected_key,publication_state,content_hash,micro_skill_id,micro_skill_name_snapshot,difficulty) VALUES (?,?,1,?,'WF05 item','{\"options\":[{\"id\":\"A\",\"text\":\"Correct\"},{\"id\":\"B\",\"text\":\"Incorrect\"}]}'::jsonb,'{\"correctOptionId\":\"A\"}'::jsonb,'PUBLISHED',?,'S-A','Skill A','EASY')",item,item,bank,"c".repeat(64));
            sql.update("INSERT INTO platform.assessment_item_knowledge_mapping(item_version_id,organization_id,question_bank_id,skill_id,knowledge_level,outcome_code,mandatory,mapping_version,mapping_hash) VALUES (?,?,?,'S-A','FOUNDATION','OUT-1',false,1,?)",item,f.org,bank,"d".repeat(64));
            sql.update("INSERT INTO platform.assessment_item_skill_scope(item_version_id,skill_version,source) VALUES (?,'v1','PUBLICATION')",item);
        }
        when(f.catalog.scopes(f.org,Purpose.BASELINE)).thenReturn(List.of(f.baseline));
        command=new RuleAssessmentAttemptService.Start(Purpose.BASELINE,selection.selectionId(),selection.revision(),null,null,null,null);
        var need=new Requirement("S-A",KnowledgeLevel.FOUNDATION,List.of("OUT-1"));
        var snapshot=f.json.writeValueAsString(Map.of("roleId","R1","roleName","Role R1","levelId","L1","levelName","Level L1",
            "jobPositionId","J1","jobPositionName","Job","start",command,"catalogFingerprint",roles.getFirst().fingerprint(),"requirements",List.of(Map.of("requirement",need,"skillName","Skill A","skillVersion","v1"))));
        var context=new RuleAssessmentAttemptService.Context(selection.selectionId(),selection.revision(),"baseline-"+selection.selectionId(),snapshot,
            List.of(new RuleAssessmentAttemptService.Need(need,GroupRole.TARGET)));
        var contexts=mock(RuleAssessmentAttemptService.Contexts.class);when(contexts.resolve(any(),any())).thenReturn(context);
        service=new RuleAssessmentAttemptService(()->current,selections,contexts,db.bean(RuleAssessmentAttemptJpaRepository.class),db.bean(AssessmentRulePolicyJpaRepository.class),
            db.bean(ScopedAssessmentPolicyJpaRepository.class),f.catalog,db.bean(AssessmentItemKnowledgeMappingJpaRepository.class),db.bean(OutboxEventJpaRepository.class),db.bean(ProcessingJobJpaRepository.class),
            locks,tx,f.json,1000,db.bean(AuditEventJpaRepository.class));
    }
    RoleBaselineFlow.Role role(String id,String level){return new RoleBaselineFlow.Role(id,id,id,"Scope","J1","Job","v1","a".repeat(64),
        List.of(new RoleBaselineFlow.Level(level,level,level,1,"Context","All",List.of(new RoleBaselineFlow.Skill("S-A","S-A","Skill A",List.of("FOUNDATION"),true)),"3 months"),
            new RoleBaselineFlow.Level(level+"-other",level+"-other","Other member level",2,"Context","All",List.of(new RoleBaselineFlow.Skill("S-A","S-A","Skill A",List.of("FOUNDATION"),true)),"3 months")),"role-v1");}
    @Test @org.junit.jupiter.api.Tag("bm04-wf05") @DisplayName("TC-WF05-F04 - Select an actual Role member Level")
    void exactLevel(){assertThat(selections.current(current).orElseThrow().levelId()).isEqualTo("L1");
        assertThatThrownBy(()->flow.choose("R1","L2",selection.selectionId(),UUID.randomUUID().toString())).hasMessageContaining("LEVEL_NOT_AVAILABLE");
        assertThat(selections.current(current).orElseThrow().selectionId()).isEqualTo(selection.selectionId());}
    @Test @org.junit.jupiter.api.Tag("bm04-wf05") @DisplayName("TC-WF05-F02 - Resume frozen paper and answers; deny another learner")
    void frozenResume(){var a=service.start(command,UUID.randomUUID());var q=a.questions().getFirst();
        var answered=service.answer(a.attemptId(),new RuleAssessmentAttemptService.Answer(a.revision(),q.position(),q.itemVersionId(),"A"),UUID.randomUUID());
        var active=f.service.read(Purpose.BASELINE,f.baseline.key(),0,20);
        var draft=f.service.create(Purpose.BASELINE,f.baseline.key(),new ScopedAssessmentPolicyService.Create(UUID.randomUUID(),active.activationRevision()));
        f.publish(f.baseline,f.save(f.baseline,draft));var resumed=service.resume(a.attemptId());
        assertThat(resumed.questions()).isEqualTo(answered.questions());assertThat(resumed.deadlineAt()).isEqualTo(a.deadlineAt());
        assertThat(service.start(command,UUID.randomUUID()).attemptId()).isEqualTo(a.attemptId());
        current=new RoleBaselineFlow.Actor(f.org,f.otherActor);assertThatThrownBy(()->service.resume(a.attemptId())).hasMessageContaining("NOT_FOUND");}
    @Test @org.junit.jupiter.api.Tag("bm04-wf05") @DisplayName("TC-WF05-S02 - Stale answer denied; submit replay finalizes once")
    void finalizesOnce(){var a=service.start(command,UUID.randomUUID());var q=a.questions().getFirst();
        var b=service.answer(a.attemptId(),new RuleAssessmentAttemptService.Answer(a.revision(),q.position(),q.itemVersionId(),"A"),UUID.randomUUID());
        assertThatThrownBy(()->service.answer(a.attemptId(),new RuleAssessmentAttemptService.Answer(a.revision(),q.position(),q.itemVersionId(),"B"),UUID.randomUUID())).hasMessageContaining("STALE_ATTEMPT_REVISION");
        UUID key=UUID.randomUUID();var done=service.submit(a.attemptId(),b.revision(),key);var replay=service.submit(a.attemptId(),b.revision(),key);
        assertThat(replay).isEqualTo(done);assertThat(done.finishReason()).isEqualTo("SUBMITTED");assertThat(done.results().getFirst().correctCount()).isEqualTo(1);
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.rule_assessment_group_result WHERE attempt_id=?",Integer.class,a.attemptId())).isEqualTo(1);
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.outbox_event WHERE event_type='RULE_ASSESSMENT_FINALIZED' AND aggregate_id=?",Integer.class,a.attemptId())).isEqualTo(1);}
    @Test @org.junit.jupiter.api.Tag("bm04-wf05") @DisplayName("TC-WF05-F05 - Active assessment prevents target changes")
    void activeLock(){service.start(command,UUID.randomUUID());
        assertThatThrownBy(()->flow.choose("R2","L2",selection.selectionId(),UUID.randomUUID().toString())).hasMessageContaining("ASSESSMENT_IN_PROGRESS");
        assertThatThrownBy(()->flow.choose("R1","L1-other",selection.selectionId(),UUID.randomUUID().toString())).hasMessageContaining("ASSESSMENT_IN_PROGRESS");
        assertThat(selections.current(current).orElseThrow().selectionId()).isEqualTo(selection.selectionId());
        assertThat(flow.choose("R1","L1",selection.selectionId(),UUID.randomUUID().toString()).selectionId()).isEqualTo(selection.selectionId());}
    @Test @org.junit.jupiter.api.Tag("bm04-wf05") @DisplayName("TC-WF05-F03 - Deadline finalizes diagnostics without achievement")
    void serverExpiry() throws InterruptedException {
        var active=f.service.read(Purpose.BASELINE,f.baseline.key(),0,20);
        var draft=f.service.create(Purpose.BASELINE,f.baseline.key(),new ScopedAssessmentPolicyService.Create(UUID.randomUUID(),active.activationRevision()));
        var saved=f.service.save(Purpose.BASELINE,f.baseline.key(),new ScopedAssessmentPolicyService.Save(UUID.randomUUID(),draft.draft().id(),draft.draft().revision(),f.baseline.catalogHash(),
            new Policy(null,0,3,f.config(Purpose.BASELINE).groups(),new BaselineTiming(1))));f.publish(f.baseline,saved);
        var a=service.start(command,UUID.randomUUID());var q=a.questions().getFirst();
        Thread.sleep(2200);service.expireDue();var done=service.resume(a.attemptId());
        assertThat(done.state()).isEqualTo("FINALIZED");assertThat(done.finishReason()).isEqualTo("DEADLINE");assertThat(done.results().getFirst().correctCount()).isZero();
        var late=service.answer(a.attemptId(),new RuleAssessmentAttemptService.Answer(a.revision(),q.position(),q.itemVersionId(),"A"),UUID.randomUUID());
        assertThat(late.results()).isEqualTo(done.results());assertThat(late.deadlineAt()).isEqualTo(a.deadlineAt());service.expireDue();
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.rule_assessment_group_result WHERE attempt_id=?",Integer.class,a.attemptId())).isEqualTo(1);
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE organization_id=? AND learner_id=?",Integer.class,f.org,f.actor)).isZero();
    }
    @Test void positiveShortfallUsesAllDistinctItemsCeilingAndActualDuration() {
        var active=f.service.read(Purpose.BASELINE,f.baseline.key(),0,20);
        var draft=f.service.create(Purpose.BASELINE,f.baseline.key(),new ScopedAssessmentPolicyService.Create(UUID.randomUUID(),active.activationRevision()));
        var config=new Policy(null,0,3,List.of(new GroupRule("S-A",KnowledgeLevel.FOUNDATION,10,7,false,false)),new BaselineTiming(17));
        var saved=f.service.save(Purpose.BASELINE,f.baseline.key(),new ScopedAssessmentPolicyService.Save(UUID.randomUUID(),draft.draft().id(),draft.draft().revision(),f.baseline.catalogHash(),config));
        f.publish(f.baseline,saved);
        var attempt=service.start(command,UUID.randomUUID());
        assertThat(attempt.questions()).hasSize(2);
        assertThat(attempt.questions().stream().map(RuleAssessmentAttemptService.Question::itemVersionId).distinct().count()).isEqualTo(2);
        assertThat(attempt.groups().getFirst().requiredCorrectCount()).isEqualTo(2);
        assertThat(java.time.Duration.between(attempt.startedAt(),attempt.deadlineAt()).getSeconds()).isEqualTo(34);
    }
    @Test void bankBecomingEmptyAfterActivationBlocksWithoutCreatingAPartialAttempt() {
        var sql=WF05PolicyPersistenceTest.sql;
        sql.update("INSERT INTO platform.question_bank_identity(question_id,question_bank_id,code,retired) SELECT i.item_id,i.question_bank_id,upper(i.item_id::text),true FROM platform.item_version i JOIN platform.question_bank_scope s ON s.question_bank_id=i.question_bank_id WHERE s.organization_id=?",f.org);
        var failure=org.junit.jupiter.api.Assertions.assertThrows(AssessmentPolicyService.Failure.class,()->service.start(command,UUID.randomUUID()));
        assertThat(failure.code).isEqualTo("REQUIRED_GROUP_BANK_EMPTY");assertThat(failure.details).hasSize(1);
        assertThat(sql.queryForObject("SELECT count(*) FROM platform.rule_assessment_attempt WHERE organization_id=?",Integer.class,f.org)).isZero();
    }
    @Test void oldRoleLevelPaperRemainsResumableWithOriginalPolicyDeadlineAndAnswers() throws Exception {
        var original=service.start(command,UUID.randomUUID());service.submit(original.attemptId(),original.revision(),UUID.randomUUID());
        var db=WF05PolicyPersistenceTest.db;var sql=WF05PolicyPersistenceTest.sql;
        var attempts=db.bean(RuleAssessmentAttemptJpaRepository.class);var policies=db.bean(AssessmentRulePolicyJpaRepository.class);var scopes=db.bean(ScopedAssessmentPolicyJpaRepository.class);
        String key=AssessmentPolicyScope.key(Purpose.BASELINE,"R1","L1"),body=f.json.writeValueAsString(new Policy(93,0,3,f.config(Purpose.BASELINE).groups()));
        String hash=RoleBaselineFlow.hash(com.adaptlearngraph.entities.AssessmentRulePolicyEntity.HASH_DOMAIN+"\nBASELINE\n"+body);
        UUID policy=UUID.randomUUID(),id=UUID.randomUUID();
        new TransactionTemplate(db.transactionManager()).executeWithoutResult(status->{
            var source=attempts.lock(f.org,f.actor,original.attemptId()).orElseThrow();
            var snapshot=f.json.valueToTree(readTree(source.getContextSnapshot()));
            ((com.fasterxml.jackson.databind.node.ObjectNode)snapshot.path("context")).put("policyScopeKey",key);
            var now=attempts.clock();
            policies.insert(new com.adaptlearngraph.entities.AssessmentRulePolicyEntity(policy,f.org,"BASELINE",1,body,hash,f.actor,now,key,f.baseline.catalogHash()));
            scopes.activate(f.org,"BASELINE",key,policy,f.actor);
            attempts.insert(new com.adaptlearngraph.entities.RuleAssessmentAttemptEntity(id,f.org,f.actor,"BASELINE",source.getContextKey(),selection.selectionId(),selection.revision(),policy,hash,snapshot.toString(),now,now.plusSeconds(93),null));
            UUID group=UUID.randomUUID();var frozen=attempts.paper(f.org,f.actor,original.attemptId());var first=frozen.getFirst();
            attempts.freezeGroup(id,group,f.org,f.actor,first.getSkillId(),first.getKnowledgeLevel(),first.getOutcomeCodes(),first.getRole(),first.getTotalCount(),first.getRequiredCorrectCount(),first.getMandatoryRequired(),first.getAllWrongVeto(),first.getMandatoryCount());
            for(var item:frozen)attempts.freezeItem(id,group,item.getPosition(),f.org,item.getItemVersionId(),item.getFrozenItem(),item.getMandatory());
        });
        sql.update("DELETE FROM platform.assessment_rule_scoped_activation WHERE organization_id=? AND purpose='BASELINE' AND scope_key=?",f.org,f.baseline.key());
        var resumed=service.resume(id);var question=resumed.questions().getFirst();
        var answered=service.answer(id,new RuleAssessmentAttemptService.Answer(resumed.revision(),question.position(),question.itemVersionId(),"A"),UUID.randomUUID());
        assertThat(service.resume(id).questions()).isEqualTo(answered.questions());assertThat(service.resume(id).deadlineAt()).isEqualTo(resumed.deadlineAt());assertThat(java.time.Duration.between(resumed.startedAt(),resumed.deadlineAt()).getSeconds()).isEqualTo(93);
        assertThat(service.start(command,UUID.randomUUID()).attemptId()).isEqualTo(id);
        assertThat(f.json.readTree(sql.queryForObject("SELECT configuration::text FROM platform.assessment_rule_policy_version WHERE id=?",String.class,policy))).isEqualTo(f.json.readTree(body));
        assertThat(sql.queryForObject("SELECT policy_hash FROM platform.rule_assessment_attempt WHERE id=?",String.class,id)).isEqualTo(hash);
        var finished=service.submit(id,answered.revision(),UUID.randomUUID());
        var next=new RuleAssessmentAttemptService.Start(Purpose.BASELINE,selection.selectionId(),selection.revision(),finished.attemptId(),null,null,null);
        assertThatThrownBy(()->service.start(next,UUID.randomUUID())).hasMessageContaining("ASSESSMENT_POLICY_REQUIRED");
        current=new RoleBaselineFlow.Actor(UUID.randomUUID(),f.actor);assertThatThrownBy(()->service.resume(id)).hasMessageContaining("FORBIDDEN");
    }
    private com.fasterxml.jackson.databind.JsonNode readTree(String value) {try{return f.json.readTree(value);}catch(Exception invalid){throw new IllegalStateException(invalid);}}
}
