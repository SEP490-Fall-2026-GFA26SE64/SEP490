package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import jakarta.persistence.EntityManager;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Outcome/recalculation integration with real bank, attempts, jobs, evidence and revisions.
 * Completed-learning records and catalog ports are explicit synthetic preconditions; this is not UI E01. */
class WF05SkillOutcomePersistenceTest {
    WF05PathwayPersistenceTest p;RuleAssessmentAttemptService assessments;RuleAssessmentOutcomeService outcomes;
    RequirementPathwayRecalculationService recalculation;RequirementPathwayPlanningService planning;
    RequirementPathway.Requirement b;String moduleA,moduleA2,moduleB;Map<String,ScopedAssessmentPolicyService.Workspace> policies=new HashMap<>();
    @BeforeAll static void start(){WF05PolicyPersistenceTest.start();}
    @AfterAll static void stop(){WF05PolicyPersistenceTest.stop();}
    @BeforeEach void setup() throws Exception {
        p=new WF05PathwayPersistenceTest();p.setup();var f=p.a.f;var db=WF05PolicyPersistenceTest.db;var sql=WF05PolicyPersistenceTest.sql;
        moduleA="WF05-A-"+f.org;moduleA2="WF05-A2-"+f.org;moduleB="WF05-B-"+f.org;
        var a1=new RequirementPathway.Option(moduleA,1,"content-v1","Module A",List.of("OUT-1"),"v1");
        var b1=new RequirementPathway.Option(moduleB,1,"content-v1","Module B",List.of(),"v1");
        b=new RequirementPathway.Requirement("B","Skill B",KnowledgeLevel.FOUNDATION,"v1",List.of(),RequirementPathway.Provision.MODULE_ONLY);
        var a2=new RequirementPathway.Option(moduleA2,1,"content-v1","Module A2",List.of("OUT-1"),"v1");
        p.snapshot=new RulePathwayCatalog.Snapshot("skills-v1",List.of(p.need,b),Map.of(p.need.key(),List.of(a1,a2),b.key(),List.of(b1)),Map.of());
        p.generated();p.expert();p.review.approve(p.request,UUID.randomUUID().toString(),p.expected());
        UUID bank=UUID.randomUUID();sql.update("INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,'WF05 B bank',?)",bank,f.actor);
        sql.update("INSERT INTO platform.question_bank_scope(organization_id,question_bank_id) VALUES (?,?)",f.org,bank);
        for(int i=0;i<2;i++){UUID id=UUID.randomUUID();
            sql.update("INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,protected_key,publication_state,content_hash,micro_skill_id,micro_skill_name_snapshot,difficulty) VALUES (?,?,1,?,'WF05 B','{\"options\":[{\"id\":\"A\",\"text\":\"Correct\"},{\"id\":\"B\",\"text\":\"Wrong\"}]}'::jsonb,'{\"correctOptionId\":\"A\"}'::jsonb,'PUBLISHED',?,'B','Skill B','EASY')",id,id,bank,"c".repeat(64));
            sql.update("INSERT INTO platform.assessment_item_knowledge_mapping(item_version_id,organization_id,question_bank_id,skill_id,knowledge_level,outcome_code,mandatory,mapping_version,mapping_hash) VALUES (?,?,?,'B','FOUNDATION','OUT-1',false,1,?)",id,f.org,bank,"d".repeat(64));
            sql.update("INSERT INTO platform.assessment_item_skill_scope(item_version_id,skill_version,source) VALUES (?,'v1','PUBLICATION')",id);}
        var scopes=new ArrayList<AssessmentPolicyScope.Scope>();
        for(String main:List.of("S-A","B")){
            var specs=new ArrayList<AssessmentPolicyScope.GroupSpec>();var rules=new ArrayList<GroupRule>();
            for(String id:main.equals("S-A")?List.of("S-A","B"):List.of("B")){
                specs.add(new AssessmentPolicyScope.GroupSpec(new AssessmentPolicyScope.ConfigurationRequirement(id,KnowledgeLevel.FOUNDATION,List.of()),"Skill "+id,"v1",SkillProvisionMode.MODULE_ONLY,List.of()));
                rules.add(new GroupRule(id,KnowledgeLevel.FOUNDATION,2,2,false,false,0));}
            var scope=new AssessmentPolicyScope.Scope(AssessmentPolicyScope.key(Purpose.SKILL_ASSESSMENT,main,"FOUNDATION"),Purpose.SKILL_ASSESSMENT,main,main,"FOUNDATION","Foundation","FOUNDATION",1,"a".repeat(64),specs,true,List.of());
            scopes.add(scope);when(f.catalog.discoverForEditor(eq(f.org),eq(Purpose.SKILL_ASSESSMENT),any())).thenReturn(new AssessmentPolicyScope.Discovery(List.copyOf(scopes),List.of()));
            f.current=f.as(f.actor,SubscriptionAccessPolicy.Role.DOMAIN_EXPERT);var draft=f.draft(scope);
            var saved=f.service.save(Purpose.SKILL_ASSESSMENT,scope.key(),new ScopedAssessmentPolicyService.Save(UUID.randomUUID(),draft.draft().id(),draft.draft().revision(),scope.catalogHash(),new Policy(120,0,5,rules)));
            policies.put(main,f.publish(scope,saved));}
        when(f.catalog.scopes(f.org,Purpose.SKILL_ASSESSMENT)).thenReturn(scopes);
        var tx=new TransactionTemplate(db.transactionManager());var clock=db.bean(RuleAssessmentAttemptJpaRepository.class);
        var contexts=new RuleAssessmentAttemptService.Contexts(){
            public RuleAssessmentAttemptService.Context resolve(RoleBaselineFlow.Actor actor,RuleAssessmentAttemptService.Start start){
                var row=p.row();var root=p.revisions.read(row).steps().stream().filter(s->s.id().equals(start.stepId())).findFirst().orElseThrow();
                var needs=new ArrayList<RuleAssessmentAttemptService.Need>();var definitions=new ArrayList<Map<String,Object>>();
                for(String id:root.requirement().skillId().equals("S-A")?List.of("S-A","B"):List.of("B")){
                    var requirement=new RuleAssessment.Requirement(id,KnowledgeLevel.FOUNDATION,List.of());var role=id.equals(root.requirement().skillId())?GroupRole.MAIN:GroupRole.PREREQUISITE;
                    needs.add(new RuleAssessmentAttemptService.Need(requirement,role));definitions.add(Map.of("requirement",requirement,"skillName","Skill "+id,"skillVersion","v1","mode","MODULE_ONLY"));}
                var data=new LinkedHashMap<String,Object>();data.put("roleId","R1");data.put("roleName","R1");data.put("levelId","L1");data.put("levelName","L1");data.put("jobPositionId","J1");data.put("jobPositionName","Job");
                data.put("selectionId",p.a.selection.selectionId());data.put("selectionRevision",p.a.selection.revision());data.put("requestId",p.request);data.put("pathwayRevision",row.getCurrentRevision());data.put("stepId",root.id());data.put("stepKind","REQUIRED");
                data.put("start",start);data.put("moduleId",start.moduleId());data.put("moduleRevision",1);data.put("contentVersion","content-v1");data.put("requirements",definitions);
                return new RuleAssessmentAttemptService.Context(p.a.selection.selectionId(),p.a.selection.revision(),"skill:"+p.request+":"+start.moduleId(),p.revisions.encode(data),needs);}
            public void assertCurrent(RoleBaselineFlow.Actor actor,RuleAssessmentAttemptService.Context context){}
        };
        assessments=new RuleAssessmentAttemptService(()->p.a.current,p.a.selections,contexts,clock,db.bean(AssessmentRulePolicyJpaRepository.class),db.bean(ScopedAssessmentPolicyJpaRepository.class),f.catalog,
            db.bean(AssessmentItemKnowledgeMappingJpaRepository.class),db.bean(OutboxEventJpaRepository.class),db.bean(ProcessingJobJpaRepository.class),new PostgresAdvisoryLocks(db.bean(EntityManager.class)),tx,f.json,1000,db.bean(AuditEventJpaRepository.class));
        planning=new RequirementPathwayPlanningService(p.catalog,p.rules,p.admission,p.revisions,f.json);
        recalculation=new RequirementPathwayRecalculationService(p.rules,p.revisions,planning,p.review,f.json);
        var effects=new RuleAssessmentOutcomeService.PathwayEffects(){
            public void apply(RuleAssessmentAttemptEntity attempt,UUID event,List<RuleAssessmentOutcomeJpaRepository.GroupRow> groups){recalculation.assessed(attempt,event,groups);}
            public Optional<RuleAssessmentOutcomeService.PathwayBefore> before(RuleAssessmentAttemptEntity a){return recalculation.before(a);}
            public void notify(RuleAssessmentAttemptEntity a,UUID event,Optional<RuleAssessmentOutcomeService.PathwayBefore> before){recalculation.notify(a,event,before);}
        };
        outcomes=new RuleAssessmentOutcomeService(db.bean(RuleAssessmentOutcomeJpaRepository.class),clock,p.a.selections,db.bean(OutboxEventJpaRepository.class),tx,f.json,effects,db.bean(AuditEventJpaRepository.class));
    }
    void completed(String module,String skill) throws Exception {var sql=WF05PolicyPersistenceTest.sql;var org=p.a.f.org.toString();var learner=p.a.f.actor.toString();
        // Explicit precondition record, never a claim that the UI completed its lessons.
        sql.update("INSERT INTO platform.module_authoring(organization_id,module_id,document) VALUES (?,?,'{}'::jsonb) ON CONFLICT DO NOTHING",org,module);
        sql.update("INSERT INTO platform.learning_module_completion(organization_id,learner_id,module_id,revision,skill_id,content_version,completed_at) VALUES (?,?,?,1,?,'content-v1',clock_timestamp())",org,learner,module,skill);
        sql.update("INSERT INTO platform.learning_completion_requirement(organization_id,learner_id,module_id,revision,knowledge_level,requirement_snapshot) VALUES (?,?,?,1,'FOUNDATION',CAST(? AS jsonb))",org,learner,module,p.revisions.encode(Map.of("skillVersion","v1")));}
    RuleAssessmentAttemptService.View assess(String skill,String module,UUID previous,boolean failB) {
        var root=p.revisions.read(p.row()).steps().stream().filter(s->s.requirement().skillId().equals(skill)).findFirst().orElseThrow();
        var command=new RuleAssessmentAttemptService.Start(Purpose.SKILL_ASSESSMENT,p.a.selection.selectionId(),p.a.selection.revision(),previous,root.id(),module,1);
        var attempt=assessments.start(command,UUID.randomUUID());boolean wrong=false;
        for(var q:attempt.questions()){var group=attempt.groups().stream().filter(g->g.id().equals(q.groupId())).findFirst().orElseThrow();
            boolean incorrect=failB&&group.role()==GroupRole.PREREQUISITE&&!wrong;if(incorrect)wrong=true;
            attempt=assessments.answer(attempt.attemptId(),new RuleAssessmentAttemptService.Answer(attempt.revision(),q.position(),q.itemVersionId(),incorrect?"B":"A"),UUID.randomUUID());}
        return assessments.submit(attempt.attemptId(),attempt.revision(),UUID.randomUUID());}
    @Test @DisplayName("TC-WF05-F11/F12/S05 persistence: actual shortage assigns B; passing B on A retake retains assigned learning")
    void supplementationSurvivesRetake() throws Exception {
        completed(moduleA,"S-A");var first=assess("S-A",moduleA,null,true);
        for(int i=0;i<30&&p.revisions.read(p.row()).steps().size()<2;i++)outcomes.runBatch();
        var plan=p.revisions.read(p.row());assertThat(plan.steps()).hasSize(2);assertThat(plan.dependencies()).hasSize(1);
        var supplement=plan.steps().stream().filter(s->s.requirement().skillId().equals("B")).findFirst().orElseThrow();assertThat(supplement.assessedSources()).hasSize(1);
        assertThat(supplement.assessedSources().getFirst().attemptId()).isEqualTo(first.attemptId());assertThat(plan.targetReleased()).isFalse();
        var retake=assess("S-A",moduleA,first.attemptId(),false);for(int i=0;i<5;i++)outcomes.runBatch();
        var after=p.revisions.read(p.row());assertThat(after.steps()).extracting(s->s.requirement().skillId()).contains("B");assertThat(after.dependencies()).hasSize(1);
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE organization_id=? AND learner_id=? AND skill_id='S-A'",Integer.class,p.a.f.org,p.a.f.actor)).isZero();
        assertThat(retake.results()).allMatch(GroupResult::passed);
        completed(moduleB,"B");var bAttempt=assess("B",moduleB,null,false);
        long end=System.nanoTime()+java.time.Duration.ofSeconds(40).toNanos();
        while(!p.revisions.read(p.row()).targetReleased()&&System.nanoTime()<end){outcomes.runBatch();Thread.sleep(200);}
        var resolved=p.revisions.read(p.row());assertThat(resolved.targetReleased()).isTrue();assertThat(resolved.steps()).hasSize(2);
        assertThat(resolved.steps()).allMatch(s->s.state()==RequirementPathway.State.FULFILLED);assertThat(resolved.dependencies()).hasSize(1);
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE organization_id=? AND learner_id=? AND skill_id='B' AND source_id=?",Integer.class,p.a.f.org,p.a.f.actor,bAttempt.attemptId())).isEqualTo(1);
        assertThat(p.a.selections.targetLocked(p.a.current)).isFalse();outcomes.runBatch();
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.rule_assessment_attempt WHERE organization_id=? AND learner_id=? AND purpose='SKILL_ASSESSMENT'",Integer.class,p.a.f.org,p.a.f.actor)).isEqualTo(3);
    }
    @Test @DisplayName("Shared skill scope: module A2 retains A1 history and cannot bypass its retry allowance")
    void sharedSkillRetryBudgetCannotBeBypassedThroughAnotherModule() throws Exception {
        var f=p.a.f;var workspace=policies.get("S-A");var scope=workspace.scope();
        var draft=f.service.create(Purpose.SKILL_ASSESSMENT,scope.key(),new ScopedAssessmentPolicyService.Create(UUID.randomUUID(),workspace.activationRevision()));
        var saved=f.service.save(Purpose.SKILL_ASSESSMENT,scope.key(),new ScopedAssessmentPolicyService.Save(UUID.randomUUID(),draft.draft().id(),draft.draft().revision(),scope.catalogHash(),
            new Policy(120,3600,1,workspace.active().configuration().groups())));f.publish(scope,saved);
        completed(moduleA,"S-A");completed(moduleA2,"S-A");var first=assess("S-A",moduleA,null,false);
        for(int i=0;i<30&&!p.revisions.read(p.row()).targetReleased();i++)outcomes.runBatch();
        assertThat(p.revisions.read(p.row()).targetReleased()).isTrue();
        assertThatThrownBy(()->assess("S-A",moduleA,first.attemptId(),false)).hasMessageContaining("RETAKE_LIMIT_REACHED");
        assertThatThrownBy(()->assess("S-A",moduleA2,null,false)).hasMessageContaining("RETAKE_CONTEXT_CHANGED");
        assertThatThrownBy(()->assess("S-A",moduleA2,first.attemptId(),false)).hasMessageContaining("RETAKE_LIMIT_REACHED");
        assertThat(assessments.skillHistory("S-A","FOUNDATION","v1",0,20).items()).extracting(RuleAssessmentAttemptService.AttemptSummary::attemptId).containsExactly(first.attemptId());
    }
    @Test @DisplayName("TC-WF05-S05 persistence: failed prior-official prerequisite opens NEED_REVIEW and preserves immutable evidence")
    void priorOfficialPrerequisiteNeedsReview() throws Exception {
        var sql=WF05PolicyPersistenceTest.sql;UUID oldEvidence=UUID.randomUUID(),source=UUID.randomUUID();
        // Explicit historical official-evidence precondition; no assertion that this test produced its original certificate.
        sql.update("INSERT INTO platform.skill_knowledge_evidence(id,organization_id,learner_id,skill_id,knowledge_level,requirement_snapshot,source_kind,source_id,source_version,achieved_at) VALUES (?,?,?,'B','FOUNDATION','{\"skillVersion\":\"v1\"}'::jsonb,'CERTIFICATE',?,1,clock_timestamp())",oldEvidence,p.a.f.org,p.a.f.actor,source);
        String before=sql.queryForObject("SELECT row_to_json(e)::text FROM platform.skill_knowledge_evidence e WHERE id=?",String.class,oldEvidence);
        completed(moduleA,"S-A");var attempt=assess("S-A",moduleA,null,true);
        for(int i=0;i<30&&sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_review WHERE attempt_id=?",Integer.class,attempt.attemptId())==0;i++)outcomes.runBatch();
        assertThat(sql.queryForObject("SELECT state FROM platform.skill_knowledge_review WHERE attempt_id=? AND skill_id='B'",String.class,attempt.attemptId())).isEqualTo("NEED_REVIEW");
        assertThat(sql.queryForObject("SELECT row_to_json(e)::text FROM platform.skill_knowledge_evidence e WHERE id=?",String.class,oldEvidence)).isEqualTo(before);
        // Existing compatible B proof still qualifies MAIN; NEED_REVIEW is not revocation or a new business blocker.
        assertThat(sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE source_id=? AND skill_id='S-A'",Integer.class,attempt.attemptId())).isEqualTo(1);
        assertThat(sql.queryForObject("SELECT count(*) FROM platform.outbox_event WHERE event_type='SKILL_KNOWLEDGE_NEED_REVIEW' AND payload->>'attemptId'=?",Integer.class,attempt.attemptId().toString())).isEqualTo(1);
    }
}
