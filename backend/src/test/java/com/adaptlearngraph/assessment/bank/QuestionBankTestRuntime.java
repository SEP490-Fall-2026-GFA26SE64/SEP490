package com.adaptlearngraph.assessment.bank;

import com.adaptlearngraph.AdaptLearnGraphApplication;
import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.neo4j.driver.Driver;
import org.springframework.boot.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Isolated fixture runtime only; never packaged in the product jar. No public fixture endpoint. */
public final class QuestionBankTestRuntime {
    public static final String PASSWORD="question-bank-test-password";
    static UUID id(String name){return UUID.nameUUIDFromBytes(("QUESTION_BANK_TEST:"+name).getBytes(StandardCharsets.UTF_8));}
    public static void main(String[] args){if(!"true".equals(System.getenv("ISOLATED_QUESTION_BANK_TEST")))throw new IllegalStateException("Explicit isolated runtime required");SpringApplication.run(new Class<?>[]{RuntimeConfiguration.class,Fixtures.class},args);}
    @Configuration(proxyBeanMethods=false)
    @org.springframework.boot.autoconfigure.EnableAutoConfiguration
    @ComponentScan(basePackages="com.adaptlearngraph",excludeFilters={@ComponentScan.Filter(type=FilterType.REGEX,pattern=".*Test.*"),@ComponentScan.Filter(type=FilterType.ASSIGNABLE_TYPE,classes=AdaptLearnGraphApplication.class)})
    public static class RuntimeConfiguration {}
    @Configuration(proxyBeanMethods=false)
    public static class Fixtures {
        @Bean ApplicationRunner questionBankFixture(JdbcTemplate jdbc,PlatformTransactionManager manager,RegistrationSecrets secrets,Driver graph){return args->{
            if(!jdbc.queryForObject("SELECT current_database()",String.class).equals("question_bank_test"))throw new IllegalStateException("Refuse to seed any other database");
            var tx=new TransactionTemplate(manager);
            tx.executeWithoutResult(status->{for(String orgName:List.of("A","B")) {
                UUID org=id(orgName);if(jdbc.queryForObject("SELECT count(*) FROM platform.organization WHERE organization_id=?",Integer.class,org)>0)continue;
                jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,?,?)",org,"QB_TEST_"+orgName,"Question Bank Test "+orgName);
                UUID department=id(orgName+"department"),occupation=id(orgName+"occupation");
                jdbc.update("INSERT INTO platform.department_reference VALUES (?,?,'Test Department',true)",department,org);
                jdbc.update("INSERT INTO platform.occupation_department_reference VALUES (?,?,?,?,'Test Occupation',true)",occupation,id(orgName+"occupation-id"),org,department);
                for(String role:List.of("admin","expert","peer","ld","employee")){
                    String roleCode=switch(role){case "admin"->"ORGANIZATION_ADMINISTRATOR";case "ld"->"LD_MANAGER";case "employee"->"EMPLOYEE";default->"DOMAIN_EXPERT";};UUID account=id(orgName+role),membership=id(orgName+role+"membership");String email=role+orgName.toLowerCase(Locale.ROOT)+"@question-bank.test";
                    jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?,?)",account,org,email,email,secrets.hashPassword(PASSWORD));
                    jdbc.update("INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at) VALUES (?,?,now())",account,"Test "+orgName+" "+role);
                    jdbc.update("INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,department_id,occupation_reference_id,created_at,updated_at) VALUES (?,?,?,true,?,?,now(),now())",membership,account,org,department,occupation);jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?,?)",membership,roleCode);
                    if(role.equals("employee"))jdbc.update("INSERT INTO platform.learner_state(learner_id) VALUES (?)",account);
                }
                UUID admin=id(orgName+"admin"),registration=id(orgName+"registration"),intent=id(orgName+"intent"),order=id(orgName+"order"),subscription=id(orgName+"subscription");
                jdbc.update("INSERT INTO platform.organization_registration(registration_id,account_id,organization_name,workspace_slug,admin_name,state,email_verified_at,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,'REGISTERED',now(),now(),now(),now())",registration,admin,"Question Bank Test "+orgName,"question-bank-test-"+orgName.toLowerCase(Locale.ROOT),"Test administrator");
                jdbc.update("INSERT INTO platform.organization_workspace(workspace_id,organization_id,registration_id,slug,setup_state,created_at,ready_at) VALUES (?,?,?,?,'READY',now(),now())",id(orgName+"workspace"),org,registration,"question-bank-test-"+orgName.toLowerCase(Locale.ROOT));
                jdbc.update("INSERT INTO platform.subscription_intent(intent_id,kind,registration_id,owner_account_id,created_at,updated_at) VALUES (?,'PURCHASE',?,?,now(),now())",intent,registration,admin);
                jdbc.update("""
                    INSERT INTO platform.payment_order(order_id,intent_id,created_by,attempt,plan_id,plan_version_id,name,description,price_vnd,currency,duration_months,employee_seats,idempotency_key,request_digest,payment_status,observed_paid_amount,paid_at,created_at,expires_at)
                    VALUES (?,?,?,1,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic test plan','Isolated commercial fixture, not actual payment',4900000,'VND',1,20,?,?,'PAID',4900000,now(),now(),now()+interval '30 minutes')
                    """,order,intent,admin,id(orgName+"order-key"),"a".repeat(64));
                jdbc.update("INSERT INTO platform.subscription(subscription_id,organization_id,created_at) VALUES (?,?,now())",subscription,org);
                jdbc.update("INSERT INTO platform.subscription_period(period_id,subscription_id,order_id,starts_at,ends_at,billing_zone,anniversary_day,created_at) VALUES (?,?,?,now()-interval '1 day',now()+interval '30 days','Asia/Ho_Chi_Minh',1,now())",id(orgName+"period"),subscription,order);
            }});
            try(var session=graph.session()){session.executeWrite(t->t.run("MERGE (s:MicroSkill {id:'QB-TEST-SQL'}) SET s.name='Question Bank Test SQL',s.definition='Isolated fixture skill for authoring tests',s.version='1',s.status='ACTIVE',s.reviewStatus='APPROVED',s.reviewedBy=$reviewer,s.reviewedAt='2026-10-30T00:00:00Z'",Map.of("reviewer",id("Ald").toString())).consume());}
        };}
    }
}
