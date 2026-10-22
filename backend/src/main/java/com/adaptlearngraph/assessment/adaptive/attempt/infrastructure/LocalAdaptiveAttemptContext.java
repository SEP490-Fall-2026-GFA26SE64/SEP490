package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBaselineCatalogPort;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint;
import com.adaptlearngraph.assessment.adaptive.attempt.application.AdaptiveAttemptSnapshotResolver;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.AdaptiveAttemptContextPort;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.*;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** TMP-REQ002-08: explicit server-configured Employee, never client headers or production identity. */
public final class LocalAdaptiveAttemptContext implements AdaptiveAttemptContextPort {
    private final NamedParameterJdbcTemplate jdbc;
    private final java.util.function.Supplier<UUID> actor;
    private final UUID organizationId;
    private final Set<String> occupations;
    private final AdaptiveBaselineCatalogPort catalog;
    private final AdaptiveAttemptSnapshotResolver snapshots;
    public LocalAdaptiveAttemptContext(NamedParameterJdbcTemplate jdbc, UUID actorId, UUID organizationId,
            Set<String> occupations, AdaptiveBaselineCatalogPort catalog, AdaptiveAttemptSnapshotResolver snapshots) {
        this(() -> actorId, jdbc, organizationId, occupations, catalog, snapshots);
    }
    public LocalAdaptiveAttemptContext(java.util.function.Supplier<UUID> actor, NamedParameterJdbcTemplate jdbc, UUID organizationId,
            Set<String> occupations, AdaptiveBaselineCatalogPort catalog, AdaptiveAttemptSnapshotResolver snapshots) {
        this.jdbc = jdbc; this.actor = actor; this.organizationId = Objects.requireNonNull(organizationId);
        this.occupations = Set.copyOf(occupations); this.catalog = catalog; this.snapshots = snapshots;
    }
    @Override public Employee requireEmployee() {
        UUID actorId = actor.get();
        if (actorId == null) throw new Failure(Code.UNAUTHENTICATED);
        var accounts = jdbc.query("SELECT organization_id,active FROM platform.account WHERE account_id=:actor", Map.of("actor", actorId),
                (rs, row) -> new Object[]{rs.getObject(1, UUID.class), rs.getBoolean(2)});
        if (accounts.isEmpty()) throw new Failure(Code.UNAUTHENTICATED);
        var account = accounts.getFirst();
        boolean employee = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.account_role WHERE account_id=:actor AND role_code='EMPLOYEE')",
                Map.of("actor", actorId), Boolean.class));
        if (!Boolean.TRUE.equals(account[1]) || !organizationId.equals(account[0]) || !employee) throw new Failure(Code.FORBIDDEN);
        return new Employee(organizationId, actorId);
    }
    @Override public void authorizeScope(Employee employee, AdaptiveAttempt.Scope scope) {
        if (!organizationId.equals(employee.organizationId()) || !employee.organizationId().equals(scope.organizationId())
                || !employee.learnerId().equals(scope.learnerId()) || !occupations.contains(scope.occupationId())) throw new Failure(Code.FORBIDDEN);
    }
    @Override public AdaptiveAttempt.Scope resolveScope(Employee employee, StartTarget target) {
        String occupation = target instanceof Exploration exploration ? exploration.occupationId() : occupation(selection(employee).role());
        var scope = new AdaptiveAttempt.Scope(employee.organizationId(), employee.learnerId(), occupation);
        authorizeScope(employee, scope);
        return scope;
    }
    @Override public AdaptiveAttemptSnapshot resolveStartingSnapshot(AdaptiveAttempt.Scope scope, StartTarget target) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Attempt transaction required");
        authorizeScope(requireEmployee(), scope);
        var params = Map.of("actor", scope.learnerId(), "org", scope.organizationId(), "occupation", scope.occupationId());
        // REQ-001 serializes selection on learner_state; share lock keeps provenance stable until commit.
        var learners = jdbc.query("SELECT learner_id FROM platform.learner_state WHERE learner_id=:actor FOR SHARE", params,
                (rs, row) -> rs.getObject(1, UUID.class));
        if (learners.isEmpty()) throw new Failure(Code.SELECTION_UNAVAILABLE);
        Optional<String> role = Optional.empty(); Optional<Long> revision = Optional.empty();
        if (target instanceof SelectedRole) {
            var selected = selection(new Employee(scope.organizationId(), scope.learnerId()));
            if (!scope.occupationId().equals(occupation(selected.role()))) throw new Failure(Code.SELECTION_UNAVAILABLE);
            role = Optional.of(selected.role()); revision = Optional.of(selected.revision());
        }
        // Same scope key as management, shared until attempt/pool/first item/receipt commit.
        // Advisory coordination also covers an absent identity/activation row.
        jdbc.queryForObject("SELECT pg_advisory_xact_lock_shared(hashtextextended(:coordination,0))",
                Map.of("coordination", scope.organizationId() + "\n" + scope.occupationId()), (rs, row) -> true);
        jdbc.query("SELECT blueprint_id FROM platform.baseline_blueprint_activation WHERE organization_id=:org AND occupation_id=:occupation FOR SHARE",
                params, (rs, row) -> rs.getObject(1, UUID.class));
        return snapshots.resolve(scope, role, revision);
    }
    private Selection selection(Employee employee) {
        var rows = jdbc.query("""
                SELECT reference.entity_id,learner.target_revision FROM platform.target_selection selection
                JOIN platform.learner_state learner ON learner.learner_id=selection.learner_id
                JOIN platform.account actor ON actor.account_id=selection.learner_id
                JOIN platform.catalog_reference reference ON reference.catalog_ref_id=selection.role_ref_id AND reference.kind='TARGET_ROLE'
                WHERE selection.learner_id=:actor AND actor.organization_id=:org AND selection.ended_at IS NULL
                """, Map.of("actor", employee.learnerId(), "org", employee.organizationId()),
                (rs, row) -> new Selection(rs.getString(1), rs.getLong(2)));
        if (rows.size() != 1 || rows.getFirst().revision() < 1) throw new Failure(Code.SELECTION_UNAVAILABLE);
        return rows.getFirst();
    }
    private String occupation(String role) {
        var owners = occupations.stream().filter(id -> catalog.findAvailable(new AdaptiveBlueprint.Scope(organizationId, id))
                .filter(snapshot -> snapshot.roles().containsKey(role)).isPresent()).toList();
        if (owners.size() != 1) throw new Failure(Code.SELECTION_UNAVAILABLE);
        return owners.getFirst();
    }
    private record Selection(String role, long revision) {}
}
