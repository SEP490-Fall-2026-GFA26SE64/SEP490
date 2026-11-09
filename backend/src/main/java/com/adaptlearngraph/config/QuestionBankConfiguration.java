package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.Neo4jQuestionBankSkillReader;
import com.adaptlearngraph.repository.SubscriptionIdentity;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore;
import com.adaptlearngraph.services.QuestionBankMailWorker;
import com.adaptlearngraph.services.QuestionBankService;
import com.adaptlearngraph.services.QuestionBankUseCase;
import com.adaptlearngraph.repository.QuestionBankPorts.*;
import com.adaptlearngraph.entities.domain.QuestionBank.*;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy;
import com.adaptlearngraph.helper.TransactionalMailSender;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.util.*;
import org.neo4j.driver.Driver;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
@Import({PersistenceConfiguration.class, ModelMapperConfiguration.class})
public class QuestionBankConfiguration {
    @Bean Actors questionBankActors(SubscriptionIdentity identity,SubscriptionWorkspaceStore workspaces) {
        return ()->{var a=identity.current().actor();if(a.organizationId()==null||a.roles().size()!=1)throw new Failure(403,"Organization staff required");String role=a.roles().iterator().next().name();if(!Set.of("DOMAIN_EXPERT","LD_MANAGER").contains(role))throw new Failure(403,"Question Bank staff access required");workspaces.require(a,a.organizationId(),SubscriptionAccessPolicy.Action.WORKSPACE,Clock.systemUTC().instant());return new Actor(a.accountId(),a.organizationId(),role);};
    }
    @Bean Neo4jQuestionBankSkillReader questionBankSkillReader(Driver driver,@Value("${spring.data.neo4j.database:neo4j}") String database,@Value("${question-bank.catalog.timeout-ms:10000}") long timeout) {
        return new Neo4jQuestionBankSkillReader(driver,database,Duration.ofMillis(timeout));
    }
    @Bean Catalog questionBankCatalog(com.adaptlearngraph.repository.OrganizationMembershipJpaRepository memberships,Neo4jQuestionBankSkillReader skills) {
        return new Catalog(){
            private List<Choice> members(Actor a,String role) {return memberships.staff(a.organization(),role).stream()
                .map(s->new Choice(s.accountId().toString(),s.name())).toList();}
            public List<Choice> experts(Actor a){return members(a,"DOMAIN_EXPERT");}
            public List<Choice> managers(Actor a){return members(a,"LD_MANAGER");}
            public void requireExpert(Actor a,UUID id){if(experts(a).stream().noneMatch(x->x.id().equals(id.toString())))throw new Failure(409,"Responsible Expert is not active in this organization");}
            public List<Choice> skills(Actor a){return skills.skills(a.organization().toString());}
            public List<KnowledgeChoice> knowledge(Actor a){return skills.knowledge(a.organization().toString());}
            public String requireSkill(Actor a,String id){return skills.requireSkill(a.organization().toString(),id);}
            public String requireKnowledge(Actor a,String skill,String level){return skills.requireKnowledge(a.organization().toString(),skill,level);}

        };
    }
    @Bean Store questionBankStore(com.adaptlearngraph.repository.QuestionBankJpaRepository banks,com.adaptlearngraph.repository.ItemVersionJpaRepository items,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager manager,ObjectMapper json,
            com.adaptlearngraph.repository.AssessmentItemKnowledgeMappingJpaRepository mappings){
        return new com.adaptlearngraph.repository.JpaQuestionBankStore(banks,items,locks,new TransactionTemplate(manager),json,mappings);}
    @Bean com.adaptlearngraph.helper.ModelMapperRegistrar questionBankMappings() {
        return new com.adaptlearngraph.helper.QuestionBankMappings();
    }
    @Bean com.adaptlearngraph.services.QuestionBankApplicationService questionBankApplicationService(
            QuestionBankUseCase bank, org.modelmapper.ModelMapper modelMapper) {
        return new com.adaptlearngraph.services.QuestionBankApplicationService(bank, modelMapper);
    }
    @Bean QuestionBankUseCase questionBankUseCase(Actors actors,Catalog catalog,Store store,@Value("${question-bank.import.max-rows:500}") int rows,@Value("${question-bank.import.max-bytes:10485760}") long bytes){return new QuestionBankService(actors,catalog,store,Clock.systemUTC(),rows,bytes);}
    @Bean QuestionBankMailWorker questionBankMailWorker(com.adaptlearngraph.repository.QuestionBankJpaRepository notices,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager manager,TransactionalMailSender mail,
            @Value("${registration.public-base-url:http://localhost:8088}") String url){return new QuestionBankMailWorker(notices,new TransactionTemplate(manager),mail,url);}
}
