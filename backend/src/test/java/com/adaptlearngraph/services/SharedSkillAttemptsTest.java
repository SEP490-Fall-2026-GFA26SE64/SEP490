package com.adaptlearngraph.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.adaptlearngraph.entities.*;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.entities.domain.AssessmentPolicyScope.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.services.RuleAssessmentAttemptService.*;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionTemplate;

class SharedSkillAttemptsTest {
    final ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    final UUID org=UUID.randomUUID(),learner=UUID.randomUUID(),item=UUID.randomUUID();
    final RoleBaselineFlow.Actor actor=new RoleBaselineFlow.Actor(org,learner);
    final Instant now=Instant.parse("2026-11-17T00:10:00Z");
    final SkillAssessmentScope scope=new SkillAssessmentScope("skill",KnowledgeLevel.FOUNDATION,"v1");
    final RuleAssessmentAttemptJpaRepository rows=mock(RuleAssessmentAttemptJpaRepository.class);
    final CurrentRoleSelectionStore selections=mock(CurrentRoleSelectionStore.class);
    final Contexts contexts=mock(Contexts.class);
    final AssessmentRulePolicyJpaRepository receipts=mock(AssessmentRulePolicyJpaRepository.class);
    final ScopedAssessmentPolicyJpaRepository policies=mock(ScopedAssessmentPolicyJpaRepository.class);
    final AssessmentPolicyCatalog catalog=mock(AssessmentPolicyCatalog.class);
    final AssessmentItemKnowledgeMappingJpaRepository bank=mock(AssessmentItemKnowledgeMappingJpaRepository.class);
    final OutboxEventJpaRepository outbox=mock(OutboxEventJpaRepository.class);
    final ProcessingJobJpaRepository jobs=mock(ProcessingJobJpaRepository.class);
    final Map<UUID,RuleAssessmentAttemptEntity> stored=new HashMap<>();
    final AtomicReference<UUID> group=new AtomicReference<>();
    final AtomicReference<String> frozen=new AtomicReference<>();
    RuleAssessmentAttemptService service;Scope policyScope;
    String write(Object o){try{return json.writeValueAsString(o);}catch(Exception e){throw new AssertionError(e);}}
    Start command(String module,UUID previous){return new Start(Purpose.SKILL_ASSESSMENT,null,0,previous,null,module,1);}
    Map<String,Object> definition(){return Map.of("requirement",new Requirement("skill",KnowledgeLevel.FOUNDATION,List.of()),"skillVersion","v1","skillName","Skill","mode","MODULE_ONLY");}
    String context(Start start){return write(Map.of("start",start,"learningContext","INDEPENDENT_SKILL","requirements",List.of(definition()),"moduleId",start.moduleId(),"moduleRevision",1));}
    @BeforeEach void setup() {
        var identity=mock(RoleBaselineFlow.Identity.class);when(identity.requireEmployee()).thenReturn(actor);
        when(selections.transaction(eq(actor),any())).thenAnswer(c->c.<Supplier<?>>getArgument(1).get());
        when(contexts.resolve(eq(actor),any())).thenAnswer(c->{Start start=c.getArgument(1);return new Context(null,0,"legacy-module:"+start.moduleId(),context(start),List.of(new Need(new Requirement("skill",KnowledgeLevel.FOUNDATION,List.of()),GroupRole.MAIN)));});
        when(rows.clock()).thenReturn(now);
        when(rows.lock(eq(org),eq(learner),any())).thenAnswer(c->Optional.ofNullable(stored.get(c.getArgument(2))));
        when(rows.insert(any())).thenAnswer(c->{RuleAssessmentAttemptEntity r=c.getArgument(0);stored.put(r.getId(),r);return r;});
        when(rows.freezeGroup(any(),any(),any(),any(),anyString(),anyString(),anyString(),anyString(),anyInt(),anyInt(),anyBoolean(),anyBoolean(),any())).thenAnswer(c->{group.set(c.getArgument(1));return 1;});
        when(rows.freezeItem(any(),any(),anyInt(),any(),any(),anyString(),anyBoolean())).thenAnswer(c->{frozen.set(c.getArgument(5));return 1;});
        var p=mock(RuleAssessmentAttemptJpaRepository.PaperRow.class);
        when(p.getGroupId()).thenAnswer(c->group.get());when(p.getSkillId()).thenReturn("skill");when(p.getKnowledgeLevel()).thenReturn("FOUNDATION");when(p.getRole()).thenReturn("MAIN");when(p.getOutcomeCodes()).thenReturn("[]");
        when(p.getTotalCount()).thenReturn(1);when(p.getRequiredCorrectCount()).thenReturn(1);when(p.getPosition()).thenReturn(1);when(p.getItemVersionId()).thenReturn(item);
        when(p.getFrozenItem()).thenAnswer(c->frozen.get());when(p.getPrompt()).thenReturn("Question");when(p.getResponseSchema()).thenReturn("{\"options\":[{\"id\":\"a\",\"text\":\"A\"},{\"id\":\"b\",\"text\":\"B\"}]}");
        when(p.getProtectedKey()).thenReturn("{\"correctOptionId\":\"a\"}");when(p.getContentHash()).thenReturn("content");when(p.getMappingHash()).thenReturn("mapping");
        when(rows.paper(eq(org),eq(learner),any())).thenReturn(List.of(p));
        var candidate=mock(AssessmentItemKnowledgeMappingJpaRepository.Candidate.class);
        when(candidate.getItemVersionId()).thenReturn(item);when(candidate.getPrompt()).thenReturn("Question");when(candidate.getResponseSchema()).thenReturn("{\"options\":[{\"id\":\"a\",\"text\":\"A\"},{\"id\":\"b\",\"text\":\"B\"}]}");when(candidate.getProtectedKey()).thenReturn("{\"correctOptionId\":\"a\"}");when(candidate.getContentHash()).thenReturn("content");when(candidate.getMappingHash()).thenReturn("mapping");
        when(bank.eligible(eq(org),eq("skill"),eq("FOUNDATION"),eq("v1"),anyInt())).thenReturn(List.of(candidate));
        policyScope=new Scope("scope",Purpose.SKILL_ASSESSMENT,"skill","Skill","FOUNDATION","Foundation","FOUNDATION",0,"catalog",List.of(new GroupSpec(new ConfigurationRequirement("skill",KnowledgeLevel.FOUNDATION,List.of()),"Skill","v1",SkillProvisionMode.MODULE_ONLY,List.of())),true,List.of());
        when(catalog.scopes(org,Purpose.SKILL_ASSESSMENT)).thenReturn(List.of(policyScope));
        configure(3,30);
        service=new RuleAssessmentAttemptService(identity,selections,contexts,rows,receipts,policies,catalog,bank,outbox,jobs,mock(PostgresAdvisoryLocks.class),mock(TransactionTemplate.class),json,100,mock(AuditEventJpaRepository.class));
    }
    void configure(int max,int wait) {
        var config=new Policy(600,wait,max,List.of(new GroupRule("skill",KnowledgeLevel.FOUNDATION,1,1,false,false)));
        var entity=new AssessmentRulePolicyEntity(UUID.randomUUID(),org,"SKILL_ASSESSMENT",1,write(config),RoleBaselineFlow.hash(AssessmentRulePolicyEntity.HASH_DOMAIN+"\nSKILL_ASSESSMENT\n"+write(config)),learner,now,"scope","catalog");
        when(policies.active(org,"SKILL_ASSESSMENT","scope")).thenReturn(Optional.of(entity));
    }
    RuleAssessmentAttemptEntity old(String module,String state,Instant finished) {
        var row=mock(RuleAssessmentAttemptEntity.class);UUID id=UUID.randomUUID();when(row.getId()).thenReturn(id);when(row.getPurpose()).thenReturn("SKILL_ASSESSMENT");when(row.getState()).thenReturn(state);when(row.getRevision()).thenReturn(1L);
        when(row.getStartedAt()).thenReturn(now.minusSeconds(120));when(row.getDeadlineAt()).thenReturn(now.plusSeconds(300));when(row.getFinishedAt()).thenReturn(finished);when(row.getSelectionRevision()).thenReturn(0L);
        when(row.getContextSnapshot()).thenReturn("{\"context\":"+context(command(module,null))+",\"groupCount\":1,\"itemCount\":1}");stored.put(id,row);return row;
    }
    void latest(RuleAssessmentAttemptEntity row){when(rows.skillLatestFinished(org,learner,"skill","FOUNDATION","v1")).thenReturn(List.of(row));}
    @Test void allHistoricalModuleAttemptsConsumeTheSharedAllowance() {
        var previous=old("module-A","FINALIZED",now.minusSeconds(60));latest(previous);when(rows.skillCount(org,learner,"skill","FOUNDATION","v1")).thenReturn(3L);
        assertEquals("RETAKE_LIMIT_REACHED",assertThrows(Failure.class,()->service.start(command("module-B",previous.getId()),UUID.randomUUID())).code);
        verify(rows,never()).contextCount(any(),any(),anyString(),anyString());verify(rows,never()).insert(any());
    }
    @Test void cooldownUsesLatestFinishAcrossTheGroup() {
        var previous=old("module-A","FINALIZED",now.minusSeconds(10));latest(previous);
        assertEquals("RETAKE_NOT_YET_AVAILABLE",assertThrows(Failure.class,()->service.start(command("module-B",previous.getId()),UUID.randomUUID())).code);
    }
    @Test void multipleLegacyPapersBlockNewStartsWithoutChangingPapers() {
        var a=old("A","IN_PROGRESS",null);var b=old("B","IN_PROGRESS",null);
        when(rows.skillActive(org,learner,"skill","FOUNDATION","v1")).thenReturn(List.of(a,b));
        assertEquals("MULTIPLE_ACTIVE_SKILL_ASSESSMENTS",assertThrows(Failure.class,()->service.start(command("C",null),UUID.randomUUID())).code);
        verify(rows,never()).insert(any());verifyNoInteractions(outbox,jobs);
    }
    @Test void ambiguousLegacyScopeCannotResetAllowance() {
        when(rows.unresolvedSkillCount(org,learner,"skill","FOUNDATION")).thenReturn(1L);
        assertEquals("SKILL_SCOPE_RECONCILIATION_REQUIRED",assertThrows(Failure.class,()->service.start(command("B",null),UUID.randomUUID())).code);
        verify(rows,never()).insert(any());
    }
    @Test void pureScopedHistoryRetainsActiveAndExpiredPapersAndUsesCorrectPageOffset() {
        var a=old("A","IN_PROGRESS",null);when(a.getDeadlineAt()).thenReturn(now.minusSeconds(1));
        when(rows.skillActive(org,learner,"skill","FOUNDATION","v1")).thenReturn(List.of(a));when(rows.skillCount(org,learner,"skill","FOUNDATION","v1")).thenReturn(4L);
        when(rows.unresolvedSkillCount(org,learner,"skill","FOUNDATION")).thenReturn(1L);
        var history=service.skillHistory("skill","FOUNDATION","v1",2,20);
        assertEquals(a.getId(),history.activeAttempts().getFirst().attemptId());assertEquals(4,history.totalAttempts());assertEquals(1,history.unresolvedAttempts());
        verify(rows).skillHistory(org,learner,"skill","FOUNDATION","v1",21,40);verifyNoInteractions(outbox,jobs);
    }
    @Test void crossModuleRetakeKeepsTheNewAdmissionSnapshotAndActualPredecessor() {
        var previous=old("module-A","FINALIZED",now.minusSeconds(60));latest(previous);
        var view=service.start(command("module-B",previous.getId()),UUID.randomUUID());
        var created=stored.get(view.attemptId());assertEquals(scope.contextKey(),created.getContextKey());assertEquals(previous.getId(),created.getPreviousAttemptId());
        assertEquals("module-B",view.target().moduleId());assertTrue(created.getContextSnapshot().contains("module-B"));
    }
    @Test void staleRetakeParentIsRejectedWithinTheSharedGroup() {
        latest(old("A","FINALIZED",now.minusSeconds(60)));
        assertEquals("RETAKE_CONTEXT_CHANGED",assertThrows(Failure.class,()->service.start(command("B",UUID.randomUUID()),UUID.randomUUID())).code);
    }
    @Test void activePaperFromAnotherModuleIsResumedWithoutInsertingOrRetargeting() {
        var active=old("module-A","IN_PROGRESS",null);group.set(UUID.randomUUID());frozen.set("{\"optionIds\":[\"a\",\"b\"],\"contentHash\":\"content\",\"mappingHash\":\"mapping\"}");
        when(rows.skillActive(org,learner,"skill","FOUNDATION","v1")).thenReturn(List.of(active));
        var result=service.start(command("module-B",null),UUID.randomUUID());
        assertEquals(active.getId(),result.attemptId());assertEquals("module-A",result.target().moduleId());verify(rows,never()).insert(any());
    }
    @Test void baselineRemainsOnItsOriginalContext() {
        var start=new Start(Purpose.BASELINE,UUID.randomUUID(),1,null,null,null,null);
        doReturn(new Context(start.expectedSelectionId(),1,"baseline-key","{}",List.of())).when(contexts).resolve(actor,start);
        assertEquals("ASSESSMENT_NOT_REQUIRED",assertThrows(Failure.class,()->service.start(start,UUID.randomUUID())).code);
        verify(rows).contextHistory(eq(org),eq(learner),eq("BASELINE"),eq("baseline-key"),any());verify(rows,never()).skillActive(any(),any(),anyString(),anyString(),anyString());
    }
    @Test void idempotencyReceiptReplaysEvenAfterTheSourceModuleChanges() {
        var request=command("module-B",null);UUID key=UUID.randomUUID();var first=service.start(request,key);
        var receipt=mock(AssessmentRulePolicyJpaRepository.Receipt.class);
        when(receipt.getHash()).thenReturn(RoleBaselineFlow.hash(write(request)));when(receipt.getOutcome()).thenReturn(write(first));
        when(receipts.receipt(org,learner,"RULE_START","ASSESSMENT_START",key)).thenReturn(Optional.of(receipt));
        var second=service.start(request,key);assertEquals(first.attemptId(),second.attemptId());
        verify(contexts,times(1)).resolve(actor,request);verify(rows,times(1)).insert(any());
        assertEquals("IDEMPOTENCY_CONFLICT",assertThrows(Failure.class,()->service.start(command("different",null),key)).code);
    }
    @Test void changedSkillVersionCannotDrawQuestionsFromTheNewCatalogForAnOldSnapshot() {
        var changed=new Scope("scope",Purpose.SKILL_ASSESSMENT,"skill","Skill","FOUNDATION","Foundation","FOUNDATION",0,"catalog",List.of(new GroupSpec(new ConfigurationRequirement("skill",KnowledgeLevel.FOUNDATION,List.of()),"Skill","v2",SkillProvisionMode.MODULE_ONLY,List.of())),true,List.of());
        when(catalog.scopes(org,Purpose.SKILL_ASSESSMENT)).thenReturn(List.of(changed));
        assertEquals("SKILL_VERSION_CHANGED",assertThrows(Failure.class,()->service.start(command("B",null),UUID.randomUUID())).code);
        verifyNoInteractions(bank);verify(rows,never()).insert(any());
    }

}
