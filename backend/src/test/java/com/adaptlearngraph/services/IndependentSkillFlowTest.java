package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.ModuleAuthoring;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import com.adaptlearngraph.repository.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class IndependentSkillFlowTest {
    Document module() {
        var meta=new Metadata("m","0.12.0","ACTIVE","APPROVED","expert","2026-11-15T00:00:00Z");
        var content=new Content("c","Lesson","# Lesson","text/markdown","1",List.of(),"expert","2026-11-15T00:00:00Z");
        var payload=new ModuleAuthoring.Package(meta,"Module","LESSON_AND_PRACTICE","module-content:c","text/markdown","1",5,List.of(new Teaching(meta,"skill","Skill")),content,KnowledgeLevel.FOUNDATION,List.of(),"v1");
        var revision=new Revision(1,"RELEASED",payload,"expert","2026-11-15T00:00:00Z","expert","2026-11-15T00:00:00Z",null);
        return new Document("m","org",List.of(),"expert","2026-11-15T00:00:00Z",1,true,false,1,List.of(revision),List.of());
    }
    @Test void independentStartRequiresActualModuleAndAdmissionWithoutAssignedPathway() {
        var modules=mock(ModuleAuthoringPort.class);var learning=mock(LearningContentPort.class);
        when(modules.actor()).thenReturn(new Actor("employee","org",Set.of("EMPLOYEE")));
        when(modules.transaction(any())).thenAnswer(c->c.<Supplier<?>>getArgument(0).get());
        when(modules.catalog("MicroSkill")).thenReturn(List.of(new Choice("skill","Skill")));
        when(modules.catalog("ModuleSkill")).thenReturn(List.of(new Choice("skill","Skill")));
        when(modules.lock("org","m")).thenReturn(Optional.of(module()));
        when(modules.pinned("org","employee","m")).thenReturn(Optional.empty());
        var allowed=new SkillLearningService(modules,learning,(a,d,r)->null);
        allowed.start("skill","m");
        verify(learning).admitSelfStudy("org","employee","m",1,"skill");verify(modules).pin("org","employee","m",1);
        clearInvocations(learning,modules);
        var denied=new SkillLearningService(modules,learning,(a,d,r)->"PATHWAY_MODULE_LOCKED");
        assertEquals(403,assertThrows(ModuleAuthoringService.Failure.class,()->denied.start("skill","m")).status());
        verify(learning,never()).admitSelfStudy(anyString(),anyString(),anyString(),anyInt(),anyString());
    }
    @Test void independentCommandCannotMasqueradeAsBaselineOrPartialRoleContext() {
        assertTrue(new RuleAssessmentAttemptService.Start(Purpose.SKILL_ASSESSMENT,null,0,null,null,"m",1).validContext());
        assertFalse(new RuleAssessmentAttemptService.Start(Purpose.BASELINE,null,0,null,null,"m",1).validContext());
        assertFalse(new RuleAssessmentAttemptService.Start(Purpose.SKILL_ASSESSMENT,null,1,null,null,"m",1).validContext());
        assertFalse(new RuleAssessmentAttemptService.Start(Purpose.SKILL_ASSESSMENT,null,0,null,UUID.randomUUID(),"m",1).validContext());
    }
    @Test void catalogKeepsLockedOptionsVisibleWithoutGrantingEntry() {
        var modules=mock(ModuleAuthoringPort.class);var learning=mock(LearningContentPort.class);
        when(modules.actor()).thenReturn(new Actor("employee","org",Set.of("EMPLOYEE")));
        when(modules.transaction(any())).thenAnswer(c->c.<Supplier<?>>getArgument(0).get());
        when(modules.catalog("MicroSkill")).thenReturn(List.of(new Choice("skill","Skill")));
        when(modules.catalog("ModuleSkill")).thenReturn(List.of(new Choice("skill","Skill")));
        when(modules.documents("org")).thenReturn(List.of(module()));
        when(modules.pinned("org","employee","m")).thenReturn(Optional.empty());
        when(learning.completions("org","employee","skill")).thenReturn(List.of());
        var service=new SkillLearningService(modules,learning,(a,d,r)->"PREREQUISITE_NOT_MET");
        var options=service.modules("skill");assertEquals(1,options.size());assertEquals("PREREQUISITE_NOT_MET",options.getFirst().unavailableReason());
        verify(learning,never()).admitSelfStudy(anyString(),anyString(),anyString(),anyInt(),anyString());
        assertThrows(ModuleAuthoringService.Failure.class,()->service.modules("foreign-skill"));
    }
    @Test void wrongRoleCannotEnumerateIndependentModules() {
        var modules=mock(ModuleAuthoringPort.class);var learning=mock(LearningContentPort.class);
        when(modules.actor()).thenReturn(new Actor("expert","org",Set.of("EXPERT")));
        when(modules.transaction(any())).thenAnswer(c->c.<Supplier<?>>getArgument(0).get());
        var service=new SkillLearningService(modules,learning,(a,d,r)->null);
        assertEquals(403,assertThrows(ModuleAuthoringService.Failure.class,()->service.modules("skill")).status());
        verify(modules,never()).documents(anyString());
    }
    @Test void completedIndependentContextDoesNotRequireOrFabricateRoleSelection() {
        var organization=UUID.randomUUID();var learner=UUID.randomUUID();
        var modules=mock(ModuleAuthoringPort.class);var learning=mock(LearningContentPort.class);
        var selections=mock(CurrentRoleSelectionStore.class);var graph=mock(Neo4jCypher.class);
        var statements=mock(Neo4jCypher.Statements.class);var record=mock(org.neo4j.driver.Record.class);
        when(record.get("skill")).thenReturn(org.neo4j.driver.Values.value(Map.of("name","Skill","version","v1","moduleOnlyKnowledgeLevels",List.of("FOUNDATION"),"certificateOnlyKnowledgeLevels",List.of())));
        when(statements.list(anyString(),anyMap())).thenAnswer(c->c.<String>getArgument(0).contains("properties(s)")?List.of(record):List.of());
        when(graph.read(any())).thenAnswer(c->c.<java.util.function.Function<Neo4jCypher.Statements,Object>>getArgument(0).apply(statements));
        when(modules.actor()).thenReturn(new Actor(learner.toString(),organization.toString(),Set.of("EMPLOYEE")));
        when(modules.transaction(any())).thenAnswer(c->c.<Supplier<?>>getArgument(0).get());
        when(modules.lock(organization.toString(),"m")).thenReturn(Optional.of(module()));
        when(learning.selfStudyRevision(organization.toString(),learner.toString(),"m",1)).thenReturn(true);
        when(learning.assignedRevision(organization.toString(),learner.toString(),"m",1)).thenReturn(true);
        when(learning.completions(organization.toString(),learner.toString(),"skill")).thenReturn(List.of(new com.adaptlearngraph.entities.domain.LearningResources.SkillCompletion("skill","m",1,"1","2026-11-15T00:00:00Z","FOUNDATION","v1",List.of(),"Skill")));
        var catalog=new CurrentRoleKnowledgeCatalog(selections,mock(RoleBaselineFlow.Catalog.class),graph,mock(RuleAssessmentContextJpaRepository.class),new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules(),100)
            .independent(modules,learning,(a,d,r)->null);
        var command=new RuleAssessmentAttemptService.Start(Purpose.SKILL_ASSESSMENT,null,0,null,null,"m",1);
        var context=catalog.resolve(new RoleBaselineFlow.Actor(organization,learner),command);
        assertNull(context.selectionId());assertEquals(0,context.selectionRevision());assertEquals("INDEPENDENT_SKILL:m:1",context.contextKey());
        assertEquals(1,context.groups().size());verifyNoInteractions(selections);
        when(learning.completions(organization.toString(),learner.toString(),"skill")).thenReturn(List.of());
        assertThrows(AssessmentPolicyService.Failure.class,()->catalog.resolve(new RoleBaselineFlow.Actor(organization,learner),command));
    }
    @Test void modulePortUsesOnlyTrustedEmployeeFallbackOutsideModuleFilter() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        var actor=new Actor("real-learner","real-organization",Set.of("EMPLOYEE"));
        var port=new JpaModuleAuthoringAdapter(null,null,null,null,"configured-demo-org",()->actor);
        assertEquals(actor,port.actor());
        var legacy=new JpaModuleAuthoringAdapter(null,null,null,null,"configured-demo-org");
        assertEquals(401,assertThrows(ModuleAuthoringService.Failure.class,legacy::actor).status());
    }
    @Test void selectedSkillProfileFilterUsesTrustedOwnerBeforePagination() {
        var identity=mock(RoleBaselineFlow.Identity.class);var data=mock(RuleKnowledgeProfileJpaRepository.class);
        var owner=new RoleBaselineFlow.Actor(UUID.randomUUID(),UUID.randomUUID());when(identity.requireEmployee()).thenReturn(owner);
        when(data.page(owner.organizationId(),owner.learnerId(),"ALL","skill",21,20)).thenReturn(List.of());
        var profiles=new RuleKnowledgeProfileService(identity,data,new com.fasterxml.jackson.databind.ObjectMapper());
        assertTrue(profiles.read("ALL",1,"skill").items().isEmpty());
        verify(data).page(owner.organizationId(),owner.learnerId(),"ALL","skill",21,20);
        verify(data,never()).page(any(),any(),anyString(),anyInt(),anyInt());
        assertThrows(AssessmentPolicyService.Failure.class,()->profiles.read("ALL",0," "));
    }
    @Test void moduleFilterEmployeeIsRevalidatedBeforeOrganizationLock() {
        var context=org.springframework.security.core.context.SecurityContextHolder.getContext();
        var auth=new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("learner","unused",List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        auth.setDetails(Map.of("organizationId","org"));context.setAuthentication(auth);
        try {
            var repositories=mock(ModuleAuthoringRepositories.class);var locks=mock(PostgresAdvisoryLocks.class);
            when(repositories.locks()).thenReturn(locks);
            var transactions=mock(org.springframework.transaction.support.TransactionTemplate.class);
            when(transactions.execute(any())).thenAnswer(call->call.<org.springframework.transaction.support.TransactionCallback<Object>>getArgument(0).doInTransaction(mock(org.springframework.transaction.TransactionStatus.class)));
            @SuppressWarnings("unchecked") Supplier<Actor> trusted=mock(Supplier.class);
            when(trusted.get()).thenReturn(new Actor("learner","org",Set.of("EMPLOYEE")));
            var port=new JpaModuleAuthoringAdapter(repositories,transactions,null,null,"unused",trusted);
            assertEquals("done",port.transaction(()->"done"));
            var order=inOrder(trusted,locks);order.verify(trusted).get();order.verify(locks).lock("org:module-authoring");
            when(trusted.get()).thenReturn(new Actor("other","org",Set.of("EMPLOYEE")));clearInvocations(locks);
            assertEquals(403,assertThrows(ModuleAuthoringService.Failure.class,()->port.transaction(()->"unreachable")).status());
            verifyNoInteractions(locks);
        } finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    }
    @Test void employeeModuleSearchCombinesFiltersAndKeepsReadsSideEffectFree() {
        var modules=mock(ModuleAuthoringPort.class);var learning=mock(LearningContentPort.class);
        when(modules.actor()).thenReturn(new Actor("employee","org",Set.of("EMPLOYEE")));
        when(modules.transaction(any())).thenAnswer(c->c.<Supplier<?>>getArgument(0).get());
        when(modules.catalog("MicroSkill")).thenReturn(List.of(new Choice("skill","Skill")));
        when(modules.catalog("ModuleSkill")).thenReturn(List.of(new Choice("skill","Skill")));
        when(modules.documents("org")).thenReturn(List.of(module()));
        when(modules.pinned("org","employee","m")).thenReturn(Optional.empty());
        when(learning.completions("org","employee","skill")).thenReturn(List.of());
        var service=new SkillLearningService(modules,learning,(a,d,r)->"PREREQUISITE_NOT_MET");
        var page=service.search("MODULE","skill","FOUNDATION",0);
        assertEquals(1,page.totalItems());assertEquals("skill",page.items().getFirst().skillId());
        assertEquals("Skill",page.items().getFirst().skillName());assertEquals(KnowledgeLevel.FOUNDATION,page.items().getFirst().module().knowledgeLevel());
        assertEquals("PREREQUISITE_NOT_MET",page.items().getFirst().module().unavailableReason());
        var own=module();
        var foreign=new Document("foreign","other-org",List.of(),"expert","2026-11-15T00:00:00Z",1,true,false,1,own.revisions(),List.of());
        when(modules.documents("org")).thenReturn(List.of(own,foreign));
        assertEquals(1,service.search("",null,null,0).totalItems());
        assertEquals(0,service.search("","skill","ADVANCED",0).totalItems());
        assertEquals(0,service.search("","foreign",null,0).totalItems());
        assertTrue(service.search("",null,null,1).items().isEmpty());
        assertEquals(400,assertThrows(ModuleAuthoringService.Failure.class,()->service.search("",null,"BEGINNER",0)).status());
        assertThrows(ModuleAuthoringService.Failure.class,()->service.search("",null,null,-1));
        verify(modules,never()).pin(anyString(),anyString(),anyString(),anyInt());
        verify(learning,never()).admitSelfStudy(anyString(),anyString(),anyString(),anyInt(),anyString());
        when(modules.actor()).thenReturn(new Actor("expert","org",Set.of("EXPERT")));
        assertEquals(403,assertThrows(ModuleAuthoringService.Failure.class,()->service.search("",null,null,0)).status());
    }

}
