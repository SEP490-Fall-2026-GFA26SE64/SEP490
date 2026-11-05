package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.services.ModuleAuthoringService;
import java.math.BigDecimal;
import java.util.*;
import org.neo4j.driver.Driver;
import org.springframework.boot.*;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;

/** Opt-in, test-source-only runtime; genuine account sessions, production services and real stores. */
public final class SkillLearningTestRuntime {
    public static void main(String[] args) {
        if(!"true".equals(System.getenv("ISOLATED_SKILL_LEARNING_TEST")))throw new IllegalStateException("Explicit isolated runtime required");
        SpringApplication.run(new Class<?>[]{QuestionBankTestRuntime.RuntimeConfiguration.class,Fixtures.class},args);
    }
    public static class Fixtures {
        @Bean ApplicationRunner skillLearningFixtures(JdbcTemplate jdbc,PlatformTransactionManager manager,
                RegistrationSecrets secrets,Driver graph,ModuleAuthoringPort modules,LearningContentPort learning,ModuleAuthoringService authoring) {
            return args->{
                new QuestionBankTestRuntime.Fixtures().questionBankFixture(jdbc,manager,secrets,graph).run(args);
                String org=QuestionBankTestRuntime.id("A").toString();
                try(var session=graph.session()) {
                    session.run("MERGE (s:MicroSkill {id:'SKILL-OTHER'}) SET s.organizationId=$org,s.name='Other Skill',s.status='ACTIVE'",Map.of("org",org)).consume();
                }
                try {
                    for(int i=1;i<=3;i++) {
                        final int index=i;
                        as("expert",org,"EXPERT");
                        String title="Skill learning fixture "+index;
                        if(modules.documents(org).stream().anyMatch(d->d.current().payload().title().equals(title)))continue;
                        Content c=new Content("skill-learning-content-"+index,title,"# Learn SQL\nRead the fixture lesson and confirm completion.","text/markdown","1",List.of(),modules.actor().id(),java.time.Instant.now().toString());
                        modules.transaction(()->{modules.saveContent(org,c);return null;});
                        var d=authoring.create(new Save(title,"LESSON_AND_PRACTICE",c.id(),5,new BigDecimal("1000"),List.of(),List.of(new TeachingInput("QB-TEST-SQL"))));
                        d=authoring.action(d.id(),d.lockVersion(),"submit",null);
                        as("ld",org,"LD_MANAGER");d=authoring.action(d.id(),d.lockVersion(),"approve",null);
                        if(index==1) {
                            as("employee",org,"EMPLOYEE");final var first=d;
                            modules.transaction(()->{learning.admitSelfStudy(org,modules.actor().id(),first.id(),first.releasedRevision(),"QB-TEST-SQL");modules.pin(org,modules.actor().id(),first.id(),first.releasedRevision());return null;});
                        }
                    }
                } finally {SecurityContextHolder.clearContext();}
            };
        }
        private static void as(String persona,String org,String role) {
            var auth=new UsernamePasswordAuthenticationToken(QuestionBankTestRuntime.id("A"+persona).toString(),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)));
            auth.setDetails(Map.of("organizationId",org));SecurityContextHolder.getContext().setAuthentication(auth);
        }
    }
}
