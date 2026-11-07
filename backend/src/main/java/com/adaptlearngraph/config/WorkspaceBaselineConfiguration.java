package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.AdaptiveAttemptContentPort;
import com.adaptlearngraph.repository.AdaptiveAttemptContextPort;
import com.adaptlearngraph.repository.AdaptiveAttemptFinalizationPort;
import com.adaptlearngraph.repository.AdaptiveAttemptOutcomePort;
import com.adaptlearngraph.repository.AdaptiveAttemptPolicyPort;
import com.adaptlearngraph.repository.AdaptiveAttemptScoringPort;
import com.adaptlearngraph.repository.AdaptiveAttemptStore;
import com.adaptlearngraph.repository.AdaptiveBaselineCatalogPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintActorPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintPreviewPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintStore;
import com.adaptlearngraph.repository.AdaptiveSelectedRolePort;
import com.adaptlearngraph.repository.AdaptiveTechnicalVersionPort;
import com.adaptlearngraph.repository.AuthoredBaselineCatalog;
import com.adaptlearngraph.repository.DevelopmentTechnicalVersions;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptContent;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptOutcome;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptResultQuery;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptScoring;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptStore;
import com.adaptlearngraph.repository.AdaptiveAttemptContextJpaRepository;
import com.adaptlearngraph.repository.AdaptiveAttemptRepositories;
import com.adaptlearngraph.repository.BaselineAttemptResultJpaRepository;
import com.adaptlearngraph.repository.JpaAdaptiveBlueprintEligibilityAdapter;
import com.adaptlearngraph.repository.JpaAdaptiveBlueprintPreviewAdapter;
import com.adaptlearngraph.repository.JpaAdaptiveBlueprintStore;
import com.adaptlearngraph.repository.JpaWorkspaceBaselineResourceWriter;
import com.adaptlearngraph.repository.LocalAdaptiveAttemptContext;
import com.adaptlearngraph.repository.MainDevelopmentTechnicalVersions;
import com.adaptlearngraph.repository.Neo4jAdaptiveBaselineCatalogAdapter;
import com.adaptlearngraph.repository.Neo4jWorkspaceBaselineJobPositions;
import com.adaptlearngraph.repository.PinnedAdaptiveAttemptPolicyAdapter;
import com.adaptlearngraph.repository.SoftwareDevelopmentTechnicalVersions;
import com.adaptlearngraph.repository.WorkspaceBaselineJobPositionPort;
import com.adaptlearngraph.repository.WorkspaceBaselineProgress;
import com.adaptlearngraph.repository.WorkspaceBaselineResources;
import com.adaptlearngraph.repository.WorkspaceFixtureTechnicalVersions;
import com.adaptlearngraph.services.AdaptiveAttemptAnswerService;
import com.adaptlearngraph.services.AdaptiveAttemptDeadlineWorker;
import com.adaptlearngraph.services.AdaptiveAttemptFinalizationService;
import com.adaptlearngraph.services.AdaptiveAttemptSnapshotResolver;
import com.adaptlearngraph.services.AdaptiveAttemptStartService;
import com.adaptlearngraph.services.AdaptiveAttemptSubmitService;
import com.adaptlearngraph.services.AdaptiveBlueprintService;
import com.adaptlearngraph.services.AdaptiveBlueprintUseCase;
import com.adaptlearngraph.services.WorkspaceBaselineCatalogUseCase;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase;
import com.adaptlearngraph.entities.domain.AdaptiveAttempt;
import com.adaptlearngraph.entities.domain.AdaptiveAttemptSnapshot;
import com.adaptlearngraph.repository.CurrentJobPositionProfile;
import com.adaptlearngraph.entities.domain.AdaptiveBlueprint;
import com.adaptlearngraph.services.RoleBaselineFlow;
import com.adaptlearngraph.repository.CurrentRoleCatalog;
import com.adaptlearngraph.repository.CurrentRoleSelectionStore;
import com.adaptlearngraph.repository.SubscriptionIdentity;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy;
import com.adaptlearngraph.exception.SubscriptionFailure;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.core.env.Environment;
import static com.adaptlearngraph.constants.DevelopmentWorkspace.*;

@Configuration(proxyBeanMethods = false)
@Profile("workspace-baseline & local & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@org.springframework.context.annotation.Import({PersistenceConfiguration.class, ModelMapperConfiguration.class})
public class WorkspaceBaselineConfiguration {
    @Bean RoleBaselineFlow.Identity workspaceRuleIdentity(SubscriptionIdentity identity,SubscriptionWorkspaceStore workspaces) {
        return ()->{
            try {var current=actor(identity,workspaces,SubscriptionAccessPolicy.Role.EMPLOYEE);return new RoleBaselineFlow.Actor(current.organizationId(),current.accountId());}
            catch(SubscriptionFailure denied){boolean missing=denied.code()==SubscriptionFailure.Code.UNAUTHENTICATED;throw new RoleBaselineFlow.Failure(missing?401:403,missing?"UNAUTHENTICATED":"FORBIDDEN");}
            catch(com.adaptlearngraph.exception.RegistrationFailure denied){boolean missing=denied.code()==com.adaptlearngraph.exception.RegistrationFailure.Code.UNAUTHENTICATED;throw new RoleBaselineFlow.Failure(missing?401:403,missing?"UNAUTHENTICATED":"FORBIDDEN");}
        };
    }
    @Bean com.adaptlearngraph.services.RuleAssessmentAttemptService.Contexts workspaceKnowledgeContexts(
            CurrentRoleSelectionStore selections,RoleBaselineFlow.Catalog roles,com.adaptlearngraph.repository.Neo4jCypher graph,
            com.adaptlearngraph.repository.RuleAssessmentContextJpaRepository evidence,ObjectMapper json,Environment environment,
            org.springframework.beans.factory.ObjectProvider<com.adaptlearngraph.services.RequirementPathwayAccess> pathways) {
        return new com.adaptlearngraph.repository.CurrentRoleKnowledgeCatalog(selections,roles,graph,evidence,json,
                environment.getProperty("assessment.rule.max-groups",Integer.class,1000),step->{
                    try{pathways.getObject().requireAssessment(step);}
                    catch(com.adaptlearngraph.exception.InitialPathwayFailure denied){throw new com.adaptlearngraph.services.AssessmentPolicyService.Failure(denied.status(),denied.code());}
                });
    }
    @Bean com.adaptlearngraph.services.RuleAssessmentAttemptService workspaceRuleAttempts(
            RoleBaselineFlow.Identity identity,CurrentRoleSelectionStore selections,
            com.adaptlearngraph.services.RuleAssessmentAttemptService.Contexts contexts,
            com.adaptlearngraph.repository.RuleAssessmentAttemptJpaRepository attempts,
            com.adaptlearngraph.repository.AssessmentRulePolicyJpaRepository policies,
            com.adaptlearngraph.repository.ScopedAssessmentPolicyJpaRepository scopedPolicies,com.adaptlearngraph.repository.AssessmentPolicyCatalog policyCatalog,
            com.adaptlearngraph.repository.AssessmentItemKnowledgeMappingJpaRepository bank,
            com.adaptlearngraph.repository.OutboxEventJpaRepository outbox,com.adaptlearngraph.repository.PostgresAdvisoryLocks locks,
            com.adaptlearngraph.repository.ProcessingJobJpaRepository jobs,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager manager,
            ObjectMapper json,Environment environment,com.adaptlearngraph.repository.AuditEventJpaRepository audit) {
        return new com.adaptlearngraph.services.RuleAssessmentAttemptService(identity,selections,contexts,attempts,policies,scopedPolicies,policyCatalog,bank,outbox,jobs,locks,
                new TransactionTemplate(manager),json,environment.getProperty("assessment.rule.max-paper-items",Integer.class,1000),audit);
    }
    @Bean com.adaptlearngraph.services.RuleAssessmentOutcomeService workspaceRuleOutcomes(
            com.adaptlearngraph.repository.RuleAssessmentOutcomeJpaRepository effects,com.adaptlearngraph.repository.RuleAssessmentAttemptJpaRepository attempts,
            CurrentRoleSelectionStore selections,com.adaptlearngraph.repository.OutboxEventJpaRepository outbox,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager manager,ObjectMapper json,
            org.springframework.beans.factory.ObjectProvider<com.adaptlearngraph.services.RequirementPathwayRecalculationService> pathways,
            com.adaptlearngraph.repository.AuditEventJpaRepository audit) {
        return new com.adaptlearngraph.services.RuleAssessmentOutcomeService(effects,attempts,selections,outbox,new TransactionTemplate(manager),json,(attempt,event,groups)->{
            if("SKILL_ASSESSMENT".equals(attempt.getPurpose()))pathways.getObject().assessed(attempt,event,groups);
        },audit);
    }
    @Bean com.adaptlearngraph.services.RuleKnowledgeProfileService workspaceKnowledgeProfile(RoleBaselineFlow.Identity identity,
            com.adaptlearngraph.repository.RuleKnowledgeProfileJpaRepository data,ObjectMapper json) {
        return new com.adaptlearngraph.services.RuleKnowledgeProfileService(identity,data,json);
    }
    @Bean com.adaptlearngraph.repository.AssessmentPolicyCatalog assessmentPolicyCatalog(com.adaptlearngraph.repository.Neo4jCypher graph,ObjectMapper json) {
        return new com.adaptlearngraph.repository.Neo4jAssessmentPolicyCatalog(graph,json);
    }
    @Bean com.adaptlearngraph.services.ScopedAssessmentPolicyService assessmentRulePolicyService(
            SubscriptionIdentity identity,SubscriptionWorkspaceStore memberships,com.adaptlearngraph.repository.AssessmentPolicyCatalog catalog,
            com.adaptlearngraph.repository.ScopedAssessmentPolicyJpaRepository scopes,com.adaptlearngraph.repository.AssessmentRulePolicyJpaRepository policies,
            com.adaptlearngraph.repository.AssessmentItemKnowledgeMappingJpaRepository bank,com.adaptlearngraph.repository.PostgresAdvisoryLocks locks,ObjectMapper json,Environment environment,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager manager) {
        return new com.adaptlearngraph.services.ScopedAssessmentPolicyService(identity,memberships,catalog,scopes,policies,bank,locks,new TransactionTemplate(manager),json,
                environment.getProperty("assessment.rule.max-paper-items",Integer.class,1000));
    }
    // Retained legacy factories below are not registered in the rule-assessment workspace composition.
    com.adaptlearngraph.helper.ModelMapperRegistrar assessmentPolicyMappings() {
        return new com.adaptlearngraph.helper.AssessmentPolicyMappings();
    }
    com.adaptlearngraph.services.AssessmentPolicyApplicationService assessmentPolicyApplicationService(
            com.adaptlearngraph.services.AssessmentPolicyUseCase policies, org.modelmapper.ModelMapper modelMapper) {
        return new com.adaptlearngraph.services.AssessmentPolicyApplicationService(policies, modelMapper);
    }
    @Bean @org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean(com.adaptlearngraph.repository.CalibrationPorts.BankSource.class)
    @Profile("workspace-development")
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="workspace.development-fixtures.enabled",havingValue="true")
    com.adaptlearngraph.repository.CalibrationPorts.BankSource developmentCalibrationBanks(Environment environment) {
        return (grant,source)->{
            if(!enabled(environment))throw new com.adaptlearngraph.entities.domain.Calibration.Failure(
                    com.adaptlearngraph.entities.domain.Calibration.Code.NOT_READY);
            return com.adaptlearngraph.config.MainDevelopmentBankSeed.calibrationBank(grant,source);
        };
    }
    com.adaptlearngraph.helper.AssessmentPolicyJson assessmentPolicyJson(ObjectMapper json) {
        return new com.adaptlearngraph.helper.AssessmentPolicyJson(json);
    }
    com.adaptlearngraph.repository.AssessmentPolicyStore assessmentPolicyStore(
            com.adaptlearngraph.repository.AssessmentPolicyJpaRepository policies,
            com.adaptlearngraph.repository.AssessmentPolicyCommandJpaRepository commands,
            com.adaptlearngraph.repository.AssessmentPolicyActivationEventJpaRepository events,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager tx,
            com.adaptlearngraph.helper.AssessmentPolicyJson json) {
        return new com.adaptlearngraph.repository.JpaAssessmentPolicyStore(policies,commands,events,locks,tx,json);
    }
    com.adaptlearngraph.services.AssessmentPolicyService assessmentPolicyService(
            AdaptiveBlueprintActorPort actors,com.adaptlearngraph.repository.AssessmentPolicyStore store,
            com.adaptlearngraph.helper.AssessmentPolicyJson json) {
        return new com.adaptlearngraph.services.AssessmentPolicyService(actors,store,json);
    }
    @Bean WorkspaceCatalogFixture workspaceCatalogFixture(Environment environment,ObjectMapper json) {
        return WorkspaceCatalogFixture.load(environment,json);
    }
    SmartInitializingSingleton verifyWorkspaceDevelopmentCatalog(com.adaptlearngraph.repository.Neo4jCypher graph,Environment environment) {
        return () -> {
            if(!enabled(environment)) return;
            try {
                var seed=java.nio.file.Files.readAllBytes(java.nio.file.Path.of(environment.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json")));
                com.adaptlearngraph.config.LocalCatalogBootstrap.forExistingDevelopment(graph,seed);
            } catch(java.io.IOException invalid) { throw new IllegalStateException("Exact sealed development catalog required",invalid); }
        };
    }
    private static boolean developmentBank(Environment environment,UUID organization,String jobPosition,UUID bank,WorkspaceCatalogFixture fixture) {
        return fixture.bank(organization,jobPosition).filter(value->value.bankId().equals(bank)).isPresent()
                || enabled(environment) && com.adaptlearngraph.config.MainDevelopmentBankSeed.catalog(organization,jobPosition)
                    && bank.equals(com.adaptlearngraph.config.MainDevelopmentBankSeed.bank(jobPosition))
                || catalog(enabled(environment),organization,jobPosition)
                && (JOB_POSITION.equals(jobPosition) && com.adaptlearngraph.constants.LocalDemoIdentity.BANK.equals(bank)
                    || com.adaptlearngraph.config.SoftwareDevelopmentSeed.JOB_POSITION.equals(jobPosition)
                    && com.adaptlearngraph.config.SoftwareDevelopmentSeed.id("bank").equals(bank));
    }
    @Bean WorkspaceBaselineJobPositionPort workspaceBaselineJobPositions(com.adaptlearngraph.repository.Neo4jCypher graph,Environment environment) {
        return new Neo4jWorkspaceBaselineJobPositions(graph,environment.getProperty("assessment.baseline.workspace.catalog.max-jobPositions",Integer.class,1000));
    }
    @Bean WorkspaceBaselineResources workspaceBaselineResources(com.adaptlearngraph.repository.WorkspaceBaselineResourceJpaRepository bindings,WorkspaceBaselineJobPositionPort jobPositions) {
        return new WorkspaceBaselineResources(bindings,jobPositions);
    }
    com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase workspaceResourceProvisioning(
            com.adaptlearngraph.repository.WorkspaceBaselineResourceJpaRepository bindings, com.adaptlearngraph.repository.AuditEventJpaRepository audit,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks, com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions, PlatformTransactionManager transactions, ObjectMapper json, AdaptiveBlueprintActorPort actors,
            AdaptiveBaselineCatalogPort catalog,AdaptiveTechnicalVersionPort technical,WorkspaceCatalogFixture fixture,WorkspaceBaselineResources resources) {
        return new com.adaptlearngraph.services.WorkspaceBaselineResourceService(actors,
                new JpaWorkspaceBaselineResourceWriter(bindings,audit,locks,itemVersions,new TransactionTemplate(transactions),catalog,
                        technical,json,(scope,tuple)->fixture.bank(scope.organizationId(),scope.jobPositionId())
                                .filter(bank->bank.bankId().equals(tuple.bankId()) && bank.modelId().equals(tuple.modelId()) && bank.mappingId().equals(tuple.mappingId())).isPresent(),
                        scope->resources.owned(scope.organizationId(),scope.jobPositionId())));
    }
    AdaptiveBlueprintStore workspaceBlueprintStore(org.springframework.beans.factory.BeanFactory beans,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks, ObjectMapper json,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager transactions) {
        return new JpaAdaptiveBlueprintStore(com.adaptlearngraph.repository.AdaptiveBlueprintRepositories.from(beans::getBean, locks),
                json, transactions, true);
    }
    AdaptiveTechnicalVersionPort workspaceTechnicalVersions(com.adaptlearngraph.repository.DevelopmentTechnicalVersionJpaRepository developmentVersions,com.adaptlearngraph.repository.IrtTechnicalVersionJpaRepository irtVersions,Environment environment,ObjectMapper json,WorkspaceCatalogFixture fixture) {
        AdaptiveTechnicalVersionPort delegate=new com.adaptlearngraph.repository.JpaAdaptiveTechnicalVersionStore(irtVersions);
        if(enabled(environment))delegate=new MainDevelopmentTechnicalVersions(developmentVersions,json,new DevelopmentTechnicalVersions(new SoftwareDevelopmentTechnicalVersions(developmentVersions,json,delegate)));
        return fixture.active()?new WorkspaceFixtureTechnicalVersions(developmentVersions,fixture,delegate):delegate;
    }
    @Bean @org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean(com.adaptlearngraph.repository.AuthoredCatalogPort.class)
    com.adaptlearngraph.repository.AuthoredCatalogPort workspaceAuthoredCatalog(com.adaptlearngraph.repository.Neo4jCypher graph,ObjectMapper json,Environment environment) {
        return com.adaptlearngraph.repository.Neo4jAuthoredCatalog.configured(graph,json,environment);
    }
    AdaptiveBaselineCatalogPort workspaceBaselineCatalog(com.adaptlearngraph.repository.Neo4jCypher graph, ObjectMapper json, WorkspaceBaselineResources resources,Environment environment,WorkspaceCatalogFixture fixture,
            com.adaptlearngraph.repository.AuthoredCatalogPort authored) {
        return scope -> {
            var jobPositions = resources.jobPositions(scope.organizationId());
            if (!jobPositions.contains(scope.jobPositionId())) return Optional.empty();
            if(authored.jobPositions(scope.organizationId()).contains(scope.jobPositionId()))
                return new AuthoredBaselineCatalog(authored,ignored->Optional.empty()).findAvailable(scope);
            return new Neo4jAdaptiveBaselineCatalogAdapter(graph, json, scope.organizationId(), jobPositions,
                    catalog(enabled(environment),scope.organizationId(),scope.jobPositionId())
                    || enabled(environment) && com.adaptlearngraph.config.MainDevelopmentBankSeed.catalog(scope.organizationId(),scope.jobPositionId())
                    || fixture.permits(scope.organizationId(),scope.jobPositionId())).findAvailable(scope)
                    .map(snapshot -> {
                        if(fixture.permits(scope.organizationId(),scope.jobPositionId()) && !fixture.matches(scope.organizationId(),scope.jobPositionId(),snapshot.fingerprint()))
                            throw new IllegalStateException("Workspace fixture catalog changed");
                        return snapshot;
                    });
        };
    }
    AdaptiveBlueprintEligibilityPort workspaceBlueprintEligibility(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions, ObjectMapper json,
            WorkspaceBaselineResources resources, AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical,Environment environment,WorkspaceCatalogFixture fixture) {
        return new AdaptiveBlueprintEligibilityPort() {
            private Optional<JpaAdaptiveBlueprintEligibilityAdapter> adapter(AdaptiveBlueprint.Scope scope) {
                return resources.find(scope.organizationId(), scope.jobPositionId()).filter(WorkspaceBaselineResources.Binding::ready)
                        .map(binding -> new JpaAdaptiveBlueprintEligibilityAdapter(itemVersions, catalog, technical, json, binding.settings(),
                                developmentBank(environment,scope.organizationId(),scope.jobPositionId(),binding.bankId(),fixture)));
            }
            public Optional<Snapshot> resolve(AdaptiveBlueprint.Scope scope) {
                return adapter(scope).flatMap(value -> value.resolve(scope));
            }
            public Optional<Snapshot> resolvePinned(AdaptiveBlueprint.Scope scope, AdaptiveBlueprint.VersionPins pins) {
                return adapter(scope).flatMap(value -> value.resolvePinned(scope, pins));
            }
        };
    }
    private static SubscriptionAccessPolicy.Actor actor(SubscriptionIdentity identity, SubscriptionWorkspaceStore workspaces,
            SubscriptionAccessPolicy.Role role) {
        var actor = identity.current().actor();
        if (actor.organizationId() == null || !actor.roles().contains(role)) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN, "This baseline operation is not permitted for your role.");
        }
        workspaces.require(actor, actor.organizationId(), SubscriptionAccessPolicy.Action.WORKSPACE, Clock.systemUTC().instant());
        return actor;
    }
    @Bean AdaptiveBlueprintActorPort workspaceBlueprintActor(SubscriptionIdentity identity,
            SubscriptionWorkspaceStore workspaces, WorkspaceBaselineResources resources) {
        return new AdaptiveBlueprintActorPort() {
            public Optional<Actor> currentActor() {
                var principal = actor(identity, workspaces, SubscriptionAccessPolicy.Role.LD_MANAGER);
                return Optional.of(new Actor(principal.accountId(), principal.organizationId(), true, Set.of("LD_MANAGER")));
            }
            public Set<String> authorizedJobPositions(Actor value) {
                var current = currentActor().orElseThrow();
                if (!current.equals(value)) return Set.of();
                return resources.configurableJobPositions(value.organizationId());
            }
        };
    }
    @Bean WorkspaceBaselineCatalogUseCase workspaceBaselineDiscovery(AdaptiveBlueprintActorPort identity, WorkspaceBaselineResources resources) {
        return () -> resources.configurable(identity.currentActor().orElseThrow().organizationId()).stream()
                .map(binding -> new WorkspaceBaselineCatalogUseCase.JobPosition(binding.jobPositionId(), binding.name())).toList();
    }
    AdaptiveBlueprintPreviewPort workspaceBlueprintPreview(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions, ObjectMapper json, WorkspaceBaselineResources resources,Environment environment,WorkspaceCatalogFixture fixture) {
        return (scope, items) -> {
            var binding = resources.find(scope.organizationId(), scope.jobPositionId()).filter(WorkspaceBaselineResources.Binding::ready)
                    .orElseThrow(() -> new AdaptiveBlueprintEligibilityPort.DependencyUnavailable("Baseline resources are not configured", null));
            return new JpaAdaptiveBlueprintPreviewAdapter(itemVersions, json, binding.bankId(),
                    developmentBank(environment,scope.organizationId(),scope.jobPositionId(),binding.bankId(),fixture)).read(scope, items);
        };
    }
    AdaptiveBlueprintUseCase workspaceBlueprintUseCase(AdaptiveBlueprintActorPort actor, AdaptiveBlueprintStore store,
            AdaptiveBlueprintEligibilityPort eligibility, AdaptiveBlueprintPreviewPort preview,
            com.adaptlearngraph.repository.AssessmentPolicyStore policies) {
        return new AdaptiveBlueprintService(actor, store, eligibility, preview, Clock.systemUTC(),scope->{
            try { policies.requireEffective(scope.organizationId()); }
            catch(com.adaptlearngraph.services.AssessmentPolicyService.Failure failure) {
                if("ASSESSMENT_POLICY_UNAVAILABLE".equals(failure.code))
                    throw new AdaptiveBlueprintUseCase.Failure(AdaptiveBlueprintUseCase.Code.ASSESSMENT_POLICY_REQUIRED,
                            "Activate an organization Assessment Policy before activating this baseline",List.of());
                throw new AdaptiveBlueprintUseCase.Failure(AdaptiveBlueprintUseCase.Code.DEPENDENCY_UNAVAILABLE,
                        "Assessment policy could not be verified",List.of());
            }
        });
    }
    AdaptiveAttemptStore workspaceAttemptStore(org.springframework.beans.factory.BeanFactory beans,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks, ObjectMapper json, AdaptiveBlueprintStore blueprints,
            PlatformTransactionManager transactions) {
        return new JpaAdaptiveAttemptStore(AdaptiveAttemptRepositories.from(beans::getBean, locks), json, transactions, blueprints);
    }
    AdaptiveAttemptPolicyPort workspaceAttemptPolicy(AdaptiveTechnicalVersionPort technical) {
        return new PinnedAdaptiveAttemptPolicyAdapter(technical);
    }
    AdaptiveAttemptContentPort workspaceAttemptContent(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions, WorkspaceBaselineResources resources,Environment environment,WorkspaceCatalogFixture fixture) {
        return (scope, item) -> {
            var bank=resources.itemBank(scope.organizationId(),item);
            return new JpaAdaptiveAttemptContent(itemVersions,bank,
                    developmentBank(environment,scope.organizationId(),scope.jobPositionId(),bank,fixture)).read(scope,item);
        };
    }
    AdaptiveAttemptScoringPort workspaceAttemptScoring(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions, WorkspaceBaselineResources resources,Environment environment,WorkspaceCatalogFixture fixture) {
        return (scope, item, option, presented) -> {
            var bank=resources.itemBank(scope.organizationId(),item);
            return new JpaAdaptiveAttemptScoring(itemVersions,bank,
                    developmentBank(environment,scope.organizationId(),scope.jobPositionId(),bank,fixture)).correct(scope,item,option,presented);
        };
    }
    @Bean CurrentRoleSelectionStore workspaceRoleSelections(org.springframework.beans.factory.BeanFactory beans,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks, ObjectMapper json, PlatformTransactionManager transactions) {
        return new CurrentRoleSelectionStore(com.adaptlearngraph.repository.RoleSelectionRepositories.from(beans::getBean, locks), json,
                new TransactionTemplate(transactions));
    }
    @Bean RoleBaselineFlow.Catalog workspaceRoleCatalog(com.adaptlearngraph.repository.Neo4jCypher graph, ObjectMapper json, WorkspaceBaselineResources resources,Environment environment,WorkspaceCatalogFixture fixture,
            com.adaptlearngraph.repository.AuthoredCatalogPort authored) {
        return organization -> {
            var jobPositions = resources.configurableJobPositions(organization);
            if (jobPositions.isEmpty()) return List.of();
            boolean development=enabled(environment) && (ORGANIZATION.equals(organization) && Set.of(JOB_POSITION,com.adaptlearngraph.config.SoftwareDevelopmentSeed.JOB_POSITION).containsAll(jobPositions)
                    || com.adaptlearngraph.config.MainDevelopmentBankSeed.ORGANIZATION.equals(organization)
                    && com.adaptlearngraph.config.MainDevelopmentBankSeed.sourceCatalog(jobPositions));
            var roles=new CurrentRoleCatalog(graph, json, organization, jobPositions, development || fixture.covers(organization,jobPositions),authored).roles(organization);
            if(fixture.covers(organization,jobPositions) && roles.stream().anyMatch(role->!fixture.matches(organization,role.jobPositionId(),role.fingerprint())))
                throw new IllegalStateException("Workspace fixture catalog changed");
            return roles;
        };
    }
    CurrentJobPositionProfile workspaceJobPositionProfiles(com.adaptlearngraph.repository.EmployeeJobPositionProfileJpaRepository profiles,
            com.adaptlearngraph.repository.AuditEventJpaRepository audit, ObjectMapper json,
            AdaptiveAttemptStore attempts, AdaptiveBlueprintStore blueprints, AdaptiveBlueprintEligibilityPort eligibility) {
        return new CurrentJobPositionProfile(profiles, audit, json, attempts, blueprints, eligibility);
    }
    AdaptiveSelectedRolePort workspaceSelectedRole(CurrentRoleSelectionStore store, RoleBaselineFlow.Catalog catalog) {
        return (organization, learner) -> {
            var selection = store.current(new RoleBaselineFlow.Actor(organization, learner))
                    .orElseThrow(() -> new AdaptiveAttemptUseCase.Failure(AdaptiveAttemptUseCase.Code.SELECTION_UNAVAILABLE));
            var role = catalog.roles(organization).stream().filter(value -> value.id().equals(selection.role().id())).findFirst()
                    .orElseThrow(() -> new AdaptiveAttemptUseCase.Failure(AdaptiveAttemptUseCase.Code.SELECTION_UNAVAILABLE));
            return new AdaptiveSelectedRolePort.Selected(role.id(), role.jobPositionId(), selection.revision());
        };
    }
    AdaptiveAttemptContextPort workspaceAttemptContext(AdaptiveAttemptContextJpaRepository identities, SubscriptionIdentity identity,
            SubscriptionWorkspaceStore workspaces, WorkspaceBaselineResources resources, AdaptiveBaselineCatalogPort catalog,
            AdaptiveBlueprintStore blueprints, AdaptiveBlueprintEligibilityPort eligibility, AdaptiveTechnicalVersionPort technical,
            AdaptiveSelectedRolePort roles, AdaptiveAttemptStore attempts, CurrentJobPositionProfile profiles,
            com.adaptlearngraph.repository.AssessmentPolicyStore assessmentPolicies) {
        var snapshots = new AdaptiveAttemptSnapshotResolver(blueprints, eligibility, technical,org->{
            try{return assessmentPolicies.requireEffective(org);}
            catch(com.adaptlearngraph.services.AssessmentPolicyService.Failure missing){
                throw new AdaptiveAttemptUseCase.Failure(AdaptiveAttemptUseCase.Code.ASSESSMENT_POLICY_UNAVAILABLE);
            }
        });
        return new AdaptiveAttemptContextPort() {
            public Employee requireEmployee() {
                var principal = actor(identity, workspaces, SubscriptionAccessPolicy.Role.EMPLOYEE);
                return new Employee(principal.organizationId(), principal.accountId());
            }
            public void authorizeScope(Employee employee, AdaptiveAttempt.Scope scope) {
                if (!employee.equals(requireEmployee()) || !employee.organizationId().equals(scope.organizationId())
                        || !employee.learnerId().equals(scope.learnerId())) {
                    throw new AdaptiveAttemptUseCase.Failure(AdaptiveAttemptUseCase.Code.FORBIDDEN);
                }
            }
            private LocalAdaptiveAttemptContext delegate(Employee employee) {
                return LocalAdaptiveAttemptContext.authenticated(this::requireEmployee, identities, employee.organizationId(),
                        resources.jobPositions(employee.organizationId()), catalog, snapshots, roles, attempts, profiles::exists);
            }
            public AdaptiveAttempt.Scope resolveScope(Employee employee, AdaptiveAttemptUseCase.StartTarget target) {
                if (!employee.equals(requireEmployee())) throw new AdaptiveAttemptUseCase.Failure(AdaptiveAttemptUseCase.Code.FORBIDDEN);
                return delegate(employee).resolveScope(employee, target);
            }
            public AdaptiveAttemptSnapshot resolveStartingSnapshot(AdaptiveAttempt.Scope scope, AdaptiveAttemptUseCase.StartTarget target) {
                var employee = requireEmployee();
                authorizeScope(employee, scope);
                return delegate(employee).resolveStartingSnapshot(scope, target);
            }
        };
    }
    @Bean RoleBaselineFlow workspaceRoleFlow(RoleBaselineFlow.Identity identity, RoleBaselineFlow.Catalog catalog,
            CurrentRoleSelectionStore store,com.adaptlearngraph.services.RuleAssessmentAttemptService.Contexts contexts,
            com.adaptlearngraph.repository.RuleAssessmentAttemptJpaRepository attempts,
            com.adaptlearngraph.repository.ScopedAssessmentPolicyJpaRepository policies,com.adaptlearngraph.repository.RuleAssessmentOutcomeJpaRepository groups,ObjectMapper json) {
        return new RoleBaselineFlow(identity, catalog, store, new com.adaptlearngraph.repository.RuleBaselineProgress(store,contexts,attempts,policies,groups,json));
    }
    AdaptiveAttemptOutcomePort workspaceAttemptOutcome(org.springframework.beans.factory.BeanFactory beans,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks, ObjectMapper json,
            AdaptiveAttemptStore attempts, CurrentJobPositionProfile profiles) {
        var delegate = new JpaAdaptiveAttemptOutcome(AdaptiveAttemptRepositories.from(beans::getBean, locks), json, attempts);
        return completion -> { delegate.persist(completion); profiles.initialize(completion); };
    }
    AdaptiveAttemptFinalizationPort workspaceAttemptFinalization(AdaptiveAttemptStore store,
            AdaptiveAttemptPolicyPort policies, AdaptiveAttemptOutcomePort outcomes) {
        return new AdaptiveAttemptFinalizationService(store, policies, outcomes);
    }
    AdaptiveAttemptUseCase.StartRead workspaceAttemptStart(AdaptiveAttemptContextPort identity, AdaptiveAttemptStore store,
            AdaptiveAttemptPolicyPort policies, AdaptiveAttemptContentPort content) {
        return new AdaptiveAttemptStartService(identity, store, policies, content);
    }
    AdaptiveAttemptUseCase.Answering workspaceAttemptAnswer(AdaptiveAttemptContextPort identity, AdaptiveAttemptStore store,
            AdaptiveAttemptPolicyPort policies, AdaptiveAttemptContentPort content, AdaptiveAttemptScoringPort scoring,
            AdaptiveAttemptFinalizationPort finalization) {
        return new AdaptiveAttemptAnswerService(identity, store, policies, content, scoring, Optional.of(finalization));
    }
    AdaptiveAttemptUseCase.Submitting workspaceAttemptSubmit(AdaptiveAttemptContextPort identity, AdaptiveAttemptStore store,
            AdaptiveAttemptFinalizationPort finalization, AdaptiveAttemptContentPort content) {
        return new AdaptiveAttemptSubmitService(identity, store, finalization, content);
    }
    AdaptiveAttemptUseCase.Results workspaceAttemptResults(BaselineAttemptResultJpaRepository results, AdaptiveAttemptContextPort identity) {
        return new JpaAdaptiveAttemptResultQuery(results, identity, true);
    }
    @Bean(destroyMethod = "shutdown") @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
    ThreadPoolTaskScheduler workspaceBaselineScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1); scheduler.setThreadNamePrefix("workspace-baseline-deadline-");
        return scheduler;
    }
    @Bean @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
    SmartInitializingSingleton workspaceBaselineDeadlines(com.adaptlearngraph.services.RuleAssessmentAttemptService attempts,
            com.adaptlearngraph.services.RuleAssessmentOutcomeService outcomes,
            ThreadPoolTaskScheduler workspaceBaselineScheduler) {
        return () -> workspaceBaselineScheduler.scheduleWithFixedDelay(()->{attempts.expireDue();outcomes.runBatch();},Duration.ofSeconds(5));
    }
}
