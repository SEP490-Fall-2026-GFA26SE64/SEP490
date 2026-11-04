package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.AdaptiveAttempt;
import com.adaptlearngraph.entities.domain.AdaptiveAttemptSnapshot;
import com.adaptlearngraph.entities.domain.AdaptiveBlueprint;
import com.adaptlearngraph.services.AdaptiveAttemptSnapshotResolver;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.*;
import java.util.*;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** TMP-REQ002-08: explicit server-configured Employee, never client headers or production identity. */
public final class LocalAdaptiveAttemptContext implements AdaptiveAttemptContextPort {
    private final AdaptiveAttemptContextJpaRepository identities;
    private final java.util.function.Supplier<UUID> actor;
    private final UUID organizationId;
    private final Set<String> jobPositions;
    private final AdaptiveBaselineCatalogPort catalog;
    private final AdaptiveAttemptSnapshotResolver snapshots;
    private com.adaptlearngraph.repository.AdaptiveSelectedRolePort currentRoles;
    private com.adaptlearngraph.repository.AdaptiveAttemptStore priorAttempts;
    private java.util.function.Predicate<AdaptiveAttempt.Scope> profileExists;
    private java.util.function.Supplier<Employee> authenticatedEmployee;
    public LocalAdaptiveAttemptContext(AdaptiveAttemptContextJpaRepository identities, UUID actorId, UUID organizationId,
            Set<String> jobPositions, AdaptiveBaselineCatalogPort catalog, AdaptiveAttemptSnapshotResolver snapshots) {
        this(() -> actorId, identities, organizationId, jobPositions, catalog, snapshots);
    }
    public LocalAdaptiveAttemptContext(java.util.function.Supplier<UUID> actor, AdaptiveAttemptContextJpaRepository identities, UUID organizationId,
            Set<String> jobPositions, AdaptiveBaselineCatalogPort catalog, AdaptiveAttemptSnapshotResolver snapshots) {
        this.identities = identities; this.actor = actor; this.organizationId = Objects.requireNonNull(organizationId);
        this.jobPositions = Set.copyOf(jobPositions); this.catalog = catalog; this.snapshots = snapshots;
    }
    public LocalAdaptiveAttemptContext(java.util.function.Supplier<UUID> actor, AdaptiveAttemptContextJpaRepository identities, UUID organizationId,
            Set<String> jobPositions, AdaptiveBaselineCatalogPort catalog, AdaptiveAttemptSnapshotResolver snapshots,
            com.adaptlearngraph.repository.AdaptiveSelectedRolePort currentRoles,
            com.adaptlearngraph.repository.AdaptiveAttemptStore priorAttempts,
            java.util.function.Predicate<AdaptiveAttempt.Scope> profileExists) {
        this(actor,identities,organizationId,jobPositions,catalog,snapshots);
        this.currentRoles=Objects.requireNonNull(currentRoles);this.priorAttempts=Objects.requireNonNull(priorAttempts);
        this.profileExists=Objects.requireNonNull(profileExists);
    }
    @Override public Employee requireEmployee() {
        if (authenticatedEmployee != null) {
            var employee = authenticatedEmployee.get();
            if (!organizationId.equals(employee.organizationId())) throw new Failure(Code.FORBIDDEN);
            return employee;
        }
        UUID actorId = actor.get();
        if (actorId == null) throw new Failure(Code.UNAUTHENTICATED);
        var accounts = identities.account(actorId);
        if (accounts.isEmpty()) throw new Failure(Code.UNAUTHENTICATED);
        var account = accounts.getFirst();
        boolean employee = identities.isEmployee(actorId);
        if (!Boolean.TRUE.equals(account.active()) || !organizationId.equals(account.organizationId()) || !employee) throw new Failure(Code.FORBIDDEN);
        return new Employee(organizationId, actorId);
    }
    public static LocalAdaptiveAttemptContext authenticated(java.util.function.Supplier<Employee> identity,
            AdaptiveAttemptContextJpaRepository identities, UUID organization, Set<String> jobPositions,
            AdaptiveBaselineCatalogPort catalog, AdaptiveAttemptSnapshotResolver snapshots,
            com.adaptlearngraph.repository.AdaptiveSelectedRolePort roles,
            com.adaptlearngraph.repository.AdaptiveAttemptStore attempts,
            java.util.function.Predicate<AdaptiveAttempt.Scope> profileExists) {
        var context = new LocalAdaptiveAttemptContext(() -> identity.get().learnerId(), identities, organization,
                jobPositions, catalog, snapshots, roles, attempts, profileExists);
        context.authenticatedEmployee = Objects.requireNonNull(identity);
        return context;
    }
    @Override public void authorizeScope(Employee employee, AdaptiveAttempt.Scope scope) {
        if (!organizationId.equals(employee.organizationId()) || !employee.organizationId().equals(scope.organizationId())
                || !employee.learnerId().equals(scope.learnerId()) || !jobPositions.contains(scope.jobPositionId())) throw new Failure(Code.FORBIDDEN);
    }
    @Override public AdaptiveAttempt.Scope resolveScope(Employee employee, StartTarget target) {
        if(currentRoles!=null) {
            if(!(target instanceof SelectedRole)) throw new Failure(Code.INVALID_REQUEST);
            var selected=currentRoles.current(employee.organizationId(),employee.learnerId());
            var scope=new AdaptiveAttempt.Scope(employee.organizationId(),employee.learnerId(),selected.jobPositionId());
            authorizeScope(employee,scope);return scope;
        }
        String jobPosition = target instanceof Exploration exploration ? exploration.jobPositionId() : jobPosition(selection(employee).role());
        var scope = new AdaptiveAttempt.Scope(employee.organizationId(), employee.learnerId(), jobPosition);
        authorizeScope(employee, scope);
        return scope;
    }
    @Override public AdaptiveAttemptSnapshot resolveStartingSnapshot(AdaptiveAttempt.Scope scope, StartTarget target) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Attempt transaction required");
        authorizeScope(requireEmployee(), scope);
        // REQ-001 serializes selection on learner_state; share lock keeps provenance stable until commit.
        var learners = identities.shareLockLearner(scope.learnerId());
        if (learners.isEmpty()) throw new Failure(Code.SELECTION_UNAVAILABLE);
        if(currentRoles!=null) {
            var selected=currentRoles.current(scope.organizationId(),scope.learnerId());
            if(!scope.jobPositionId().equals(selected.jobPositionId())) throw new Failure(Code.SELECTION_UNAVAILABLE);
            if(profileExists.test(scope)) throw new Failure(Code.ALLOWANCE_CLOSED);
            // Existing learners/replacement chains keep the original version and pool; never repin to a new activation.
            var prior=priorAttempts.findLatest(scope);
            if(prior.isPresent()) return prior.get().snapshot();
        }
        Optional<String> role = Optional.empty(); Optional<Long> revision = Optional.empty();
        if (target instanceof SelectedRole) {
            var selected = selection(new Employee(scope.organizationId(), scope.learnerId()));
            if (!scope.jobPositionId().equals(jobPosition(selected.role()))) throw new Failure(Code.SELECTION_UNAVAILABLE);
            role = Optional.of(selected.role()); revision = Optional.of(selected.revision());
        }
        // Same scope key as management, shared until attempt/pool/first item/receipt commit.
        // Advisory coordination also covers an absent identity/activation row.
        identities.shareLockScope(scope.organizationId() + "\n" + scope.jobPositionId());
        identities.shareLockActivation(scope.organizationId(), scope.jobPositionId());
        return snapshots.resolve(scope, role, revision);
    }
    private Selection selection(Employee employee) {
        if(currentRoles!=null) {
            var s=currentRoles.current(employee.organizationId(),employee.learnerId());return new Selection(s.roleId(),s.revision());
        }
        var rows = identities.currentSelection(employee.organizationId(), employee.learnerId()).stream()
                .map(row -> new Selection(row.roleId().toString(), row.targetRevision())).toList();
        if (rows.size() != 1 || rows.getFirst().revision() < 1) throw new Failure(Code.SELECTION_UNAVAILABLE);
        return rows.getFirst();
    }
    private String jobPosition(String role) {
        var owners = jobPositions.stream().filter(id -> catalog.findAvailable(new AdaptiveBlueprint.Scope(organizationId, id))
                .filter(snapshot -> snapshot.roles().containsKey(role)).isPresent()).toList();
        if (owners.size() != 1) throw new Failure(Code.SELECTION_UNAVAILABLE);
        return owners.getFirst();
    }
    private record Selection(String role, long revision) {}
}
