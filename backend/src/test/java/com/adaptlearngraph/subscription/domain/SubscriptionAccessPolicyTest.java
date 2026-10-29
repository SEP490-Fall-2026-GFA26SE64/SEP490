package com.adaptlearngraph.subscription.domain;

import static com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SubscriptionAccessPolicyTest {
    private final UUID organization = UUID.randomUUID();

    private Actor actor(Set<Role> roles, boolean mfa) {
        return new Actor(UUID.randomUUID(), organization, true, true, roles, mfa);
    }

    @Test
    void employeeNeedsPaidUnsuspendedMembershipButNotMfa() {
        var employee = actor(Set.of(Role.EMPLOYEE), false);
        assertTrue(permits(employee, Action.WORKSPACE, organization, true, false, true));
        assertFalse(permits(employee, Action.WORKSPACE, organization, true, false, false));
        assertFalse(permits(employee, Action.WORKSPACE, organization, true, true, true));
        assertFalse(permits(employee, Action.WORKSPACE, UUID.randomUUID(), true, false, true));
        assertFalse(permits(employee, Action.BILLING_READ, organization, true, false, true));
        assertFalse(permits(employee, Action.RENEW, organization, true, false, true));
    }

    @Test
    void expiredAdministratorRetainsOnlyApprovedRecoveryAndSuspensionWins() {
        var admin = actor(Set.of(Role.ORGANIZATION_ADMINISTRATOR), true);
        assertFalse(permits(admin, Action.WORKSPACE, organization, true, false, false));
        assertTrue(permits(admin, Action.BILLING_READ, organization, true, false, false));
        assertTrue(permits(admin, Action.MEMBER_READ, organization, true, false, false));
        assertTrue(permits(admin, Action.RENEW, organization, true, false, false));
        assertTrue(permits(admin, Action.SEAT_REDUCTION, organization, true, false, false));
        assertTrue(permits(admin, Action.BILLING_READ, organization, true, true, true));
        assertFalse(permits(admin, Action.MEMBER_READ, organization, true, true, true));
        assertFalse(permits(admin, Action.RENEW, organization, true, true, true));
        assertFalse(permits(admin, Action.SEAT_REDUCTION, organization, true, true, true));
        assertFalse(permits(admin, Action.SUSPENSION, organization, true, false, true));
    }

    @Test
    void administratorRoleCannotInheritPasswordOnlyEmployeeAuthority() {
        var mixed = actor(Set.of(Role.EMPLOYEE, Role.ORGANIZATION_ADMINISTRATOR), false);
        for (var action : Action.values()) assertFalse(permits(mixed, action, organization, true, false, true));
        var platform = new Actor(UUID.randomUUID(), null, true, false, Set.of(Role.PLATFORM_ADMINISTRATOR), false);
        assertTrue(permits(platform, Action.PLAN_CONFIGURATION, null, false, false, false));
        assertTrue(permits(platform, Action.SUSPENSION, organization, false, true, false));
        assertFalse(permits(platform, Action.WORKSPACE, organization, true, false, true));
    }

    @Test
    void missingInactiveAndNotReadyActorsAreDenied() {
        assertFalse(permits(null, Action.WORKSPACE, organization, true, false, true));
        var inactiveAccount = new Actor(UUID.randomUUID(), organization, false, true, Set.of(Role.EMPLOYEE), false);
        var inactiveMember = new Actor(UUID.randomUUID(), organization, true, false, Set.of(Role.EMPLOYEE), false);
        assertFalse(permits(inactiveAccount, Action.WORKSPACE, organization, true, false, true));
        assertFalse(permits(inactiveMember, Action.WORKSPACE, organization, true, false, true));
        assertFalse(permits(actor(Set.of(Role.EMPLOYEE), false), Action.WORKSPACE, organization, false, false, true));
    }

    @Test
    void seatDefinitionAndAdmissionRespectAllCommittedReservations() {
        assertTrue(consumesEmployeeSeat(true, true, Set.of(Role.EMPLOYEE, Role.DOMAIN_EXPERT)));
        assertFalse(consumesEmployeeSeat(false, true, Set.of(Role.EMPLOYEE)));
        assertFalse(consumesEmployeeSeat(true, false, Set.of(Role.EMPLOYEE)));
        assertFalse(consumesEmployeeSeat(true, true, Set.of(Role.ORGANIZATION_ADMINISTRATOR)));
        assertEquals(20, admissionLimit(50, 20, null));
        assertEquals(20, admissionLimit(50, null, 20));
        assertEquals(20, admissionLimit(20, 50, 200));
        assertEquals(0, admissionLimit(0, 20, null));
    }
}
