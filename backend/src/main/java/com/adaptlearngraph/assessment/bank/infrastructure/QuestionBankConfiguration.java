package com.adaptlearngraph.assessment.bank.infrastructure;

import com.adaptlearngraph.assessment.bank.application.QuestionBankService;
import com.adaptlearngraph.assessment.bank.application.port.in.QuestionBankUseCase;
import com.adaptlearngraph.assessment.bank.application.port.out.QuestionBankPorts.*;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank.*;
import com.adaptlearngraph.subscription.application.port.out.*;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy;
import com.adaptlearngraph.shared.infrastructure.mail.TransactionalMailSender;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.util.*;
import org.neo4j.driver.Driver;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
public class QuestionBankConfiguration {
    @Bean Actors questionBankActors(SubscriptionIdentity identity,SubscriptionWorkspaceStore workspaces) {
        return ()->{var a=identity.current().actor();if(a.organizationId()==null||a.roles().size()!=1)throw new Failure(403,"Organization staff required");String role=a.roles().iterator().next().name();if(!Set.of("DOMAIN_EXPERT","LD_MANAGER").contains(role))throw new Failure(403,"Question Bank staff access required");workspaces.require(a,a.organizationId(),SubscriptionAccessPolicy.Action.WORKSPACE,Clock.systemUTC().instant());return new Actor(a.accountId(),a.organizationId(),role);};
    }
    @Bean Neo4jQuestionBankSkillReader questionBankSkillReader(Driver driver,@Value("${spring.data.neo4j.database:neo4j}") String database,@Value("${question-bank.catalog.timeout-ms:10000}") long timeout) {
        return new Neo4jQuestionBankSkillReader(driver,database,Duration.ofMillis(timeout));
    }
    @Bean Catalog questionBankCatalog(JdbcTemplate jdbc,Neo4jQuestionBankSkillReader skills) {
        return new Catalog(){
            private List<Choice> members(Actor a,String role) {return jdbc.query("""
                SELECT a.account_id,coalesce(p.full_name,a.identifier) AS name
                FROM platform.account a JOIN platform.organization_membership m USING(account_id)
                JOIN platform.organization_membership_role r USING(membership_id)
                LEFT JOIN platform.workspace_account_profile p USING(account_id)
                WHERE a.organization_id=? AND m.organization_id=? AND a.active AND m.active AND r.role_code=?
                ORDER BY name,a.account_id
                """,(rs,i)->new Choice(rs.getString(1),rs.getString(2)),a.organization(),a.organization(),role);}
            public List<Choice> experts(Actor a){return members(a,"DOMAIN_EXPERT");}
            public List<Choice> managers(Actor a){return members(a,"LD_MANAGER");}
            public void requireExpert(Actor a,UUID id){if(experts(a).stream().noneMatch(x->x.id().equals(id.toString())))throw new Failure(409,"Responsible Expert is not active in this organization");}
            public List<Choice> skills(Actor a){return skills.skills();}
            public String requireSkill(Actor a,String id){return skills.requireSkill(id);}

        };
    }
    @Bean Store questionBankStore(JdbcTemplate jdbc,PlatformTransactionManager manager,ObjectMapper json){return new JdbcQuestionBankStore(jdbc,new TransactionTemplate(manager),json);}
    @Bean QuestionBankUseCase questionBankUseCase(Actors actors,Catalog catalog,Store store,@Value("${question-bank.import.max-rows:500}") int rows,@Value("${question-bank.import.max-bytes:10485760}") long bytes){return new QuestionBankService(actors,catalog,store,Clock.systemUTC(),rows,bytes);}
    @Bean QuestionBankMailWorker questionBankMailWorker(JdbcTemplate jdbc,PlatformTransactionManager manager,TransactionalMailSender mail,
            @Value("${registration.public-base-url:http://localhost:8088}") String url){return new QuestionBankMailWorker(jdbc,new TransactionTemplate(manager),mail,url);}
}
