package com.adaptlearngraph.assessment.adaptive.demo;

import com.adaptlearngraph.learning.application.RoleBaselineFlow;
import com.adaptlearngraph.learning.infrastructure.*;
import com.adaptlearngraph.assessment.adaptive.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.infrastructure.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import javax.sql.DataSource;
import org.neo4j.driver.Driver;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** TMP-REQ002-13; current Employee routes only in the enabled local demo, no history import. */
@Configuration(proxyBeanMethods=false)
@Profile("local-baseline-demo & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix="assessment.baseline.local-demo",name="enabled",havingValue="true")
public class CurrentRoleFlowConfiguration {
    @Bean CurrentRoleCatalog currentRoleCatalog(Driver driver,ObjectMapper json) { return new CurrentRoleCatalog(driver,json,LocalDemoIdentity.ORG); }
    @Bean CurrentRoleSelectionStore currentRoleSelectionStore(DataSource source,ObjectMapper json,PlatformTransactionManager manager) {
        return new CurrentRoleSelectionStore(new NamedParameterJdbcTemplate(source),json,new TransactionTemplate(manager));
    }
    @Bean CurrentOccupationProfile currentOccupationProfile(DataSource source,ObjectMapper json,AdaptiveAttemptStore attempts,AdaptiveBlueprintStore blueprints,AdaptiveBlueprintEligibilityPort eligibility) {
        return new CurrentOccupationProfile(new NamedParameterJdbcTemplate(source),json,attempts,blueprints,eligibility);
    }
    @Bean AdaptiveSelectedRolePort currentAdaptiveSelectedRole(CurrentRoleSelectionStore store,CurrentRoleCatalog catalog) {
        return (org,learner)-> {
            var selection=store.current(new RoleBaselineFlow.Actor(org,learner)).orElseThrow(()->new Failure(Code.SELECTION_UNAVAILABLE));
            try {
                var role=catalog.roles(org).stream().filter(r->r.id().equals(selection.role().id())).findFirst()
                        .orElseThrow(()->new Failure(Code.SELECTION_UNAVAILABLE));
                return new AdaptiveSelectedRolePort.Selected(role.id(),role.occupationId(),selection.revision());
            }catch(Failure e){throw e;}catch(RuntimeException e){throw new Failure(Code.DEPENDENCY_UNAVAILABLE);}
        };
    }
    @Bean RoleBaselineFlow currentRoleBaselineFlow(AdaptiveAttemptContextPort context,CurrentRoleCatalog catalog,
            CurrentRoleSelectionStore store,CurrentOccupationProfile profile) {
        return new RoleBaselineFlow(()-> { var a=context.requireEmployee();return new RoleBaselineFlow.Actor(a.organizationId(),a.learnerId()); },catalog,store,profile);
    }
    @Bean @Primary AdaptiveAttemptOutcomePort demoProfileOutcome(DataSource source,ObjectMapper json,AdaptiveAttemptStore store,CurrentOccupationProfile profiles) {
        var delegate=new JdbcAdaptiveAttemptOutcome(new NamedParameterJdbcTemplate(source),json,store);
        return completion->{delegate.persist(completion);profiles.initialize(completion);};
    }
}
