package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.domain.MemberProfileUpdate;
import com.adaptlearngraph.entities.OrganizationMembershipRoleEntity;
import com.adaptlearngraph.entities.domain.PlanTerms;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Action;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Actor;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.exception.SubscriptionFailure;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.transaction.support.TransactionTemplate;

/** JPA adapter for {@link SubscriptionWorkspaceStore}; all organization data is read and written by organization id. */
public final class JpaSubscriptionWorkspaceStore implements SubscriptionWorkspaceStore {
    private final SubscriptionRepositories data;
    private final JpaMemberReferenceValidator references;
    private final TransactionTemplate transactions;
    private final boolean developmentFixtures;

    public JpaSubscriptionWorkspaceStore(SubscriptionRepositories data, TransactionTemplate transactions) {
        this(data, transactions, false);
    }

    public JpaSubscriptionWorkspaceStore(SubscriptionRepositories data, TransactionTemplate transactions, boolean developmentFixtures) {
        this.data = data;
        this.references = new JpaMemberReferenceValidator(data.references());
        this.transactions = transactions;
        this.developmentFixtures = developmentFixtures;
    }

    @Override
    public void require(Actor actor, UUID organizationId, Action action, Instant now) {
        var actual = currentActor(actor);
        if (action == Action.SUSPENSION || action == Action.PLAN_CONFIGURATION) {
            if (!SubscriptionAccessPolicy.permits(actual, action, organizationId, false, false, false)) throw forbidden();
            return;
        }
        var state = data.organizations().access(organizationId, now).orElseThrow(JpaSubscriptionWorkspaceStore::forbidden);
        // Explicit development grant, never a fabricated paid order/period or a billing privilege.
        boolean developmentGrant = developmentFixtures && action == Action.WORKSPACE
                && com.adaptlearngraph.constants.DevelopmentWorkspace.ORGANIZATION.equals(organizationId)
                && Set.of("employee", "employee-se", "expert", "ld").stream().map(com.adaptlearngraph.constants.DevelopmentWorkspace::id)
                    .anyMatch(actual.accountId()::equals);
        if (!SubscriptionAccessPolicy.permits(actual, action, organizationId, "READY".equals(state.setupState()),
                "SUSPENDED".equals(state.status()), Boolean.TRUE.equals(state.paid()) || developmentGrant)) throw forbidden();
    }

    private Actor currentActor(Actor actor) {
        if (actor == null) throw forbidden();
        var account = data.memberships().actor(actor.accountId()).orElseThrow(JpaSubscriptionWorkspaceStore::forbidden);
        Set<Role> roles = new HashSet<>();
        if (account.membershipId() != null) {
            data.roles().roleCodesOf(account.membershipId()).forEach(role -> roles.add(Role.valueOf(role)));
        }
        if (data.platformAdministrators().existsByAccountId(actor.accountId())) roles.add(Role.PLATFORM_ADMINISTRATOR);
        return new Actor(actor.accountId(), account.organizationId(), Boolean.TRUE.equals(account.accountActive()),
                Boolean.TRUE.equals(account.membershipActive()), roles, actor.mfaVerified(), actor.mfaRequired());
    }

    @Override
    public Summary summary(UUID organizationId, Instant now) {
        var periods = data.subscriptions().openPeriods(organizationId, now).stream()
                .map(row -> new PaidPeriod(row.periodId(), row.startsAt(), row.endsAt(), new PlanTerms(row.name(), row.description(),
                        row.priceVnd(), row.currency(), row.durationMonths(), row.employeeSeats()))).toList();
        PaidPeriod current = periods.stream().filter(p -> !p.startsAt().isAfter(now)).findFirst().orElse(null);
        PaidPeriod next = periods.stream().filter(p -> p.startsAt().isAfter(now)).findFirst().orElse(null);
        int allocated = current == null ? 0 : current.terms().employeeSeats();
        Integer pending = data.orders().pendingSeats(organizationId);
        int limit = SubscriptionAccessPolicy.admissionLimit(allocated, pending, next == null ? null : next.terms().employeeSeats());
        int used = used(organizationId);
        var history = data.orders().historyOf(organizationId).stream().map(PaymentOrderJpaRepository.Row::order).toList();
        String status = data.organizations().status(organizationId).orElseThrow(() -> new org.springframework.dao.EmptyResultDataAccessException(1));
        String name = data.organizations().name(organizationId).orElseThrow(() -> new org.springframework.dao.EmptyResultDataAccessException(1));
        return new Summary(organizationId, name, status, current == null ? "EXPIRED" : "ACTIVE", current, next, used, allocated, limit, history);
    }

    @Override
    public Setup setup(UUID registrationId) {
        return data.workspaces().setupOf(registrationId)
                .map(row -> new Setup(row.organizationId(), row.setupState(), row.readyAt(), row.failureCode()))
                .orElse(new Setup(null, "NOT_STARTED", null, null));
    }

    @Override
    public List<Workspace> workspaces() {
        return data.organizations().withWorkspaces().stream()
                .map(row -> new Workspace(row.organizationId(), row.name(), row.status(), row.setupState())).toList();
    }

    @Override
    public void suspend(Actor actor, UUID organizationId, boolean suspended, Instant now) {
        transactions.executeWithoutResult(tx -> {
            lock(organizationId);
            require(actor, organizationId, Action.SUSPENSION, now);
            data.organizations().setStatus(organizationId, suspended ? "SUSPENDED" : "ACTIVE");
            audit(actor.accountId(), suspended ? "WORKSPACE_SUSPENDED" : "WORKSPACE_REACTIVATED", organizationId, now);
        });
    }

    @Override
    public List<Member> members(UUID organizationId) {
        Map<UUID, Set<String>> roles = new HashMap<>();
        for (OrganizationMembershipRoleEntity role : data.roles().rolesInOrganization(organizationId)) {
            roles.computeIfAbsent(role.getMembershipId(), id -> new HashSet<>()).add(role.getRoleCode());
        }
        return data.memberships().members(organizationId).stream().map(row -> new Member(row.membershipId(), row.accountId(),
                row.fullName(), row.email(), Boolean.TRUE.equals(row.active()), roles.getOrDefault(row.membershipId(), Set.of()),
                row.departmentId(), row.jobPositionReferenceId(), row.revision(), row.departmentName(), row.jobPositionName(),
                Boolean.TRUE.equals(row.accountActive()))).toList();
    }

    @Override
    public Member updateMember(Actor actor, UUID organizationId, UUID memberId, MemberProfileUpdate update, Instant now) {
        return transactions.execute(tx -> {
            lock(organizationId);
            require(actor, organizationId, Action.BILLING_READ, now);
            require(actor, organizationId, Action.WORKSPACE, now);
            Member member = members(organizationId).stream().filter(value -> value.membershipId().equals(memberId))
                    .findFirst().orElseThrow(JpaSubscriptionWorkspaceStore::forbidden);
            if (member.revision() != update.revision()) throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,
                    "Membership changed. Refresh and retry.");
            boolean historical = java.util.Objects.equals(member.departmentId(), update.departmentId())
                    && java.util.Objects.equals(member.jobPositionReferenceId(), update.jobPositionReferenceId())
                    && (!update.roles().contains("EMPLOYEE") || member.roles().contains("EMPLOYEE"));
            references.validate(organizationId, update.roles(), update.departmentId(), update.jobPositionReferenceId(), update.departmentName(), update.jobPositionName(), historical);
            data.memberships().assignReferences(organizationId, memberId, update.departmentId(), update.jobPositionReferenceId());
            // Reuse the serialized role, last-administrator, revision and capacity checks in the same transaction.
            changeMember(actor, organizationId, memberId, member.active(), update.roles(), update.revision(), now);
            if (data.profiles().upsertFullName(member.accountId(), update.fullName()) != 1) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT, "The account does not have a verified workspace profile.");
            }
            audit(actor.accountId(), "MEMBER_PROFILE_UPDATED", memberId, now);
            return members(organizationId).stream().filter(value -> value.membershipId().equals(memberId)).findFirst().orElseThrow();
        });
    }

    @Override
    public void changeMember(Actor actor, UUID organizationId, UUID memberId, boolean active, Set<String> roles, long revision, Instant now) {
        if (roles == null || roles.size() != 1 || roles.stream().anyMatch(java.util.Objects::isNull)
                || !Set.of("EMPLOYEE", "LD_MANAGER", "DOMAIN_EXPERT", "ORGANIZATION_ADMINISTRATOR").containsAll(roles)) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, "Select exactly one organization role.", "roles");
        }
        transactions.executeWithoutResult(tx -> {
            lock(organizationId);
            require(actor, organizationId, Action.BILLING_READ, now);
            var member = members(organizationId).stream().filter(m -> m.membershipId().equals(memberId)).findFirst()
                    .orElseThrow(JpaSubscriptionWorkspaceStore::forbidden);
            if (member.revision() != revision) throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT, "Membership changed. Refresh and retry.");
            boolean reducing = (!active && member.active() && roles.equals(member.roles()))
                    || (active == member.active() && member.roles().containsAll(roles) && !roles.equals(member.roles()));
            require(actor, organizationId, reducing ? Action.SEAT_REDUCTION : Action.WORKSPACE, now);
            if (member.active() && member.roles().contains("ORGANIZATION_ADMINISTRATOR")
                    && (!active || !roles.contains("ORGANIZATION_ADMINISTRATOR"))) {
                if (data.memberships().activeAdministrators(organizationId) <= 1) {
                    throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT, "The last active System Administrator cannot be removed.");
                }
            }
            if (roles.contains("EMPLOYEE") && (member.departmentId() == null || member.jobPositionReferenceId() == null)) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.REFERENCE_DATA_REQUIRED, "Employee department and jobPosition are required.");
            }
            boolean accountActive = data.accounts().active(member.accountId()).orElse(false);
            boolean wasSeat = accountActive && member.active() && member.roles().contains("EMPLOYEE");
            boolean newSeat = accountActive && active && roles.contains("EMPLOYEE");
            if (newSeat && !wasSeat && used(organizationId) >= summary(organizationId, now).admissionLimit()) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.CAPACITY_EXCEEDED, "No Employee seat is available.");
            }
            data.memberships().changeActive(organizationId, memberId, active, now);
            data.roles().deleteOf(memberId);
            data.roles().insertAll(roles.stream().map(role -> new OrganizationMembershipRoleEntity(memberId, role)).toList());
            if (roles.contains("EMPLOYEE")) data.learners().insertIfAbsent(member.accountId());
            audit(actor.accountId(), "MEMBERSHIP_CHANGED", memberId, now);
        });
    }

    int used(UUID organization) {
        return Math.toIntExact(data.memberships().usedSeats(organization));
    }

    private void lock(UUID organization) {
        if (data.organizations().lock(organization).isEmpty()) throw forbidden();
    }

    private void audit(UUID actor, String action, UUID resource, Instant now) {
        data.audit().insert(new AuditEventEntity(UUID.randomUUID(), actor, null, action, resource, null, now, "SUCCEEDED", UUID.randomUUID()));
    }

    private static SubscriptionFailure forbidden() {
        return new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN, "Workspace access is not permitted for this account and entitlement.");
    }
}
