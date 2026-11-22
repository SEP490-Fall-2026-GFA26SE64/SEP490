package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.PaymentOrder;
import com.adaptlearngraph.entities.domain.PlanTerms;
import com.adaptlearngraph.entities.domain.MemberProfileUpdate;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Action;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Actor;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface SubscriptionWorkspaceStore {
    void require(Actor actor, UUID organizationId, Action action, Instant now);
    Summary summary(UUID organizationId, Instant now);
    Setup setup(UUID registrationId);
    List<Workspace> workspaces(Instant now);
    void suspend(Actor actor, UUID organizationId, boolean suspended, Instant now);
    List<Member> members(UUID organizationId);
    void changeMember(Actor actor, UUID organizationId, UUID memberId, boolean active, Set<String> roles, long revision, Instant now);
    Member updateMember(Actor actor, UUID organizationId, UUID memberId, MemberProfileUpdate update, Instant now);
    /** {@code terms} are the plan part of the period; {@code addonSeats} are the period's additional Employee seats. */
    record PaidPeriod(UUID periodId, Instant startsAt, Instant endsAt, PlanTerms terms, UUID planId, int addonSeats) {
        public PaidPeriod(UUID periodId, Instant startsAt, Instant endsAt, PlanTerms terms) {
            this(periodId, startsAt, endsAt, terms, null, 0);
        }

        public int totalSeats() {
            return terms.employeeSeats() + addonSeats;
        }
    }
    /**
     * {@code desiredAddonSeats} are kept at the next same-plan renewal of {@code renewalPlanId}; {@code scheduledShortfall}
     * are desired seats not yet paid for the scheduled period; {@code seatChangeBlocked} while a renewal or seat add-on
     * order is unresolved.
     */
    record Summary(UUID organizationId, String organizationName, String workspaceStatus, String subscriptionStatus, PaidPeriod current,
                   PaidPeriod scheduled, int usedSeats, int allocatedSeats, int admissionLimit, List<PaymentOrder> paymentHistory,
                   int desiredAddonSeats, int scheduledShortfall, UUID renewalPlanId, boolean seatChangeBlocked) {
        public Summary(UUID organizationId, String organizationName, String workspaceStatus, String subscriptionStatus,
                       PaidPeriod current, PaidPeriod scheduled, int usedSeats, int allocatedSeats, int admissionLimit,
                       List<PaymentOrder> paymentHistory) {
            this(organizationId, organizationName, workspaceStatus, subscriptionStatus, current, scheduled, usedSeats,
                    allocatedSeats, admissionLimit, paymentHistory, 0, 0, null, false);
        }
    }
    record Setup(UUID organizationId, String state, Instant readyAt, String failureCode) {}
    record Workspace(UUID organizationId, String name, String status, String setupState, OrganizationProfile profile,
                     WorkspaceSubscription subscription, List<WorkspaceAdministrator> administrators) {}
    record OrganizationProfile(String workspaceSlug, String industry, String headcount, String country, Instant createdAt) {}
    record WorkspaceSubscription(String status, CurrentPlan current) {}
    record CurrentPlan(String name, Instant startsAt, Instant endsAt) {}
    /** {@code phone} is only known for the System Administrator who registered the organization. */
    record WorkspaceAdministrator(UUID accountId, String fullName, String email, boolean active, boolean accountActive,
                                  boolean systemAdministrator, String phone) {}
    record Member(UUID membershipId, UUID accountId, String fullName, String email, boolean active,
                  Set<String> roles, UUID departmentId, UUID jobPositionReferenceId, long revision,
                  String departmentName, String jobPositionName, boolean accountActive,
                  String targetRoleId, String targetRoleCode, String targetRoleName, String targetRoleLevel) {
        public Member(UUID membershipId, UUID accountId, String fullName, String email, boolean active,
                      Set<String> roles, UUID departmentId, UUID jobPositionReferenceId, long revision,
                      String departmentName, String jobPositionName, boolean accountActive) {
            this(membershipId, accountId, fullName, email, active, roles, departmentId, jobPositionReferenceId,
                    revision, departmentName, jobPositionName, accountActive, null, null, null, null);
        }
    }
}
