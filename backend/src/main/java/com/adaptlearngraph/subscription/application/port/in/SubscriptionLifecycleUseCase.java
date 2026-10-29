package com.adaptlearngraph.subscription.application.port.in;

import com.adaptlearngraph.subscription.application.port.out.PaymentOrderStore.Command;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore.*;
import com.adaptlearngraph.subscription.domain.PaymentOrder;
import com.adaptlearngraph.subscription.domain.MemberProfileUpdate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface SubscriptionLifecycleUseCase {
    Status create(Command command);
    void requireWorkspace();
    Status status(UUID orderId);
    Status current(UUID organizationId);
    Status reconcile(UUID orderId);
    Summary summary(UUID organizationId);
    List<Workspace> workspaces();
    void suspend(UUID organizationId,boolean suspended);
    List<Member> members(UUID organizationId);
    void changeMember(UUID organizationId,UUID membershipId,boolean active,Set<String> roles,long revision);
    Member updateMember(UUID organizationId,UUID membershipId,MemberProfileUpdate update);
    record Status(PaymentOrder order,String applicationState,Setup workspace) {}
}
