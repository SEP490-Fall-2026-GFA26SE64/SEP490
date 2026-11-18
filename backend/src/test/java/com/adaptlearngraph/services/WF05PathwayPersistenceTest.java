package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import java.time.Duration;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.transaction.support.TransactionTemplate;

/** PG queue/revisions/projections/approval integration; graph discovery and staff assignments are fixture ports. */
class WF05PathwayPersistenceTest {
    WF05AttemptPersistenceTest a; RequirementPathwayJpaRepository rules; RequirementPathwayRevisions revisions;
    RequirementPathwayAdmissionService admission;RequirementPathwayGenerationService generation;RequirementPathwayReviewService review;
    Actor actor;ReviewAssignments assignments;RulePathwayCatalog catalog;RulePathwayCatalog.Snapshot snapshot;UUID request;
    Requirement need;Option m1,m2;InitialPathwayRepositories data;
    @BeforeAll static void start(){WF05PolicyPersistenceTest.start();}
    @AfterAll static void stop(){WF05PolicyPersistenceTest.stop();}
    @BeforeEach void setup() throws Exception {
        a=new WF05AttemptPersistenceTest();a.setup();var f=a.f;var db=WF05PolicyPersistenceTest.db;
        var attempt=a.service.start(a.command,UUID.randomUUID());a.service.submit(attempt.attemptId(),attempt.revision(),UUID.randomUUID());
        actor=new Actor(f.org,f.actor,Role.EMPLOYEE);data=InitialPathwayRepositories.from(db::bean);rules=db.bean(RequirementPathwayJpaRepository.class);
        var clock=db.bean(RuleAssessmentAttemptJpaRepository.class);var tx=new TransactionTemplate(db.transactionManager());
        revisions=new RequirementPathwayRevisions(data,rules,clock,f.json,mock(PathwayNotifications.class));
        catalog=mock(RulePathwayCatalog.class);need=new Requirement("S-A","Skill A",KnowledgeLevel.FOUNDATION,"v1",List.of("OUT-1"),Provision.MODULE_ONLY);
        m1=new Option("A1-"+f.org,1,"content-v1","Module A1",List.of("OUT-1"),"v1");m2=new Option("A2-"+f.org,1,"content-v1","Module A2",List.of("OUT-1"),"v1");
        snapshot=new RulePathwayCatalog.Snapshot("catalog-v1",List.of(need),Map.of(need.key(),List.of(m1,m2)),Map.of());
        when(catalog.resolve(any(),any(),anyString(),anyList())).thenAnswer(i->snapshot);
        when(catalog.providers(any(),any(),anyString(),anyList(),anySet())).thenAnswer(i->snapshot);
        var receipts=new JpaInitialReceipts(db.bean(InitialPathwayReceiptJpaRepository.class));
        admission=new RequirementPathwayAdmissionService(()->actor,org->a.roles,a.selections,catalog,rules,data,db.bean(PathwayRequirementSnapshotJpaRepository.class),clock,
            db.bean(RuleAssessmentOutcomeJpaRepository.class),receipts,revisions,f.json);
        generation=new RequirementPathwayGenerationService(data,rules,admission,revisions,a.selections,clock,tx,
            new RequirementPathwayGenerationService.Settings(Duration.ofSeconds(10),3,Duration.ofMillis(100)));
        assignments=mock(ReviewAssignments.class);when(assignments.require(any(),any())).thenAnswer(i->{if(!((Actor)i.getArgument(0)).accountId().equals(f.otherActor))throw new Failure(403,"FORBIDDEN");return new Assignment("ROLE-X1","v1",f.otherActor);});
        var validation=new RequirementPathwayValidationService(admission,revisions,rules,catalog);
        var planning=new RequirementPathwayPlanningService(catalog,rules,admission,revisions,f.json);
        review=new RequirementPathwayReviewService(()->actor,assignments,a.selections,rules,data,admission,revisions,validation,catalog,receipts,clock,planning);
    }
    void confirm() throws Exception {actor=new Actor(a.f.org,a.f.actor,Role.EMPLOYEE);var p=admission.preview("R1","L1");assertThat(p.baselineRequired()).isFalse();
        String key=UUID.randomUUID().toString();var command=new RequirementPathwayAdmissionService.Confirm("R1","L1",p.selectionId(),p.selectionRevision(),p.inputHash());
        var receipt=admission.confirm(key,command);request=a.f.json.readValue(receipt.responseJson(),RequirementPathwayAdmissionService.Accepted.class).requestId();
        var replay=admission.confirm(key,command);assertThat(replay.status()).isEqualTo(receipt.status());assertThat(replay.bodyHash()).isEqualTo(receipt.bodyHash());
        assertThat(a.f.json.readTree(replay.responseJson())).isEqualTo(a.f.json.readTree(receipt.responseJson()));}
    RequirementPathwayJpaRepository.Row row(){return rules.own(a.f.org,a.f.actor,request).orElseThrow();}
    void generated() throws Exception {confirm();
        // The retained test DB also holds earlier failure evidence. Drain the real queue without deleting it.
        for(int i=0;i<100 && row().getCurrentRevision()==null;i++)generation.runOne();
        assertThat(row().getGenerationStatus()).isEqualTo("SUCCEEDED");}
    void expert(){actor=new Actor(a.f.org,a.f.otherActor,Role.DOMAIN_EXPERT);}
    RequirementPathwayReviewService.Expected expected(){var r=row();return new RequirementPathwayReviewService.Expected(r.getCurrentRevision(),r.getContentHash());}
    @Test @DisplayName("TC-WF05-F07 persistence: confirm is frozen/idempotent, queue generates all alternatives without initial prerequisites")
    void generate() throws Exception {generated();var r=row();var plan=revisions.read(r);assertThat(r.getReviewStatus()).isEqualTo("AWAITING_EXPERT_REVIEW");
        assertThat(plan.steps()).hasSize(1);assertThat(plan.dependencies()).isEmpty();assertThat(plan.steps().getFirst().options()).containsExactly(m1,m2);
        assertThat(admission.decode(r).input().required()).containsExactly(need);assertThat(a.selections.targetLocked(a.current)).isTrue();}
    @Test @DisplayName("TC-WF05-F05/S03 persistence: pending generation binds target; same-target selection remains a no-op")
    void pendingLocksTarget() throws Exception {confirm();assertThatThrownBy(()->a.flow.choose("R2","L2",a.selection.selectionId(),UUID.randomUUID().toString())).hasMessageContaining("TARGET_ROLE_LEVEL_LOCKED");
        assertThatThrownBy(()->a.flow.choose("R1","L1-other",a.selection.selectionId(),UUID.randomUUID().toString())).hasMessageContaining("TARGET_ROLE_LEVEL_LOCKED");
        assertThat(a.flow.choose("R1","L1",a.selection.selectionId(),UUID.randomUUID().toString()).selectionId()).isEqualTo(a.selection.selectionId());
        assertThat(row().getCurrentRevision()).isNull();}
    @Test @DisplayName("TC-WF05-F08 persistence: assigned reduction records revision; empty alternatives keep root and block approval")
    void alternativeReduction() throws Exception {generated();expert();var root=revisions.read(row()).steps().getFirst();
        var command=new RequirementPathwayReviewService.Selection(expected(),List.of(new RequirementPathwayReviewService.StepSelection(root.id(),List.of(new RequirementPathwayReviewService.ModuleKey(m1.moduleId(),m1.moduleRevision(),m1.contentVersion())))),null);
        review.saveSelection(request,UUID.randomUUID().toString(),command);assertThat(revisions.read(row()).steps().getFirst().options()).containsExactly(m1);
        var empty=new RequirementPathwayReviewService.Selection(expected(),List.of(new RequirementPathwayReviewService.StepSelection(root.id(),List.of())),null);
        review.saveSelection(request,UUID.randomUUID().toString(),empty);var plan=revisions.read(row());assertThat(plan.steps()).hasSize(1);assertThat(plan.steps().getFirst().state()).isEqualTo(State.NEEDS_EXPERT_ACTION);
        assertThatThrownBy(()->review.approve(request,UUID.randomUUID().toString(),expected())).hasMessageContaining("PATHWAY_VALIDATION_REQUIRED");
        actor=new Actor(a.f.org,a.f.actor,Role.DOMAIN_EXPERT);assertThatThrownBy(()->review.saveSelection(request,UUID.randomUUID().toString(),empty)).hasMessageContaining("FORBIDDEN");}
    @Test @DisplayName("TC-WF05-F09 persistence: current approval only, bypass denies available provision")
    void currentApproval() throws Exception {generated();expert();var root=revisions.read(row()).steps().getFirst();
        assertThatThrownBy(()->review.bypass(request,UUID.randomUUID().toString(),new RequirementPathwayReviewService.Bypass(expected(),root.id(),"Not actually missing"))).hasMessageContaining("REQUIREMENT_BYPASS_NOT_ALLOWED");
        assertThatThrownBy(()->review.approve(request,UUID.randomUUID().toString(),new RequirementPathwayReviewService.Expected(99,"0".repeat(64)))).hasMessageContaining("STALE_PATHWAY_REVISION");
        review.approve(request,UUID.randomUUID().toString(),expected());assertThat(row().getReviewStatus()).isEqualTo("APPROVED");
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.initial_pathway_approval WHERE request_id=?",Integer.class,request)).isEqualTo(1);}
    @Test @DisplayName("TC-WF05-F09/S04 persistence: genuinely missing provision permits reasoned bypass without achievement")
    void missingProvisionBypass() throws Exception {
        snapshot=new RulePathwayCatalog.Snapshot("missing-v1",List.of(need),Map.of(),Map.of());generated();expert();var root=revisions.read(row()).steps().getFirst();
        assertThat(root.state()).isEqualTo(State.NEEDS_EXPERT_ACTION);
        assertThatThrownBy(()->review.bypass(request,UUID.randomUUID().toString(),new RequirementPathwayReviewService.Bypass(expected(),root.id(),""))).hasMessageContaining("BYPASS_REASON_REQUIRED");
        review.bypass(request,UUID.randomUUID().toString(),new RequirementPathwayReviewService.Bypass(expected(),root.id(),"No suitable provision"));
        assertThat(revisions.read(row()).steps().getFirst().state()).isEqualTo(State.BYPASSED);
        assertThat(revisions.read(row()).steps().getFirst().fulfilledEvidenceId()).isNull();
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE organization_id=? AND learner_id=?",Integer.class,a.f.org,a.f.actor)).isZero();
        review.approve(request,UUID.randomUUID().toString(),expected());
        assertThat(a.flow.choose("R2","L2",a.selection.selectionId(),UUID.randomUUID().toString()).levelId()).isEqualTo("L2");
        assertThat(rules.own(a.f.org,a.f.actor,request).orElseThrow().getArchivedAt()).isNotNull();
    }
    @Test @DisplayName("TC-WF05-S04 persistence: failed generation rolls back projection and authorized retry preserves input/run history")
    void failedGenerationRetry() throws Exception {
        confirm();String frozen=row().getFrozenInput();var failing=spy(revisions);var db=WF05PolicyPersistenceTest.db;
        doAnswer(i->{RequirementPathwayJpaRepository.Row r=i.getArgument(0);if(r.getRequestId().equals(request))throw new IllegalStateException("WF05 injected commit failure");return i.callRealMethod();})
            .when(failing).publish(any(),any(),any(),eq("INITIAL"),isNull(),isNull(),anyString(),isNull());
        var worker=new RequirementPathwayGenerationService(data,rules,admission,failing,a.selections,db.bean(RuleAssessmentAttemptJpaRepository.class),
            new TransactionTemplate(db.transactionManager()),new RequirementPathwayGenerationService.Settings(Duration.ofSeconds(10),3,Duration.ofMillis(100)));
        for(int i=0;i<100&&!row().getGenerationStatus().equals("FAILED_RETRYABLE");i++){
            try{worker.runOne();}catch(IllegalStateException injected){assertThat(injected).hasMessage("WF05 injected commit failure");}}
        assertThat(row().getGenerationStatus()).isEqualTo("FAILED_RETRYABLE");assertThat(row().getCurrentRevision()).isNull();
        admission.retry(request,UUID.randomUUID().toString());
        for(int i=0;i<100&&row().getCurrentRevision()==null;i++)generation.runOne();
        assertThat(row().getGenerationStatus()).isEqualTo("SUCCEEDED");assertThat(row().getFrozenInput()).isEqualTo(frozen);
        assertThat(WF05PolicyPersistenceTest.sql.queryForList("SELECT generation_status FROM platform.initial_pathway_run WHERE request_id=? ORDER BY finished_at",String.class,request)).containsExactly("FAILED_RETRYABLE","SUCCEEDED");
    }
    @Test @DisplayName("TC-WF05-F08 persistence: a started option cannot be excluded and accepted revision remains unchanged")
    void startedOptionProtected() throws Exception {
        generated();var root=revisions.read(row()).steps().getFirst();var sql=WF05PolicyPersistenceTest.sql;
        sql.update("INSERT INTO platform.module_authoring(organization_id,module_id,document) VALUES (?,?,'{}'::jsonb)",a.f.org.toString(),m1.moduleId());
        sql.update("INSERT INTO platform.module_learning_pin(organization_id,learner_id,module_id,revision) VALUES (?,?,?,1)",a.f.org.toString(),a.f.actor.toString(),m1.moduleId());
        expert();var before=expected();var removeStarted=new RequirementPathwayReviewService.Selection(before,List.of(new RequirementPathwayReviewService.StepSelection(root.id(),List.of(new RequirementPathwayReviewService.ModuleKey(m2.moduleId(),1,m2.contentVersion())))),null);
        assertThatThrownBy(()->review.saveSelection(request,UUID.randomUUID().toString(),removeStarted)).hasMessageContaining("STARTED_MODULE_CANNOT_BE_EXCLUDED");
        assertThat(expected()).isEqualTo(before);assertThat(revisions.read(row()).steps().getFirst().options()).containsExactly(m1,m2);
    }
}
