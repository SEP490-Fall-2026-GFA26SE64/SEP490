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
import com.adaptlearngraph.repository.JdbcAdaptiveAttemptContent;
import com.adaptlearngraph.repository.JdbcAdaptiveAttemptOutcome;
import com.adaptlearngraph.repository.JdbcAdaptiveAttemptResultQuery;
import com.adaptlearngraph.repository.JdbcAdaptiveAttemptScoring;
import com.adaptlearngraph.repository.JdbcAdaptiveAttemptStore;
import com.adaptlearngraph.repository.JdbcAdaptiveBlueprintEligibilityAdapter;
import com.adaptlearngraph.repository.JdbcAdaptiveBlueprintPreviewAdapter;
import com.adaptlearngraph.repository.JdbcAdaptiveBlueprintStore;
import com.adaptlearngraph.repository.JdbcAdaptiveTechnicalVersionStore;
import com.adaptlearngraph.repository.JdbcWorkspaceBaselineResourceWriter;
import com.adaptlearngraph.repository.LocalAdaptiveAttemptContext;
import com.adaptlearngraph.repository.MainDevelopmentTechnicalVersions;
import com.adaptlearngraph.repository.Neo4jAdaptiveBaselineCatalogAdapter;
import com.adaptlearngraph.repository.Neo4jWorkspaceBaselineOccupations;
import com.adaptlearngraph.repository.PinnedAdaptiveAttemptPolicyAdapter;
import com.adaptlearngraph.repository.SoftwareDevelopmentTechnicalVersions;
import com.adaptlearngraph.repository.WorkspaceBaselineOccupationPort;
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
import com.adaptlearngraph.entities.AdaptiveAttempt;
import com.adaptlearngraph.entities.AdaptiveAttemptSnapshot;
import com.adaptlearngraph.repository.CurrentOccupationProfile;
import com.adaptlearngraph.entities.AdaptiveBlueprint;
import com.adaptlearngraph.services.RoleBaselineFlow;
import com.adaptlearngraph.repository.CurrentRoleCatalog;
import com.adaptlearngraph.repository.CurrentRoleSelectionStore;
import com.adaptlearngraph.repository.SubscriptionIdentity;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore;
import com.adaptlearngraph.entities.SubscriptionAccessPolicy;
import com.adaptlearngraph.exception.SubscriptionFailure;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Duration;
import java.util.*;
import javax.sql.DataSource;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.core.env.Environment;
import static com.adaptlearngraph.constants.DevelopmentWorkspace.*;

@Configuration(proxyBeanMethods = false)
@Profile("workspace-baseline & local & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@org.springframework.context.annotation.Import(PersistenceConfiguration.class)
public class WorkspaceBaselineConfiguration {
    @Bean @org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean(com.adaptlearngraph.repository.CalibrationPorts.BankSource.class)
    @Profile("workspace-development")
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="workspace.development-fixtures.enabled",havingValue="true")
    com.adaptlearngraph.repository.CalibrationPorts.BankSource developmentCalibrationBanks(Environment environment) {
        return (grant,source)->{
            if(!enabled(environment))throw new com.adaptlearngraph.entities.Calibration.Failure(
                    com.adaptlearngraph.entities.Calibration.Code.NOT_READY);
            return com.adaptlearngraph.config.MainDevelopmentBankSeed.calibrationBank(grant,source);
        };
    }
    @Bean com.adaptlearngraph.helper.AssessmentPolicyJson assessmentPolicyJson(ObjectMapper json) {
        return new com.adaptlearngraph.helper.AssessmentPolicyJson(json);
    }
    @Bean com.adaptlearngraph.repository.AssessmentPolicyStore assessmentPolicyStore(
            com.adaptlearngraph.repository.AssessmentPolicyJpaRepository policies,
            com.adaptlearngraph.repository.AssessmentPolicyCommandJpaRepository commands,
            com.adaptlearngraph.repository.AssessmentPolicyActivationEventJpaRepository events,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager tx,
            com.adaptlearngraph.helper.AssessmentPolicyJson json) {
        return new com.adaptlearngraph.repository.JpaAssessmentPolicyStore(policies,commands,events,locks,tx,json);
    }
    @Bean com.adaptlearngraph.services.AssessmentPolicyService assessmentPolicyService(
            AdaptiveBlueprintActorPort actors,com.adaptlearngraph.repository.AssessmentPolicyStore store,
            com.adaptlearngraph.helper.AssessmentPolicyJson json) {
        return new com.adaptlearngraph.services.AssessmentPolicyService(actors,store,json);
    }
    @Bean WorkspaceCatalogFixture workspaceCatalogFixture(Environment environment,ObjectMapper json) {
        return WorkspaceCatalogFixture.load(environment,json);
    }
    @Bean SmartInitializingSingleton verifyWorkspaceDevelopmentCatalog(Driver driver,Environment environment) {
        return () -> {
            if(!enabled(environment)) return;
            try {
                var seed=java.nio.file.Files.readAllBytes(java.nio.file.Path.of(environment.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json")));
                com.adaptlearngraph.config.LocalCatalogBootstrap.forExistingDevelopment(driver,seed);
            } catch(java.io.IOException invalid) { throw new IllegalStateException("Exact sealed development catalog required",invalid); }
        };
    }
    private static boolean developmentBank(Environment environment,UUID organization,String occupation,UUID bank,WorkspaceCatalogFixture fixture) {
        return fixture.bank(organization,occupation).filter(value->value.bankId().equals(bank)).isPresent()
                || enabled(environment) && com.adaptlearngraph.config.MainDevelopmentBankSeed.catalog(organization,occupation)
                    && bank.equals(com.adaptlearngraph.config.MainDevelopmentBankSeed.bank(occupation))
                || catalog(enabled(environment),organization,occupation)
                && (OCCUPATION.equals(occupation) && com.adaptlearngraph.constants.LocalDemoIdentity.BANK.equals(bank)
                    || com.adaptlearngraph.config.SoftwareDevelopmentSeed.OCCUPATION.equals(occupation)
                    && com.adaptlearngraph.config.SoftwareDevelopmentSeed.id("bank").equals(bank));
    }
    @Bean WorkspaceBaselineOccupationPort workspaceBaselineOccupations(Driver driver,Environment environment) {
        return new Neo4jWorkspaceBaselineOccupations(driver,environment.getProperty("assessment.baseline.workspace.catalog.max-occupations",Integer.class,1000));
    }
    @Bean WorkspaceBaselineResources workspaceBaselineResources(DataSource source,WorkspaceBaselineOccupationPort occupations) {
        return new WorkspaceBaselineResources(new NamedParameterJdbcTemplate(source),occupations);
    }
    @Bean com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase workspaceResourceProvisioning(
            DataSource source, PlatformTransactionManager transactions, ObjectMapper json, AdaptiveBlueprintActorPort actors,
            AdaptiveBaselineCatalogPort catalog,AdaptiveTechnicalVersionPort technical,WorkspaceCatalogFixture fixture,WorkspaceBaselineResources resources) {
        return new com.adaptlearngraph.services.WorkspaceBaselineResourceService(actors,
                new JdbcWorkspaceBaselineResourceWriter(new NamedParameterJdbcTemplate(source),new TransactionTemplate(transactions),catalog,
                        technical,json,(scope,tuple)->fixture.bank(scope.organizationId(),scope.occupationId())
                                .filter(bank->bank.bankId().equals(tuple.bankId()) && bank.modelId().equals(tuple.modelId()) && bank.mappingId().equals(tuple.mappingId())).isPresent(),
                        scope->resources.owned(scope.organizationId(),scope.occupationId())));
    }
    @Bean AdaptiveBlueprintStore workspaceBlueprintStore(DataSource source, ObjectMapper json, PlatformTransactionManager transactions) {
        return new JdbcAdaptiveBlueprintStore(new NamedParameterJdbcTemplate(source), json, transactions, true);
    }
    @Bean AdaptiveTechnicalVersionPort workspaceTechnicalVersions(DataSource source,Environment environment,ObjectMapper json,WorkspaceCatalogFixture fixture) {
        AdaptiveTechnicalVersionPort delegate=new JdbcAdaptiveTechnicalVersionStore(new NamedParameterJdbcTemplate(source));
        if(enabled(environment))delegate=new MainDevelopmentTechnicalVersions(source,json,new DevelopmentTechnicalVersions(new SoftwareDevelopmentTechnicalVersions(source,json,delegate)));
        return fixture.active()?new WorkspaceFixtureTechnicalVersions(new NamedParameterJdbcTemplate(source),fixture,delegate):delegate;
    }
    @Bean @org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean(com.adaptlearngraph.repository.AuthoredCatalogPort.class)
    com.adaptlearngraph.repository.AuthoredCatalogPort workspaceAuthoredCatalog(Driver driver,ObjectMapper json,Environment environment) {
        return com.adaptlearngraph.repository.Neo4jAuthoredCatalog.configured(driver,json,environment);
    }
    @Bean AdaptiveBaselineCatalogPort workspaceBaselineCatalog(Driver driver, ObjectMapper json, WorkspaceBaselineResources resources,Environment environment,WorkspaceCatalogFixture fixture,
            com.adaptlearngraph.repository.AuthoredCatalogPort authored) {
        return scope -> {
            var occupations = resources.occupations(scope.organizationId());
            if (!occupations.contains(scope.occupationId())) return Optional.empty();
            if(authored.occupations(scope.organizationId()).contains(scope.occupationId()))
                return new AuthoredBaselineCatalog(authored,ignored->Optional.empty()).findAvailable(scope);
            return new Neo4jAdaptiveBaselineCatalogAdapter(driver, json, scope.organizationId(), occupations,
                    catalog(enabled(environment),scope.organizationId(),scope.occupationId())
                    || enabled(environment) && com.adaptlearngraph.config.MainDevelopmentBankSeed.catalog(scope.organizationId(),scope.occupationId())
                    || fixture.permits(scope.organizationId(),scope.occupationId())).findAvailable(scope)
                    .map(snapshot -> {
                        if(fixture.permits(scope.organizationId(),scope.occupationId()) && !fixture.matches(scope.organizationId(),scope.occupationId(),snapshot.fingerprint()))
                            throw new IllegalStateException("Workspace fixture catalog changed");
                        return snapshot;
                    });
        };
    }
    @Bean AdaptiveBlueprintEligibilityPort workspaceBlueprintEligibility(DataSource source, ObjectMapper json,
            WorkspaceBaselineResources resources, AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical,Environment environment,WorkspaceCatalogFixture fixture) {
        var jdbc = new NamedParameterJdbcTemplate(source);
        return new AdaptiveBlueprintEligibilityPort() {
            private Optional<JdbcAdaptiveBlueprintEligibilityAdapter> adapter(AdaptiveBlueprint.Scope scope) {
                return resources.find(scope.organizationId(), scope.occupationId()).filter(WorkspaceBaselineResources.Binding::ready)
                        .map(binding -> new JdbcAdaptiveBlueprintEligibilityAdapter(jdbc, catalog, technical, json, binding.settings(),
                                developmentBank(environment,scope.organizationId(),scope.occupationId(),binding.bankId(),fixture)));
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
            public Set<String> authorizedOccupations(Actor value) {
                var current = currentActor().orElseThrow();
                if (!current.equals(value)) return Set.of();
                return resources.configurableOccupations(value.organizationId());
            }
        };
    }
    @Bean WorkspaceBaselineCatalogUseCase workspaceBaselineDiscovery(AdaptiveBlueprintActorPort identity, WorkspaceBaselineResources resources) {
        return () -> resources.configurable(identity.currentActor().orElseThrow().organizationId()).stream()
                .map(binding -> new WorkspaceBaselineCatalogUseCase.Occupation(binding.occupationId(), binding.name())).toList();
    }
    @Bean AdaptiveBlueprintPreviewPort workspaceBlueprintPreview(DataSource source, ObjectMapper json, WorkspaceBaselineResources resources,Environment environment,WorkspaceCatalogFixture fixture) {
        return (scope, items) -> {
            var binding = resources.find(scope.organizationId(), scope.occupationId()).filter(WorkspaceBaselineResources.Binding::ready)
                    .orElseThrow(() -> new AdaptiveBlueprintEligibilityPort.DependencyUnavailable("Baseline resources are not configured", null));
            return new JdbcAdaptiveBlueprintPreviewAdapter(new NamedParameterJdbcTemplate(source), json, binding.bankId(),
                    developmentBank(environment,scope.organizationId(),scope.occupationId(),binding.bankId(),fixture)).read(scope, items);
        };
    }
    @Bean AdaptiveBlueprintUseCase workspaceBlueprintUseCase(AdaptiveBlueprintActorPort actor, AdaptiveBlueprintStore store,
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
    @Bean AdaptiveAttemptStore workspaceAttemptStore(DataSource source, ObjectMapper json, AdaptiveBlueprintStore blueprints,
            PlatformTransactionManager transactions) {
        return new JdbcAdaptiveAttemptStore(new NamedParameterJdbcTemplate(source), json, transactions, blueprints);
    }
    @Bean AdaptiveAttemptPolicyPort workspaceAttemptPolicy(AdaptiveTechnicalVersionPort technical) {
        return new PinnedAdaptiveAttemptPolicyAdapter(technical);
    }
    @Bean AdaptiveAttemptContentPort workspaceAttemptContent(DataSource source, WorkspaceBaselineResources resources,Environment environment,WorkspaceCatalogFixture fixture) {
        return (scope, item) -> {
            var bank=resources.itemBank(scope.organizationId(),item);
            return new JdbcAdaptiveAttemptContent(new NamedParameterJdbcTemplate(source),bank,
                    developmentBank(environment,scope.organizationId(),scope.occupationId(),bank,fixture)).read(scope,item);
        };
    }
    @Bean AdaptiveAttemptScoringPort workspaceAttemptScoring(DataSource source, WorkspaceBaselineResources resources,Environment environment,WorkspaceCatalogFixture fixture) {
        return (scope, item, option, presented) -> {
            var bank=resources.itemBank(scope.organizationId(),item);
            return new JdbcAdaptiveAttemptScoring(new NamedParameterJdbcTemplate(source),bank,
                    developmentBank(environment,scope.organizationId(),scope.occupationId(),bank,fixture)).correct(scope,item,option,presented);
        };
    }
    @Bean CurrentRoleSelectionStore workspaceRoleSelections(DataSource source, ObjectMapper json, PlatformTransactionManager transactions) {
        return new CurrentRoleSelectionStore(new NamedParameterJdbcTemplate(source), json, new TransactionTemplate(transactions));
    }
    @Bean RoleBaselineFlow.Catalog workspaceRoleCatalog(Driver driver, ObjectMapper json, WorkspaceBaselineResources resources,Environment environment,WorkspaceCatalogFixture fixture,
            com.adaptlearngraph.repository.AuthoredCatalogPort authored) {
        return organization -> {
            var occupations = resources.configurableOccupations(organization);
            if (occupations.isEmpty()) return List.of();
            boolean development=enabled(environment) && (ORGANIZATION.equals(organization) && Set.of(OCCUPATION,com.adaptlearngraph.config.SoftwareDevelopmentSeed.OCCUPATION).containsAll(occupations)
                    || com.adaptlearngraph.config.MainDevelopmentBankSeed.ORGANIZATION.equals(organization)
                    && com.adaptlearngraph.config.MainDevelopmentBankSeed.sourceCatalog(occupations));
            var roles=new CurrentRoleCatalog(driver, json, organization, occupations, development || fixture.covers(organization,occupations),authored).roles(organization);
            if(fixture.covers(organization,occupations) && roles.stream().anyMatch(role->!fixture.matches(organization,role.occupationId(),role.fingerprint())))
                throw new IllegalStateException("Workspace fixture catalog changed");
            return roles;
        };
    }
    @Bean CurrentOccupationProfile workspaceOccupationProfiles(DataSource source, ObjectMapper json,
            AdaptiveAttemptStore attempts, AdaptiveBlueprintStore blueprints, AdaptiveBlueprintEligibilityPort eligibility) {
        return new CurrentOccupationProfile(new NamedParameterJdbcTemplate(source), json, attempts, blueprints, eligibility);
    }
    @Bean AdaptiveSelectedRolePort workspaceSelectedRole(CurrentRoleSelectionStore store, RoleBaselineFlow.Catalog catalog) {
        return (organization, learner) -> {
            var selection = store.current(new RoleBaselineFlow.Actor(organization, learner))
                    .orElseThrow(() -> new AdaptiveAttemptUseCase.Failure(AdaptiveAttemptUseCase.Code.SELECTION_UNAVAILABLE));
            var role = catalog.roles(organization).stream().filter(value -> value.id().equals(selection.role().id())).findFirst()
                    .orElseThrow(() -> new AdaptiveAttemptUseCase.Failure(AdaptiveAttemptUseCase.Code.SELECTION_UNAVAILABLE));
            return new AdaptiveSelectedRolePort.Selected(role.id(), role.occupationId(), selection.revision());
        };
    }
    @Bean AdaptiveAttemptContextPort workspaceAttemptContext(DataSource source, SubscriptionIdentity identity,
            SubscriptionWorkspaceStore workspaces, WorkspaceBaselineResources resources, AdaptiveBaselineCatalogPort catalog,
            AdaptiveBlueprintStore blueprints, AdaptiveBlueprintEligibilityPort eligibility, AdaptiveTechnicalVersionPort technical,
            AdaptiveSelectedRolePort roles, AdaptiveAttemptStore attempts, CurrentOccupationProfile profiles,
            com.adaptlearngraph.repository.AssessmentPolicyStore assessmentPolicies) {
        var jdbc = new NamedParameterJdbcTemplate(source);
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
                return LocalAdaptiveAttemptContext.authenticated(this::requireEmployee, jdbc, employee.organizationId(),
                        resources.occupations(employee.organizationId()), catalog, snapshots, roles, attempts, profiles::exists);
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
    @Bean RoleBaselineFlow workspaceRoleFlow(AdaptiveAttemptContextPort identity, RoleBaselineFlow.Catalog catalog,
            CurrentRoleSelectionStore store, CurrentOccupationProfile profiles, AdaptiveBlueprintEligibilityPort eligibility) {
        return new RoleBaselineFlow(() -> {
            var actor = identity.requireEmployee();
            return new RoleBaselineFlow.Actor(actor.organizationId(), actor.learnerId());
        }, catalog, store, new WorkspaceBaselineProgress(profiles, eligibility));
    }
    @Bean AdaptiveAttemptOutcomePort workspaceAttemptOutcome(DataSource source, ObjectMapper json,
            AdaptiveAttemptStore attempts, CurrentOccupationProfile profiles) {
        var delegate = new JdbcAdaptiveAttemptOutcome(new NamedParameterJdbcTemplate(source), json, attempts);
        return completion -> { delegate.persist(completion); profiles.initialize(completion); };
    }
    @Bean AdaptiveAttemptFinalizationPort workspaceAttemptFinalization(AdaptiveAttemptStore store,
            AdaptiveAttemptPolicyPort policies, AdaptiveAttemptOutcomePort outcomes) {
        return new AdaptiveAttemptFinalizationService(store, policies, outcomes);
    }
    @Bean AdaptiveAttemptUseCase.StartRead workspaceAttemptStart(AdaptiveAttemptContextPort identity, AdaptiveAttemptStore store,
            AdaptiveAttemptPolicyPort policies, AdaptiveAttemptContentPort content) {
        return new AdaptiveAttemptStartService(identity, store, policies, content);
    }
    @Bean AdaptiveAttemptUseCase.Answering workspaceAttemptAnswer(AdaptiveAttemptContextPort identity, AdaptiveAttemptStore store,
            AdaptiveAttemptPolicyPort policies, AdaptiveAttemptContentPort content, AdaptiveAttemptScoringPort scoring,
            AdaptiveAttemptFinalizationPort finalization) {
        return new AdaptiveAttemptAnswerService(identity, store, policies, content, scoring, Optional.of(finalization));
    }
    @Bean AdaptiveAttemptUseCase.Submitting workspaceAttemptSubmit(AdaptiveAttemptContextPort identity, AdaptiveAttemptStore store,
            AdaptiveAttemptFinalizationPort finalization, AdaptiveAttemptContentPort content) {
        return new AdaptiveAttemptSubmitService(identity, store, finalization, content);
    }
    @Bean AdaptiveAttemptUseCase.Results workspaceAttemptResults(DataSource source, AdaptiveAttemptContextPort identity) {
        return new JdbcAdaptiveAttemptResultQuery(new NamedParameterJdbcTemplate(source), identity, true);
    }
    @Bean(destroyMethod = "shutdown") ThreadPoolTaskScheduler workspaceBaselineScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1); scheduler.setThreadNamePrefix("workspace-baseline-deadline-");
        return scheduler;
    }
    @Bean SmartInitializingSingleton workspaceBaselineDeadlines(DataSource source, AdaptiveAttemptStore attempts,
            AdaptiveAttemptFinalizationPort finalization, ThreadPoolTaskScheduler workspaceBaselineScheduler) {
        var jdbc = new NamedParameterJdbcTemplate(source);
        return () -> workspaceBaselineScheduler.scheduleWithFixedDelay(() -> {
            var organizations = jdbc.query("SELECT DISTINCT organization_id FROM platform.baseline_adaptive_attempt WHERE state='IN_PROGRESS'",
                    Map.of(), (rs, row) -> rs.getObject(1, UUID.class));
            for (var organization : organizations) new AdaptiveAttemptDeadlineWorker(attempts, finalization, organization, 10).run();
        }, Duration.ofSeconds(5));
    }
}
