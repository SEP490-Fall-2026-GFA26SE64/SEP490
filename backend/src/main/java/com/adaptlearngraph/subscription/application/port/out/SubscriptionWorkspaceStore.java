package com.adaptlearngraph.subscription.application.port.out;

import com.adaptlearngraph.subscription.domain.PaymentOrder;
import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.MemberProfileUpdate;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Action;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Actor;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface SubscriptionWorkspaceStore {
    void require(Actor actor, UUID organizationId, Action action, Instant now);
    Summary summary(UUID organizationId, Instant now);
    Setup setup(UUID registrationId);
    List<Workspace> workspaces();
    void suspend(Actor actor, UUID organizationId, boolean suspended, Instant now);
    List<Member> members(UUID organizationId);
    void changeMember(Actor actor, UUID organizationId, UUID memberId, boolean active, Set<String> roles, long revision, Instant now);
    Member updateMember(Actor actor, UUID organizationId, UUID memberId, MemberProfileUpdate update, Instant now);
    record PaidPeriod(UUID periodId, Instant startsAt, Instant endsAt, PlanTerms terms) {}
    record Summary(UUID organizationId, String organizationName, String workspaceStatus, String subscriptionStatus, PaidPeriod current,
                   PaidPeriod scheduled, int usedSeats, int allocatedSeats, int admissionLimit, List<PaymentOrder> paymentHistory) {}
    record Setup(UUID organizationId, String state, Instant readyAt, String failureCode) {}
    record Workspace(UUID organizationId, String name, String status, String setupState) {}
    record Member(UUID membershipId, UUID accountId, String fullName, String email, boolean active,
                  Set<String> roles, UUID departmentId, UUID occupationReferenceId, long revision,
                  String departmentName, String occupationName, boolean accountActive) {}
}
