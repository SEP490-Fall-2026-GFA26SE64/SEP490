package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.PaymentOrderStore.Command;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.*;
import com.adaptlearngraph.entities.domain.PaymentOrder;
import com.adaptlearngraph.entities.domain.MemberProfileUpdate;
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
    Member myAssignment(UUID organizationId);
    void changeMember(UUID organizationId,UUID membershipId,boolean active,Set<String> roles,long revision);
    Member updateMember(UUID organizationId,UUID membershipId,MemberProfileUpdate update);
    com.adaptlearngraph.repository.PaymentOrderStore.SeatAddonQuote quoteSeatAddon(UUID organizationId,String target,int seats);
    Status createSeatAddon(com.adaptlearngraph.repository.PaymentOrderStore.SeatAddonCommand command);
    int changeAddonSeats(UUID organizationId,int desired,int expected);
    record Status(PaymentOrder order,String applicationState,Setup workspace) {}
}
