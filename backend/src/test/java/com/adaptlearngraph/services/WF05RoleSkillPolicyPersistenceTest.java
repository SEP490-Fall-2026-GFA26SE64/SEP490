package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.AssessmentRulePolicyEntity;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.AssessmentPolicyScope.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.*;
import jakarta.persistence.EntityManager;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Real PostgreSQL policies, activations and receipts; assignments/bank are explicit catalog fixtures. */
class WF05RoleSkillPolicyPersistenceTest {
    @Test @Tag("wf05-feature") @DisplayName("FR-06.08-I01: exact Foundation prerequisite bank works without Advanced bank and empty prerequisite is rejected")
    void exactFoundationPrerequisiteBank() throws Exception {
        var f=new WF05PolicyPersistenceTest();f.setup();
        var groups=new ArrayList<>(f.skill.groups());
        groups.add(new GroupSpec(new ConfigurationRequirement("S-B",KnowledgeLevel.FOUNDATION,List.of()),"B","v1",SkillProvisionMode.MODULE_ONLY,List.of()));
        var scope=new Scope(f.skill.key(),Purpose.SKILL_ASSESSMENT,"S-A","A","FOUNDATION","Foundation","FOUNDATION",1,"a".repeat(64),groups,true,List.of());
        when(f.catalog.scopes(f.org,Purpose.SKILL_ASSESSMENT)).thenReturn(List.of(scope));
        when(f.catalog.roleSkills(f.org,f.actor)).thenReturn(Map.of("R1",Set.of("S-A")));
        when(f.catalog.roleSkills(f.org,null)).thenReturn(Map.of("R1",Set.of("S-A")));
        var a=mock(AssessmentItemKnowledgeMappingJpaRepository.PoolCounts.class);when(a.getTotal()).thenReturn(2L);
        var b=mock(AssessmentItemKnowledgeMappingJpaRepository.PoolCounts.class);when(b.getTotal()).thenReturn(2L);
        when(f.bank.poolCounts(f.org,"S-A","FOUNDATION","v1")).thenReturn(a);
        when(f.bank.poolCounts(f.org,"S-B","FOUNDATION","v1")).thenReturn(b);
        f.current=f.as(f.actor,SubscriptionAccessPolicy.Role.DOMAIN_EXPERT);var service=shared(f,f.bank);
        activate(service,configuration("Foundation only",2));
        var policy=resolve(f,service,scope,"R1");var decoded=f.json.readValue(policy.getConfiguration(),Policy.class);
        assertThat(decoded.groups()).hasSize(2).allMatch(g->g.totalCount()==2&&g.requiredCorrectCount()==2);
        assertThat(decoded.timeLimitSeconds()).isEqualTo(120);
        when(b.getTotal()).thenReturn(0L);
        assertThatThrownBy(()->resolve(f,service,scope,"R1")).hasMessageContaining("INSUFFICIENT_APPROVED_GROUP_BANK");
        assertThat(WF05PolicyPersistenceTest.db.bean(AssessmentRulePolicyJpaRepository.class).owned(f.org,"SKILL_ASSESSMENT",policy.getId())).isPresent();
    }
    @BeforeAll static void start(){WF05PolicyPersistenceTest.start();}
    @AfterAll static void stop(){WF05PolicyPersistenceTest.stop();}

    static SharedSkillAssessmentService shared(WF05PolicyPersistenceTest f,AssessmentItemKnowledgeMappingJpaRepository bank) {
        var db=WF05PolicyPersistenceTest.db;
        return new SharedSkillAssessmentService(()->new SubscriptionIdentity.Context(f.current,null),
            mock(SubscriptionWorkspaceStore.class),f.catalog,db.bean(ScopedAssessmentPolicyJpaRepository.class),
            db.bean(AssessmentRulePolicyJpaRepository.class),bank,new PostgresAdvisoryLocks(db.bean(EntityManager.class)),
            new TransactionTemplate(db.transactionManager()),f.json,1000);
    }
    static SharedSkillAssessmentService.Configuration configuration(String name,int count) {
        var rule=new SharedSkillAssessmentService.Rule(count,count,0,false);
        return new SharedSkillAssessmentService.Configuration(name,Map.of("FOUNDATION",rule,"INTERMEDIATE",rule,"ADVANCED",rule),rule,30,3,0);
    }
    static SharedSkillAssessmentService.Workspace activate(SharedSkillAssessmentService service,SharedSkillAssessmentService.Configuration config) {
        var w=service.read(0,"","latest");
        return service.command(new SharedSkillAssessmentService.Command(UUID.randomUUID(),"SAVE_ACTIVATE",
            w.draft()==null?null:w.draft().id(),w.draft()==null?0:w.draft().revision(),w.activationRevision(),w.capacityHash(),config));
    }
    static AssessmentRulePolicyEntity resolve(WF05PolicyPersistenceTest f,SharedSkillAssessmentService service,Scope scope,String role) {
        return new TransactionTemplate(WF05PolicyPersistenceTest.db.transactionManager()).execute(s->service.resolve(f.org,scope,role,true).orElseThrow());
    }

    @Test @Tag("bm04-wf05") @DisplayName("TC-WF05-F14 - Expert settings apply to assigned Roles; common Skills retain each Role policy")
    void assignedRolesAndOverlappingSkillRemainIsolated() throws Exception {
        var f=new WF05PolicyPersistenceTest();f.setup();
        var b=new Scope(AssessmentPolicyScope.key(Purpose.SKILL_ASSESSMENT,"S-B","FOUNDATION"),Purpose.SKILL_ASSESSMENT,
            "S-B","Skill B","FOUNDATION","Foundation","FOUNDATION",1,"b".repeat(64),List.of(
                new GroupSpec(new ConfigurationRequirement("S-B",KnowledgeLevel.FOUNDATION,List.of()),"Skill B","v1",SkillProvisionMode.MODULE_ONLY,List.of())),true,List.of());
        when(f.catalog.scopes(f.org,Purpose.SKILL_ASSESSMENT)).thenReturn(List.of(f.skill,b));
        when(f.catalog.roleSkills(f.org,f.actor)).thenReturn(Map.of("R1",Set.of("S-A","S-B")));
        when(f.catalog.roleSkills(f.org,f.otherActor)).thenReturn(Map.of("R2",Set.of("S-A")));
        when(f.catalog.roleSkills(f.org,null)).thenReturn(Map.of("R1",Set.of("S-A","S-B"),"R2",Set.of("S-A"),"R3",Set.of("S-A")));
        var pool=mock(AssessmentItemKnowledgeMappingJpaRepository.PoolCounts.class);
        when(pool.getTotal()).thenReturn(5L);when(pool.getMandatory()).thenReturn(0L);
        when(f.bank.poolCounts(eq(f.org),anyString(),anyString(),eq("v1"))).thenReturn(pool);
        var service=shared(f,f.bank);f.current=f.as(f.actor,SubscriptionAccessPolicy.Role.DOMAIN_EXPERT);
        var original=activate(service,configuration("Role one",2));
        // History excludes the current active version. Publish again to verify retained immutable history.
        var first=activate(service,configuration("Role one updated",2));
        var reopened=service.read(0,"","latest");
        assertThat(reopened.active().id()).isEqualTo(first.active().id());
        assertThat(reopened.totalVersions()).isEqualTo(1);
        assertThat(reopened.versions()).extracting(SharedSkillAssessmentService.Version::id).containsExactly(original.active().id());
        f.current=f.as(f.otherActor,SubscriptionAccessPolicy.Role.DOMAIN_EXPERT);
        assertThat(service.read(0,"","latest").active()).isNull();
        var second=activate(service,configuration("Role two",1));
        assertThat(second.active().id()).isNotEqualTo(first.active().id());
        var r1=resolve(f,service,f.skill,"R1");var r2=resolve(f,service,f.skill,"R2");var otherSkill=resolve(f,service,b,"R1");
        assertThat(r1.getId()).isNotEqualTo(r2.getId());
        assertThat(r1.getScopeKey()).isEqualTo(SharedSkillAssessmentService.paperKey(f.skill,"R1"));
        assertThat(r2.getScopeKey()).isEqualTo(SharedSkillAssessmentService.paperKey(f.skill,"R2"));
        assertThat(f.json.readValue(r1.getConfiguration(),Policy.class).groups().getFirst().totalCount()).isEqualTo(2);
        assertThat(f.json.readValue(otherSkill.getConfiguration(),Policy.class).groups().getFirst().totalCount()).isEqualTo(2);
        assertThat(f.json.readValue(r2.getConfiguration(),Policy.class).groups().getFirst().totalCount()).isEqualTo(1);
        assertThatThrownBy(()->resolve(f,service,b,"R2")).hasMessageContaining("ASSESSMENT_CONTEXT_CHANGED");
        assertThatThrownBy(()->resolve(f,service,f.skill,"R3")).hasMessageContaining("ASSESSMENT_POLICY_REQUIRED");
        f.current=f.as(f.actor,SubscriptionAccessPolicy.Role.DOMAIN_EXPERT);
        assertThat(service.read(0,"","latest").active().id()).isEqualTo(first.active().id());
        // A missing bank blocks activation and cannot replace the accepted Role configuration.
        when(pool.getTotal()).thenReturn(0L);
        assertThatThrownBy(()->activate(service,configuration("Empty bank",2))).hasMessageContaining("INSUFFICIENT_APPROVED_GROUP_BANK");
        assertThat(service.read(0,"","latest").active().id()).isEqualTo(first.active().id());
        when(f.catalog.roleSkills(f.org,f.actor)).thenReturn(Map.of());
        assertThatThrownBy(()->service.read(0,"","latest")).hasMessageContaining("FORBIDDEN");
    }
}
