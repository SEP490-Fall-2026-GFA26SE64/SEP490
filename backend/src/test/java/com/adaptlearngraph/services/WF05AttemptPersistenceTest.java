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
    @Test @DisplayName("TC-WF05-F04 persistence: exact member Level selected and unrelated Level denied")
    void exactLevel(){assertThat(selections.current(current).orElseThrow().levelId()).isEqualTo("L1");
        assertThatThrownBy(()->flow.choose("R1","L2",selection.selectionId(),UUID.randomUUID().toString())).hasMessageContaining("LEVEL_NOT_AVAILABLE");
        assertThat(selections.current(current).orElseThrow().selectionId()).isEqualTo(selection.selectionId());}
    @Test @DisplayName("TC-WF05-F02 persistence: resume frozen paper/answers after new policy publication, deny other learner")
    void frozenResume(){var a=service.start(command,UUID.randomUUID());var q=a.questions().getFirst();
        var answered=service.answer(a.attemptId(),new RuleAssessmentAttemptService.Answer(a.revision(),q.position(),q.itemVersionId(),"A"),UUID.randomUUID());
        var active=f.service.read(Purpose.BASELINE,f.baseline.key(),0,20);
        var draft=f.service.create(Purpose.BASELINE,f.baseline.key(),new ScopedAssessmentPolicyService.Create(UUID.randomUUID(),active.activationRevision()));
        f.publish(f.baseline,f.save(f.baseline,draft));var resumed=service.resume(a.attemptId());
        assertThat(resumed.questions()).isEqualTo(answered.questions());assertThat(resumed.deadlineAt()).isEqualTo(a.deadlineAt());
        assertThat(service.start(command,UUID.randomUUID()).attemptId()).isEqualTo(a.attemptId());
        current=new RoleBaselineFlow.Actor(f.org,f.otherActor);assertThatThrownBy(()->service.resume(a.attemptId())).hasMessageContaining("NOT_FOUND");}
    @Test @DisplayName("TC-WF05-S02 persistence: stale answer denied, submit replay keeps one result and one processing job")
    void finalizesOnce(){var a=service.start(command,UUID.randomUUID());var q=a.questions().getFirst();
        var b=service.answer(a.attemptId(),new RuleAssessmentAttemptService.Answer(a.revision(),q.position(),q.itemVersionId(),"A"),UUID.randomUUID());
        assertThatThrownBy(()->service.answer(a.attemptId(),new RuleAssessmentAttemptService.Answer(a.revision(),q.position(),q.itemVersionId(),"B"),UUID.randomUUID())).hasMessageContaining("STALE_ATTEMPT_REVISION");
        UUID key=UUID.randomUUID();var done=service.submit(a.attemptId(),b.revision(),key);var replay=service.submit(a.attemptId(),b.revision(),key);
        assertThat(replay).isEqualTo(done);assertThat(done.finishReason()).isEqualTo("SUBMITTED");assertThat(done.results().getFirst().correctCount()).isEqualTo(1);
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.rule_assessment_group_result WHERE attempt_id=?",Integer.class,a.attemptId())).isEqualTo(1);
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.outbox_event WHERE event_type='RULE_ASSESSMENT_FINALIZED' AND aggregate_id=?",Integer.class,a.attemptId())).isEqualTo(1);}
    @Test @DisplayName("TC-WF05-F05 persistence: active assessment blocks changed target before selection/archive writes")
    void activeLock(){service.start(command,UUID.randomUUID());
        assertThatThrownBy(()->flow.choose("R2","L2",selection.selectionId(),UUID.randomUUID().toString())).hasMessageContaining("ASSESSMENT_IN_PROGRESS");
        assertThatThrownBy(()->flow.choose("R1","L1-other",selection.selectionId(),UUID.randomUUID().toString())).hasMessageContaining("ASSESSMENT_IN_PROGRESS");
        assertThat(selections.current(current).orElseThrow().selectionId()).isEqualTo(selection.selectionId());
        assertThat(flow.choose("R1","L1",selection.selectionId(),UUID.randomUUID().toString()).selectionId()).isEqualTo(selection.selectionId());}
    @Test @DisplayName("TC-WF05-F03/S02 persistence: real server deadline finalizes unanswered items once and ignores late answer")
    void serverExpiry() throws InterruptedException {
        var active=f.service.read(Purpose.BASELINE,f.baseline.key(),0,20);
        var draft=f.service.create(Purpose.BASELINE,f.baseline.key(),new ScopedAssessmentPolicyService.Create(UUID.randomUUID(),active.activationRevision()));
        var saved=f.service.save(Purpose.BASELINE,f.baseline.key(),new ScopedAssessmentPolicyService.Save(UUID.randomUUID(),draft.draft().id(),draft.draft().revision(),f.baseline.catalogHash(),
            new Policy(1,0,3,f.config(Purpose.BASELINE).groups())));f.publish(f.baseline,saved);
        var a=service.start(command,UUID.randomUUID());var q=a.questions().getFirst();
        Thread.sleep(1200);service.expireDue();var done=service.resume(a.attemptId());
        assertThat(done.state()).isEqualTo("FINALIZED");assertThat(done.finishReason()).isEqualTo("DEADLINE");assertThat(done.results().getFirst().correctCount()).isZero();
        var late=service.answer(a.attemptId(),new RuleAssessmentAttemptService.Answer(a.revision(),q.position(),q.itemVersionId(),"A"),UUID.randomUUID());
        assertThat(late.results()).isEqualTo(done.results());assertThat(late.deadlineAt()).isEqualTo(a.deadlineAt());service.expireDue();
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.rule_assessment_group_result WHERE attempt_id=?",Integer.class,a.attemptId())).isEqualTo(1);
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE organization_id=? AND learner_id=?",Integer.class,f.org,f.actor)).isZero();
    }
}
