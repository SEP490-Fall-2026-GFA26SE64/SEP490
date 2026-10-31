package com.adaptlearngraph.subscription.domain;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public final class SubscriptionAccessPolicy {
    public enum Action { WORKSPACE, BILLING_READ, MEMBER_READ, RENEW, SEAT_REDUCTION, PLAN_CONFIGURATION, SUSPENSION }
    public enum Role {
        EMPLOYEE, LD_MANAGER, DOMAIN_EXPERT, ORGANIZATION_ADMINISTRATOR, PLATFORM_ADMINISTRATOR
    }

    public record Actor(UUID accountId, UUID organizationId, boolean accountActive,
                        boolean membershipActive, Set<Role> roles, boolean mfaVerified, boolean mfaRequired) {
        public Actor(UUID accountId, UUID organizationId, boolean accountActive,
                     boolean membershipActive, Set<Role> roles, boolean mfaVerified) {
            this(accountId, organizationId, accountActive, membershipActive, roles, mfaVerified, true);
        }

        public boolean satisfiesMfa() {
            return !mfaRequired || mfaVerified;
        }
        public Actor {
            Objects.requireNonNull(accountId, "accountId");
            roles = Set.copyOf(roles);
        }
    }

    private SubscriptionAccessPolicy() {}

    public static boolean permits(Actor actor, Action action, UUID organizationId,
                                  boolean workspaceReady, boolean suspended, boolean paid) {
        Objects.requireNonNull(action, "action");
        if (actor == null || !actor.accountActive() || actor.roles().size() != 1) return false;
        boolean platform = actor.roles().contains(Role.PLATFORM_ADMINISTRATOR);
        boolean administrator = actor.roles().contains(Role.ORGANIZATION_ADMINISTRATOR);
        if (administrator && !actor.satisfiesMfa()) return false;
        if (action == Action.PLAN_CONFIGURATION || action == Action.SUSPENSION) return platform;
        if (organizationId == null || !organizationId.equals(actor.organizationId())
                || !actor.membershipActive() || !workspaceReady) return false;
        return switch (action) {
            case BILLING_READ -> administrator;
            case MEMBER_READ -> (administrator || actor.roles().contains(Role.LD_MANAGER) || actor.roles().contains(Role.DOMAIN_EXPERT)) && !suspended;
            case RENEW, SEAT_REDUCTION -> administrator && !suspended;
            case WORKSPACE -> !suspended && paid && !actor.roles().isEmpty() && !platform;
            case PLAN_CONFIGURATION, SUSPENSION -> false;
        };
    }

    public static boolean consumesEmployeeSeat(boolean accountActive, boolean membershipActive, Set<Role> roles) {
        return accountActive && membershipActive && roles.contains(Role.EMPLOYEE);
    }

    public static int admissionLimit(int currentAllocation, Integer unresolvedAllocation, Integer scheduledAllocation) {
        if (currentAllocation < 0 || (unresolvedAllocation != null && unresolvedAllocation <= 0)
                || (scheduledAllocation != null && scheduledAllocation <= 0)) {
            throw new IllegalArgumentException("Seat allocations must be nonnegative; reserved allocations must be positive.");
        }
        int limit = currentAllocation;
        if (unresolvedAllocation != null) limit = Math.min(limit, unresolvedAllocation);
        if (scheduledAllocation != null) limit = Math.min(limit, scheduledAllocation);
        return limit;
    }
}
