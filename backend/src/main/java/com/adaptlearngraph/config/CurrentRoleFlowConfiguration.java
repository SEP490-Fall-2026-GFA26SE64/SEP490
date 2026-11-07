package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.LocalDemoIdentity;
import com.adaptlearngraph.repository.AdaptiveAttemptContextPort;
import com.adaptlearngraph.repository.AdaptiveAttemptOutcomePort;
import com.adaptlearngraph.repository.AdaptiveAttemptStore;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintStore;
import com.adaptlearngraph.repository.AdaptiveSelectedRolePort;
import com.adaptlearngraph.repository.CurrentJobPositionProfile;
import com.adaptlearngraph.repository.CurrentRoleCatalog;
import com.adaptlearngraph.repository.CurrentRoleSelectionStore;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptOutcome;
import com.adaptlearngraph.services.RoleBaselineFlow;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** TMP-REQ002-13; current Employee routes only in the enabled local demo, no history import. */
@Configuration(proxyBeanMethods=false)
@Profile("local-baseline-demo & !workspace-baseline & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix="assessment.baseline.local-demo",name="enabled",havingValue="true")
@Import(PersistenceConfiguration.class)
public class CurrentRoleFlowConfiguration {
    @Bean CurrentRoleCatalog currentRoleCatalog(com.adaptlearngraph.repository.Neo4jCypher graph,ObjectMapper json) { return new CurrentRoleCatalog(graph,json,LocalDemoIdentity.ORG); }
    @Bean CurrentRoleSelectionStore currentRoleSelectionStore(org.springframework.beans.factory.BeanFactory beans,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks,ObjectMapper json,PlatformTransactionManager manager) {
        return new CurrentRoleSelectionStore(com.adaptlearngraph.repository.RoleSelectionRepositories.from(beans::getBean,locks),json,new TransactionTemplate(manager));
    }
    @Bean CurrentJobPositionProfile currentJobPositionProfile(com.adaptlearngraph.repository.EmployeeJobPositionProfileJpaRepository profiles,
            com.adaptlearngraph.repository.AuditEventJpaRepository audit,ObjectMapper json,AdaptiveAttemptStore attempts,AdaptiveBlueprintStore blueprints,AdaptiveBlueprintEligibilityPort eligibility) {
        return new CurrentJobPositionProfile(profiles,audit,json,attempts,blueprints,eligibility);
    }
    @Bean AdaptiveSelectedRolePort currentAdaptiveSelectedRole(CurrentRoleSelectionStore store,CurrentRoleCatalog catalog) {
        return (org,learner)-> {
            var selection=store.current(new RoleBaselineFlow.Actor(org,learner)).orElseThrow(()->new Failure(Code.SELECTION_UNAVAILABLE));
            try {
                var role=catalog.roles(org).stream().filter(r->r.id().equals(selection.role().id())).findFirst()
                        .orElseThrow(()->new Failure(Code.SELECTION_UNAVAILABLE));
                return new AdaptiveSelectedRolePort.Selected(role.id(),role.jobPositionId(),selection.revision());
            }catch(Failure e){throw e;}catch(RuntimeException e){throw new Failure(Code.DEPENDENCY_UNAVAILABLE);}
        };
    }
    @Bean RoleBaselineFlow currentRoleBaselineFlow(AdaptiveAttemptContextPort context,CurrentRoleCatalog catalog,
            CurrentRoleSelectionStore store,CurrentJobPositionProfile profile) {
        return new RoleBaselineFlow(()-> { var a=context.requireEmployee();return new RoleBaselineFlow.Actor(a.organizationId(),a.learnerId()); },catalog,store,profile);
    }
    @Bean @Primary AdaptiveAttemptOutcomePort demoProfileOutcome(org.springframework.beans.factory.BeanFactory beans,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks,ObjectMapper json,AdaptiveAttemptStore store,CurrentJobPositionProfile profiles) {
        var delegate=new JpaAdaptiveAttemptOutcome(com.adaptlearngraph.repository.AdaptiveAttemptRepositories.from(beans::getBean,locks),json,store);
        return completion->{delegate.persist(completion);profiles.initialize(completion);};
    }
}
