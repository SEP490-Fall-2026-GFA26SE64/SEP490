package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.AdaptiveBlueprintService;
import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase;
import com.adaptlearngraph.assessment.adaptive.application.port.in.WorkspaceBaselineCatalogUseCase;
import com.adaptlearngraph.assessment.adaptive.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttemptSnapshot;
import com.adaptlearngraph.assessment.adaptive.attempt.infrastructure.*;
import com.adaptlearngraph.assessment.adaptive.demo.CurrentOccupationProfile;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint;
import com.adaptlearngraph.learning.application.RoleBaselineFlow;
import com.adaptlearngraph.learning.infrastructure.CurrentRoleCatalog;
import com.adaptlearngraph.learning.infrastructure.CurrentRoleSelectionStore;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
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

@Configuration(proxyBeanMethods = false)
@Profile("workspace-baseline & local & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class WorkspaceBaselineConfiguration {
    @Bean WorkspaceBaselineResources workspaceBaselineResources(DataSource source) {
        return new WorkspaceBaselineResources(new NamedParameterJdbcTemplate(source));
    }
    @Bean AdaptiveBlueprintStore workspaceBlueprintStore(DataSource source, ObjectMapper json, PlatformTransactionManager transactions) {
        return new JdbcAdaptiveBlueprintStore(new NamedParameterJdbcTemplate(source), json, transactions);
    }
    @Bean AdaptiveTechnicalVersionPort workspaceTechnicalVersions(DataSource source) {
        return new JdbcAdaptiveTechnicalVersionStore(new NamedParameterJdbcTemplate(source));
    }
    @Bean AdaptiveBaselineCatalogPort workspaceBaselineCatalog(Driver driver, ObjectMapper json, WorkspaceBaselineResources resources) {
        return scope -> {
            var occupations = resources.occupations(scope.organizationId());
            if (!occupations.contains(scope.occupationId())) return Optional.empty();
            return new Neo4jAdaptiveBaselineCatalogAdapter(driver, json, scope.organizationId(), occupations).findAvailable(scope);
        };
    }
    @Bean AdaptiveBlueprintEligibilityPort workspaceBlueprintEligibility(DataSource source, ObjectMapper json,
            WorkspaceBaselineResources resources, AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical) {
        var jdbc = new NamedParameterJdbcTemplate(source);
        return new AdaptiveBlueprintEligibilityPort() {
            private Optional<JdbcAdaptiveBlueprintEligibilityAdapter> adapter(AdaptiveBlueprint.Scope scope) {
                return resources.find(scope.organizationId(), scope.occupationId()).filter(WorkspaceBaselineResources.Binding::ready)
                        .map(binding -> new JdbcAdaptiveBlueprintEligibilityAdapter(jdbc, catalog, technical, json, binding.settings()));
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
                return resources.occupations(value.organizationId());
            }
        };
    }
    @Bean WorkspaceBaselineCatalogUseCase workspaceBaselineDiscovery(AdaptiveBlueprintActorPort identity, WorkspaceBaselineResources resources) {
        return () -> resources.list(identity.currentActor().orElseThrow().organizationId()).stream()
                .map(binding -> new WorkspaceBaselineCatalogUseCase.Occupation(binding.occupationId(), binding.name())).toList();
    }
    @Bean AdaptiveBlueprintPreviewPort workspaceBlueprintPreview(DataSource source, ObjectMapper json, WorkspaceBaselineResources resources) {
        return (scope, items) -> {
            var binding = resources.find(scope.organizationId(), scope.occupationId()).filter(WorkspaceBaselineResources.Binding::ready)
                    .orElseThrow(() -> new AdaptiveBlueprintEligibilityPort.DependencyUnavailable("Baseline resources are not configured", null));
            return new JdbcAdaptiveBlueprintPreviewAdapter(new NamedParameterJdbcTemplate(source), json, binding.bankId()).read(scope, items);
        };
    }
    @Bean AdaptiveBlueprintUseCase workspaceBlueprintUseCase(AdaptiveBlueprintActorPort actor, AdaptiveBlueprintStore store,
            AdaptiveBlueprintEligibilityPort eligibility, AdaptiveBlueprintPreviewPort preview) {
        return new AdaptiveBlueprintService(actor, store, eligibility, preview, Clock.systemUTC());
    }
    @Bean AdaptiveAttemptStore workspaceAttemptStore(DataSource source, ObjectMapper json, AdaptiveBlueprintStore blueprints,
            PlatformTransactionManager transactions) {
        return new JdbcAdaptiveAttemptStore(new NamedParameterJdbcTemplate(source), json, transactions, blueprints);
    }
    @Bean AdaptiveAttemptPolicyPort workspaceAttemptPolicy(AdaptiveTechnicalVersionPort technical) {
        return new PinnedAdaptiveAttemptPolicyAdapter(technical);
    }
    @Bean AdaptiveAttemptContentPort workspaceAttemptContent(DataSource source, WorkspaceBaselineResources resources) {
        return (scope, item) -> new JdbcAdaptiveAttemptContent(new NamedParameterJdbcTemplate(source),
                resources.itemBank(scope.organizationId(), item)).read(scope, item);
    }
    @Bean AdaptiveAttemptScoringPort workspaceAttemptScoring(DataSource source, WorkspaceBaselineResources resources) {
        return (scope, item, option, presented) -> new JdbcAdaptiveAttemptScoring(new NamedParameterJdbcTemplate(source),
                resources.itemBank(scope.organizationId(), item)).correct(scope, item, option, presented);
    }
    @Bean CurrentRoleSelectionStore workspaceRoleSelections(DataSource source, ObjectMapper json, PlatformTransactionManager transactions) {
        return new CurrentRoleSelectionStore(new NamedParameterJdbcTemplate(source), json, new TransactionTemplate(transactions));
    }
    @Bean RoleBaselineFlow.Catalog workspaceRoleCatalog(Driver driver, ObjectMapper json, WorkspaceBaselineResources resources) {
        return organization -> {
            var occupations = resources.occupations(organization);
            if (occupations.isEmpty()) return List.of();
            return new CurrentRoleCatalog(driver, json, organization, occupations, false).roles(organization);
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
            AdaptiveSelectedRolePort roles, AdaptiveAttemptStore attempts, CurrentOccupationProfile profiles) {
        var jdbc = new NamedParameterJdbcTemplate(source);
        var snapshots = new AdaptiveAttemptSnapshotResolver(blueprints, eligibility, technical);
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
            CurrentRoleSelectionStore store, CurrentOccupationProfile profiles) {
        return new RoleBaselineFlow(() -> {
            var actor = identity.requireEmployee();
            return new RoleBaselineFlow.Actor(actor.organizationId(), actor.learnerId());
        }, catalog, store, profiles);
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
