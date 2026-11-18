package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.AssessmentPolicyScope.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.support.JpaTestContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/** Real PG transactions/migrations; catalog, bank and subscription ports are controlled fixtures, not UI acceptance. */
class WF05PolicyPersistenceTest {
    static JpaTestContext db; static JdbcTemplate sql;
    static org.testcontainers.containers.PostgreSQLContainer<?> isolated;
    UUID org,actor,otherActor; SubscriptionAccessPolicy.Actor current;
    AssessmentPolicyCatalog catalog; AssessmentItemKnowledgeMappingJpaRepository bank;
    ScopedAssessmentPolicyService service; Scope baseline,other,skill,unconfigured;
    final ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    @BeforeAll static void start(){
        String url=System.getenv("WF05_JDBC_URL");
        if(url==null || url.isBlank()) {
            isolated=new org.testcontainers.containers.PostgreSQLContainer<>("postgres:17.6-alpine")
                    .withDatabaseName("wf05_p1").withUsername("wf05").withPassword("wf05-isolated");
            isolated.start();url=isolated.getJdbcUrl();
        } else if(!"jdbc:postgresql://127.0.0.1:35432/wf05_p1".equals(url))throw new IllegalStateException("WF05 requires its explicit isolated PostgreSQL on 35432; dev DB forbidden");
        Flyway.configure().dataSource(url,"wf05","wf05-isolated").locations("classpath:db/workspace-migration").load().migrate();
        db=JpaTestContext.start(url,"wf05","wf05-isolated");sql=new JdbcTemplate(db.dataSource());
    }
    @AfterAll static void stop(){if(db!=null){db.close();db=null;}if(isolated!=null){isolated.stop();isolated=null;}}
    Scope scope(Purpose purpose,String owner,String level){var requirement=new ConfigurationRequirement("S-A",KnowledgeLevel.FOUNDATION,List.of("OUT-1"));
        return new Scope(AssessmentPolicyScope.key(purpose,owner,level),purpose,owner,owner,level,level,level,1,"a".repeat(64),
            List.of(new GroupSpec(requirement,"Skill A","v1",SkillProvisionMode.MODULE_ONLY,List.of())),true,List.of());}
    SubscriptionAccessPolicy.Actor as(UUID id,SubscriptionAccessPolicy.Role role){return new SubscriptionAccessPolicy.Actor(id,org,true,true,Set.of(role),true);}
    @BeforeEach void setup(){org=UUID.randomUUID();actor=UUID.randomUUID();otherActor=UUID.randomUUID();
        sql.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,?,?)",org,"WF05-"+org.toString().substring(0,8).toUpperCase(Locale.ROOT),"WF05 isolated");
        for(var id:List.of(actor,otherActor))sql.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?,?)",id,org,id+"@wf05.test",id+"@wf05.test","unusable");
        current=as(actor,SubscriptionAccessPolicy.Role.LD_MANAGER);
        baseline=scope(Purpose.BASELINE,"R1","L1");other=scope(Purpose.BASELINE,"R2","L2");skill=scope(Purpose.SKILL_ASSESSMENT,"S-A","FOUNDATION");unconfigured=scope(Purpose.SKILL_ASSESSMENT,"S-B","FOUNDATION");
        catalog=mock(AssessmentPolicyCatalog.class);bank=mock(AssessmentItemKnowledgeMappingJpaRepository.class);
        when(catalog.discoverForEditor(any(),eq(Purpose.BASELINE),any())).thenReturn(new Discovery(List.of(baseline,other),List.of()));
        when(catalog.discoverForEditor(eq(org),eq(Purpose.SKILL_ASSESSMENT),eq(actor))).thenReturn(new Discovery(List.of(skill,unconfigured),List.of()));
        when(catalog.discoverForEditor(eq(org),eq(Purpose.SKILL_ASSESSMENT),eq(otherActor))).thenReturn(new Discovery(List.of(skill,unconfigured),List.of()));
        when(bank.availableCount(any(),anyString(),anyString(),anyString())).thenReturn(2);
        var item=mock(AssessmentItemKnowledgeMappingJpaRepository.Candidate.class);when(item.getMandatory()).thenReturn(false);
        when(bank.eligible(any(),anyString(),anyString(),anyString(),anyInt())).thenReturn(List.of(item,item));
        service=new ScopedAssessmentPolicyService(()->new SubscriptionIdentity.Context(current,null),mock(SubscriptionWorkspaceStore.class),catalog,
            db.bean(ScopedAssessmentPolicyJpaRepository.class),db.bean(AssessmentRulePolicyJpaRepository.class),bank,
            new PostgresAdvisoryLocks(db.bean(EntityManager.class)),new TransactionTemplate(db.transactionManager()),json,1000);
    }
    ScopedAssessmentPolicyService.Workspace draft(Scope scope){return service.create(scope.purpose(),scope.key(),new ScopedAssessmentPolicyService.Create(UUID.randomUUID(),0));}
    Policy config(Purpose purpose){return new Policy(60,0,3,List.of(new GroupRule("S-A",KnowledgeLevel.FOUNDATION,2,2,false,false,purpose==Purpose.BASELINE?null:0)));}
    ScopedAssessmentPolicyService.Workspace save(Scope scope,ScopedAssessmentPolicyService.Workspace w){return service.save(scope.purpose(),scope.key(),
        new ScopedAssessmentPolicyService.Save(UUID.randomUUID(),w.draft().id(),w.draft().revision(),scope.catalogHash(),config(scope.purpose())));}
    ScopedAssessmentPolicyService.Workspace publish(Scope scope,ScopedAssessmentPolicyService.Workspace w){return service.activate(scope.purpose(),scope.key(),
        new ScopedAssessmentPolicyService.Activate(UUID.randomUUID(),w.draft().id(),w.draft().revision(),w.activationRevision(),scope.catalogHash()));}
    @Test @DisplayName("TC-WF05-F01 persistence: exact Role-Level policy saved, published and read back; other scope unchanged")
    void baselinePublication(){var d=draft(baseline);var published=publish(baseline,save(baseline,d));var reopened=service.read(Purpose.BASELINE,baseline.key(),0,20);
        assertThat(reopened.active().id()).isEqualTo(published.active().id());assertThat(reopened.active().configuration()).isEqualTo(config(Purpose.BASELINE));
        assertThat(reopened.activationRevision()).isEqualTo(1);assertThat(service.read(Purpose.BASELINE,other.key(),0,20).active()).isNull();
        assertThat(sql.queryForObject("SELECT configuration_hash FROM platform.assessment_rule_policy_version WHERE id=?",String.class,published.active().id())).matches("[a-f0-9]{64}");}
    @Test @DisplayName("TC-WF05-S01 persistence: incomplete and insufficient-bank drafts cannot replace immutable active version")
    void invalidPublicationRetainsPrevious(){var first=publish(baseline,save(baseline,draft(baseline)));
        var second=service.create(Purpose.BASELINE,baseline.key(),new ScopedAssessmentPolicyService.Create(UUID.randomUUID(),first.activationRevision()));
        var partial=service.saveEditor(Purpose.BASELINE,baseline.key(),new ScopedAssessmentPolicyService.SaveEditor(UUID.randomUUID(),second.draft().id(),second.draft().revision(),baseline.catalogHash(),
            new BaselinePolicyEditor.Progress(1,false,List.of(new BaselinePolicyEditor.LevelRule(KnowledgeLevel.FOUNDATION,null,null)),null,null,null)));
        assertThat(partial.draft().configuration()).isNull();assertThatThrownBy(()->publish(baseline,partial)).hasMessageContaining("POLICY_CONFIGURATION_REQUIRED");
        var ready=save(baseline,partial);when(bank.eligible(any(),anyString(),anyString(),anyString(),anyInt())).thenReturn(List.of());
        assertThatThrownBy(()->publish(baseline,ready)).hasMessageContaining("INSUFFICIENT_APPROVED_GROUP_BANK");
        var after=service.read(Purpose.BASELINE,baseline.key(),0,20);assertThat(after.active().id()).isEqualTo(first.active().id());assertThat(after.totalVersions()).isEqualTo(1);assertThat(after.draft()).isNotNull();}
    @Test @DisplayName("TC-WF05-F14 persistence: two authorized editors share one policy and drafts sort before unconfigured scopes")
    void sharedSkillScope(){current=as(actor,SubscriptionAccessPolicy.Role.DOMAIN_EXPERT);var d=draft(skill);
        current=as(otherActor,SubscriptionAccessPolicy.Role.DOMAIN_EXPERT);assertThat(service.read(Purpose.SKILL_ASSESSMENT,skill.key(),0,20).draft().id()).isEqualTo(d.draft().id());
        var rows=service.directory(Purpose.SKILL_ASSESSMENT,"","","","",0,20).rows();assertThat(rows.getFirst().scope().key()).isEqualTo(skill.key());
        var p=publish(skill,save(skill,d));current=as(actor,SubscriptionAccessPolicy.Role.DOMAIN_EXPERT);assertThat(service.read(Purpose.SKILL_ASSESSMENT,skill.key(),0,20).active().id()).isEqualTo(p.active().id());
        when(catalog.discoverForEditor(eq(org),eq(Purpose.SKILL_ASSESSMENT),eq(actor))).thenReturn(new Discovery(List.of(),List.of()));
        assertThatThrownBy(()->service.read(Purpose.SKILL_ASSESSMENT,skill.key(),0,20)).hasMessageContaining("CONFIGURATION_SCOPE_NOT_FOUND");
        assertThatThrownBy(()->service.create(Purpose.SKILL_ASSESSMENT,skill.key(),new ScopedAssessmentPolicyService.Create(UUID.randomUUID(),1))).hasMessageContaining("CONFIGURATION_SCOPE_NOT_FOUND");}
    @Test @DisplayName("TC-WF05-F14 persistence: insufficient Skill bank prevents publication while preserving the draft")
    void insufficientSkillBank(){current=as(actor,SubscriptionAccessPolicy.Role.DOMAIN_EXPERT);var ready=save(skill,draft(skill));
        when(bank.eligible(any(),anyString(),anyString(),anyString(),anyInt())).thenReturn(List.of());
        assertThatThrownBy(()->publish(skill,ready)).hasMessageContaining("INSUFFICIENT_APPROVED_GROUP_BANK");
        var retained=service.read(Purpose.SKILL_ASSESSMENT,skill.key(),0,20);assertThat(retained.active()).isNull();assertThat(retained.draft().id()).isEqualTo(ready.draft().id());}
}
