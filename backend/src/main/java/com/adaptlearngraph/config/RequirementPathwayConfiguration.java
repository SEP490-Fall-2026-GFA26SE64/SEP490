package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.services.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Set;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Exclusive real workspace requirement flow. Configuration declares wiring only; no migration, seed or startup runner. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name={"pathway.initial.enabled","assessment.baseline.workspace.enabled"},havingValue="true")
public class RequirementPathwayConfiguration {
    @Bean InitialPathwayRepositories initialPathwayRepositories(BeanFactory beans){return InitialPathwayRepositories.from(beans::getBean);}
    @Bean Receipts initialReceipts(InitialPathwayReceiptJpaRepository data){return new JpaInitialReceipts(data);}
    @Bean Actors workspacePathwayActors(SubscriptionIdentity identity,SubscriptionWorkspaceStore workspaces){return new WorkspacePathwayActors(identity,workspaces);}
    @Bean ReviewAssignments initialAssignments(Neo4jCypher graph,InitialPathwayRepositories data,Environment env,CertificateSubmissionJpaRepository certificates){
        return new CatalogRoleReviewAssignments(graph,data,env.getProperty("pathway.initial.local-assignment.max-pathways",Integer.class,1000),Set.of(),certificates,env.getProperty("assessment.rule.catalog-timeout-seconds",Integer.class,5));
    }
    @Bean RulePathwayCatalog rulePathwayCatalog(Neo4jCypher graph,ModuleAuthoringPort modules,ObjectMapper json,Environment env){return new RulePathwayCatalog(graph,modules,json,env.getProperty("assessment.rule.catalog-timeout-seconds",Integer.class,5));}
    @Bean CertificateCatalogRepository certificateCatalogRepository(Neo4jCypher graph,ObjectMapper json,Environment env){return new CertificateCatalogRepository(graph,json,env.getProperty("assessment.rule.catalog-timeout-seconds",Integer.class,5));}
    @Bean CertificateCatalogService certificateCatalogService(Actors actors,CertificateCatalogRepository catalog){return new CertificateCatalogService(actors,catalog);}
    @Bean CertificateSubmissionService certificateSubmissionService(Actors actors,CurrentRoleSelectionStore selections,RequirementPathwayJpaRepository rules,
            RequirementPathwayRevisions revisions,RequirementPathwayAdmissionService admission,RequirementPathwayAccess access,RulePathwayCatalog catalog,
            CertificateSubmissionJpaRepository submissions,LearningContentPort content,LearningAssetPort files,Receipts receipts,ObjectMapper json){
        return new CertificateSubmissionService(actors,selections,rules,revisions,admission,access,catalog,submissions,content,files,receipts,json);
    }
    @Bean CertificateReviewService certificateReviewService(Actors actors,ReviewAssignments assignments,CurrentRoleSelectionStore selections,
            CertificateSubmissionJpaRepository submissions,CertificateSubmissionService views,RequirementPathwayJpaRepository rules,RequirementPathwayRevisions revisions,
            LearningContentPort content,LearningAssetPort files,Receipts receipts,OutboxEventJpaRepository outbox,RuleAssessmentAttemptJpaRepository clock,RuleAssessmentOutcomeJpaRepository effects,AuditEventJpaRepository audit){
        return new CertificateReviewService(actors,assignments,selections,submissions,views,rules,revisions,content,files,receipts,outbox,clock,effects,audit);
    }
    @Bean RequirementPathwayRevisions requirementPathwayRevisions(InitialPathwayRepositories data,RequirementPathwayJpaRepository rules,
            RuleAssessmentAttemptJpaRepository clock,ObjectMapper json){return new RequirementPathwayRevisions(data,rules,clock,json);}
    @Bean RequirementPathwayAdmissionService requirementPathwayAdmission(Actors actors,RoleBaselineFlow.Catalog roles,CurrentRoleSelectionStore selections,
            RulePathwayCatalog catalog,RequirementPathwayJpaRepository rules,InitialPathwayRepositories data,PathwayRequirementSnapshotJpaRepository snapshots,
            RuleAssessmentAttemptJpaRepository attempts,RuleAssessmentOutcomeJpaRepository groups,Receipts receipts,RequirementPathwayRevisions revisions,ObjectMapper json){
        return new RequirementPathwayAdmissionService(actors,roles,selections,catalog,rules,data,snapshots,attempts,groups,receipts,revisions,json);
    }
    @Bean RequirementPathwayGenerationService requirementPathwayGeneration(InitialPathwayRepositories data,RequirementPathwayJpaRepository rules,
            RequirementPathwayAdmissionService admission,RequirementPathwayRevisions revisions,CurrentRoleSelectionStore selections,RuleAssessmentAttemptJpaRepository clock,
            @Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager,Environment env){
        var settings=new RequirementPathwayGenerationService.Settings(Duration.ofMillis(Long.parseLong(InitialPathwayComponents.required(env,"worker.lease-ms"))),
                InitialPathwayComponents.integer(env,"worker.max-attempts"),Duration.ofMillis(Long.parseLong(InitialPathwayComponents.required(env,"worker.minimum-backoff-ms"))));
        return new RequirementPathwayGenerationService(data,rules,admission,revisions,selections,clock,new TransactionTemplate(manager),settings);
    }
    @Bean RequirementPathwayValidationService requirementPathwayValidation(RequirementPathwayAdmissionService admission,RequirementPathwayRevisions revisions,
            RequirementPathwayJpaRepository rules,RulePathwayCatalog catalog){return new RequirementPathwayValidationService(admission,revisions,rules,catalog);}
    @Bean RequirementPathwayPlanningService requirementPathwayPlanning(RulePathwayCatalog catalog,RequirementPathwayJpaRepository rules,
            RequirementPathwayAdmissionService admission,RequirementPathwayRevisions revisions,ObjectMapper json){return new RequirementPathwayPlanningService(catalog,rules,admission,revisions,json);}
    @Bean RequirementPathwayReviewService requirementPathwayReview(Actors actors,ReviewAssignments assignments,CurrentRoleSelectionStore selections,
            RequirementPathwayJpaRepository rules,InitialPathwayRepositories data,RequirementPathwayAdmissionService admission,RequirementPathwayRevisions revisions,
            RequirementPathwayValidationService validation,RulePathwayCatalog catalog,Receipts receipts,RuleAssessmentAttemptJpaRepository clock,RequirementPathwayPlanningService planning){
        return new RequirementPathwayReviewService(actors,assignments,selections,rules,data,admission,revisions,validation,catalog,receipts,clock,planning);
    }
    @Bean RequirementPathwayAccess requirementPathwayAccess(Actors actors,CurrentRoleSelectionStore selections,RequirementPathwayJpaRepository rules,
            RequirementPathwayRevisions revisions,RequirementPathwayAdmissionService admission,ReviewAssignments assignments,InitialPathwayRepositories data,
            RulePathwayCatalog catalog,ModuleAuthoringPort modules,ObjectMapper json){return new RequirementPathwayAccess(actors,selections,rules,revisions,admission,assignments,data,catalog,modules,json);}
    @Bean RequirementPathwayView requirementPathwayView(Actors actors,RequirementPathwayJpaRepository rules,RequirementPathwayRevisions revisions,
            RequirementPathwayAdmissionService admission,RequirementPathwayAccess access){return new RequirementPathwayView(actors,rules,revisions,admission,access);}
    @Bean RequirementPathwayRecalculationService requirementPathwayRecalculation(RequirementPathwayJpaRepository rules,RequirementPathwayRevisions revisions,
            RequirementPathwayPlanningService planning,RequirementPathwayReviewService review,ObjectMapper json){return new RequirementPathwayRecalculationService(rules,revisions,planning,review,json);}
    @Bean RequirementPathwayRefreshService requirementPathwayRefresh(RequirementPathwayRefreshJpaRepository jobs,RequirementPathwayJpaRepository rules,
            RequirementPathwayRevisions revisions,RequirementPathwayPlanningService planning,RequirementPathwayReviewService review,CurrentRoleSelectionStore selections,
            OutboxEventJpaRepository outbox,RuleAssessmentAttemptJpaRepository clock,@Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager){
        return new RequirementPathwayRefreshService(jobs,rules,revisions,planning,review,selections,outbox,clock,new TransactionTemplate(manager));
    }
    @Bean(name="requirementPathwayScheduler",destroyMethod="shutdown")
    @ConditionalOnProperty(name="pathway.initial.worker.enabled",havingValue="true")
    ThreadPoolTaskScheduler requirementPathwayScheduler(){var scheduler=new ThreadPoolTaskScheduler();scheduler.setPoolSize(1);scheduler.setThreadNamePrefix("requirement-pathway-");return scheduler;}
    @Bean(destroyMethod="close") @ConditionalOnProperty(name="pathway.initial.worker.enabled",havingValue="true")
    AutoCloseable requirementPathwayLoop(RequirementPathwayGenerationService generation,RequirementPathwayRefreshService refresh,
            @Qualifier("requirementPathwayScheduler") ThreadPoolTaskScheduler scheduler,Environment env){
        var interval=Duration.ofMillis(Long.parseLong(InitialPathwayComponents.required(env,"worker.poll-interval-ms")));
        if(interval.isZero() || interval.isNegative())throw new IllegalArgumentException("Positive dispatch interval required");
        var logger=org.slf4j.LoggerFactory.getLogger(RequirementPathwayConfiguration.class);
        var future=scheduler.scheduleWithFixedDelay(()->{
            try{generation.runOne();}catch(RuntimeException failure){logger.warn("Requirement dispatch needs recovery ({})",failure.getClass().getSimpleName());}
            try{refresh.runBatch();}catch(RuntimeException failure){logger.warn("Requirement refresh discovery needs recovery ({})",failure.getClass().getSimpleName());}
        },interval);
        return ()->future.cancel(false);
    }
}
