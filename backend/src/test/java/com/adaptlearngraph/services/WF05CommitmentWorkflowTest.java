package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import org.junit.jupiter.api.*;
import org.neo4j.driver.Values;
import org.springframework.transaction.support.TransactionTemplate;

/** End-to-end backend workflow on disposable PostgreSQL, through real use cases/adapters/workers.
 * Published catalog, staff assignment and authenticated identity are controlled fixture ports.
 * Module packages are seeded prerequisites; lesson completion and official evidence are NOT seeded.
 * This is not a browser/UI or deployed-environment acceptance claim. */
class WF05CommitmentWorkflowTest {
    @BeforeAll static void start(){WF05PolicyPersistenceTest.start();}
    @AfterAll static void stop(){WF05PolicyPersistenceTest.stop();}

    @Test @Tag("bm04-wf05") @DisplayName("TC-WF05-E01 - Baseline to generated pathway, assigned approval, real lesson completion, Skill Assessment and official completion")
    void baselineToApprovedLearningAndOfficialCompletion() throws Exception {
        // setup executes Role selection, baseline policy activation, paper creation and submit through real services.
        var p=new WF05PathwayPersistenceTest();p.setup();var f=p.a.f;var db=WF05PolicyPersistenceTest.db;var sql=WF05PolicyPersistenceTest.sql;
        var tx=new TransactionTemplate(db.transactionManager());var locks=new PostgresAdvisoryLocks(db.bean(EntityManager.class));
        UUID baselineId=sql.queryForObject("SELECT id FROM platform.rule_assessment_attempt WHERE organization_id=? AND learner_id=? AND purpose='BASELINE'",UUID.class,f.org,f.actor);
        assertThat(p.a.service.resume(baselineId).state()).isEqualTo("FINALIZED");
        assertThat(sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE organization_id=? AND learner_id=?",Integer.class,f.org,f.actor)).isZero();

        when(f.catalog.scopes(f.org,Purpose.SKILL_ASSESSMENT)).thenReturn(List.of(f.skill));
        when(f.catalog.roleSkills(f.org,f.otherActor)).thenReturn(Map.of("R1",Set.of("S-A")));
        when(f.catalog.roleSkills(f.org,null)).thenReturn(Map.of("R1",Set.of("S-A")));
        f.current=f.as(f.otherActor,SubscriptionAccessPolicy.Role.DOMAIN_EXPERT);
        var shared=WF05RoleSkillPolicyPersistenceTest.shared(f,db.bean(AssessmentItemKnowledgeMappingJpaRepository.class));
        WF05RoleSkillPolicyPersistenceTest.activate(shared,WF05RoleSkillPolicyPersistenceTest.configuration("WF05 current Role",2));

        var moduleGraph=mock(Neo4jModuleCatalogGraph.class);
        var modules=new JpaModuleAuthoringAdapter(ModuleAuthoringRepositories.from(db::bean,locks),tx,f.json,moduleGraph,f.org.toString(),
            ()->new ModuleAuthoring.Actor(f.actor.toString(),f.org.toString(),Set.of("EMPLOYEE")));
        tx.executeWithoutResult(s->{modules.save(document(f,p.m1));modules.save(document(f,p.m2));});
        var evidence=db.bean(RuleAssessmentContextJpaRepository.class);
        var access=new RequirementPathwayAccess(()->p.actor,p.a.selections,p.rules,p.revisions,p.admission,p.assignments,p.data,p.catalog,modules,f.json).assessmentEvidence(evidence);
        var learning=new JpaLearningContentAdapter(LearningContentRepositories.from(db::bean),f.json,
            (org,learner,module,revision)->org.equals(f.org.toString())&&learner.equals(f.actor.toString())&&access.permits(module,revision),true);
        var lessons=new LearningContentService(modules,learning,new ModuleAuthoringService(modules,learning));
        p.generated();var root=p.revisions.read(p.row()).steps().getFirst();
        assertThat(p.row().getReviewStatus()).isEqualTo("AWAITING_EXPERT_REVIEW");
        assertThat(root.options()).containsExactly(p.m1,p.m2);
        assertThatThrownBy(()->lessons.view(p.m1.moduleId(),true)).hasMessageContaining("confirmed learning pathway");
        p.expert();p.review.approve(p.request,UUID.randomUUID().toString(),p.expected());
        p.actor=new Actor(f.org,f.actor,Role.EMPLOYEE);assertThat(p.row().getReviewStatus()).isEqualTo("APPROVED");

        var contexts=new CurrentRoleKnowledgeCatalog(p.a.selections,org->p.a.roles,graph(),evidence,f.json,1000,access::requireAssessment);
        var attempts=new RuleAssessmentAttemptService(()->p.a.current,p.a.selections,contexts,db.bean(RuleAssessmentAttemptJpaRepository.class),
            db.bean(AssessmentRulePolicyJpaRepository.class),db.bean(ScopedAssessmentPolicyJpaRepository.class),f.catalog,
            db.bean(AssessmentItemKnowledgeMappingJpaRepository.class),db.bean(OutboxEventJpaRepository.class),db.bean(ProcessingJobJpaRepository.class),
            locks,tx,f.json,1000,db.bean(AuditEventJpaRepository.class)).sharedSkills(shared);
        var command=new RuleAssessmentAttemptService.Start(Purpose.SKILL_ASSESSMENT,p.a.selection.selectionId(),p.a.selection.revision(),null,root.id(),p.m1.moduleId(),1);
        assertThatThrownBy(()->attempts.start(command,UUID.randomUUID())).hasMessageContaining("EXACT_LEARNING_COMPLETION_REQUIRED");
        var view=lessons.view(p.m1.moduleId(),true);var lesson=view.revision().payload().content().lessons().getFirst();
        assertThatThrownBy(()->lessons.progress(p.m1.moduleId(),lesson.id(),0,null,null,false,true,1)).hasMessageContaining("Meet the lesson requirements");
        assertThat(lessons.progress(p.m1.moduleId(),lesson.id(),0,null,null,true,true,1).completedAt()).isNotNull();
        assertThat(learning.completions(f.org.toString(),f.actor.toString(),"S-A")).hasSize(1);
        assertThat(learning.completions(f.org.toString(),f.actor.toString(),"S-A").getFirst().moduleId()).isEqualTo(p.m1.moduleId());
        assertThat(sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE organization_id=? AND learner_id=?",Integer.class,f.org,f.actor)).isZero();
        assertThat(p.a.selections.targetLocked(p.a.current)).isTrue();

        var attempt=attempts.start(command,UUID.randomUUID());assertThat(attempt.questions()).hasSize(2);
        for(var question:attempt.questions())attempt=attempts.answer(attempt.attemptId(),new RuleAssessmentAttemptService.Answer(attempt.revision(),question.position(),question.itemVersionId(),"A"),UUID.randomUUID());
        var submitted=attempts.submit(attempt.attemptId(),attempt.revision(),UUID.randomUUID());assertThat(submitted.results()).allMatch(GroupResult::passed);
        var planning=new RequirementPathwayPlanningService(p.catalog,p.rules,p.admission,p.revisions,f.json).history(db.bean(RuleAssessmentContextJpaRepository.class));
        var recalculation=new RequirementPathwayRecalculationService(p.rules,p.revisions,planning,p.review,f.json);
        var effects=new RuleAssessmentOutcomeService.PathwayEffects(){
            public void apply(RuleAssessmentAttemptEntity a,UUID event,List<RuleAssessmentOutcomeJpaRepository.GroupRow> groups){recalculation.assessed(a,event,groups);}
            public Optional<RuleAssessmentOutcomeService.PathwayBefore> before(RuleAssessmentAttemptEntity a){return recalculation.before(a);}
            public void notify(RuleAssessmentAttemptEntity a,UUID event,Optional<RuleAssessmentOutcomeService.PathwayBefore> before){recalculation.notify(a,event,before);}
        };
        var worker=new RuleAssessmentOutcomeService(db.bean(RuleAssessmentOutcomeJpaRepository.class),db.bean(RuleAssessmentAttemptJpaRepository.class),p.a.selections,
            db.bean(OutboxEventJpaRepository.class),tx,f.json,effects,db.bean(AuditEventJpaRepository.class));
        for(int i=0;i<30&&!p.revisions.read(p.row()).targetReleased();i++)worker.runBatch();
        assertThat(p.revisions.read(p.row()).targetReleased()).isTrue();
        assertThat(p.revisions.read(p.row()).steps()).allMatch(step->step.state()==RequirementPathway.State.FULFILLED);
        assertThat(p.a.selections.targetLocked(p.a.current)).isFalse();
        worker.runBatch();worker.runBatch();
        assertThat(sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE organization_id=? AND learner_id=? AND source_id=?",Integer.class,f.org,f.actor,submitted.attemptId())).isEqualTo(1);
        assertThat(p.a.service.resume(baselineId).results()).isNotEmpty();
        assertThat(attempts.skillHistory("S-A","FOUNDATION","v1",0,20).items()).extracting(RuleAssessmentAttemptService.AttemptSummary::attemptId).containsExactly(submitted.attemptId());
        assertThat(learning.progress(f.org.toString(),f.actor.toString(),p.m2.moduleId(),1)).isEmpty();
    }

    private static ModuleAuthoring.Document document(WF05PolicyPersistenceTest f,RequirementPathway.Option option){
        String now=Instant.parse("2026-11-23T00:00:00Z").toString();
        var metadata=new ModuleAuthoring.Metadata(option.moduleId(),"0.12.0","ACTIVE","APPROVED",f.otherActor.toString(),now);
        var content=new ModuleAuthoring.Content(option.moduleId()+"-content",option.title(),"Complete this required lesson.","text/markdown",option.contentVersion(),List.of(),f.otherActor.toString(),now);
        var payload=new ModuleAuthoring.Package(metadata,option.title(),"LESSON_AND_PRACTICE","content/"+option.moduleId(),"text/markdown",option.contentVersion(),60,
            List.of(new ModuleAuthoring.Teaching(metadata,"S-A","Skill A")),content,KnowledgeLevel.FOUNDATION,List.of("OUT-1"),"v1");
        var revision=new ModuleAuthoring.Revision(1,"RELEASED",payload,f.otherActor.toString(),now,f.otherActor.toString(),now,null);
        return new ModuleAuthoring.Document(option.moduleId(),f.org.toString(),List.of(),f.otherActor.toString(),now,1,true,false,1,List.of(revision),List.of());
    }

    @SuppressWarnings("unchecked") private static Neo4jCypher graph(){
        var graph=mock(Neo4jCypher.class);var statements=mock(Neo4jCypher.Statements.class);
        when(graph.read(any())).thenAnswer(i->((Function<Neo4jCypher.Statements,Object>)i.getArgument(0)).apply(statements));
        when(statements.list(anyString(),anyMap())).thenAnswer(i->{
            String query=i.getArgument(0);if(query.contains("HAS_SKILL_PREREQUISITE"))return List.of();
            var record=mock(org.neo4j.driver.Record.class);
            when(record.get("skill")).thenReturn(Values.value(Map.of("name","Skill A","version","v1","moduleOnlyKnowledgeLevels",List.of("FOUNDATION"))));
            return List.of(record);
        });return graph;
    }
}
