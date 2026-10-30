package com.adaptlearngraph.subscription.application;

import com.adaptlearngraph.subscription.application.port.in.SubscriptionLifecycleUseCase;
import com.adaptlearngraph.subscription.application.port.out.*;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore.*;
import com.adaptlearngraph.subscription.domain.PaymentOrder;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Action;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.time.Clock;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class SubscriptionLifecycleService implements SubscriptionLifecycleUseCase {
    private final SubscriptionIdentity identity;
    private final PaymentOrderStore orders;
    private final PaymentProcessingStore processing;
    private final SubscriptionWorkspaceStore workspaces;
    private final PaymentGateway gateway;
    private final Clock clock;
    private final com.adaptlearngraph.shared.domain.IntegrationPolicy policy;

    public SubscriptionLifecycleService(SubscriptionIdentity identity, PaymentOrderStore orders, PaymentProcessingStore processing,
            SubscriptionWorkspaceStore workspaces, PaymentGateway gateway, Clock clock) {
        this(identity, orders, processing, workspaces, gateway, clock, com.adaptlearngraph.shared.domain.IntegrationPolicy.ENABLED);
    }

    public SubscriptionLifecycleService(SubscriptionIdentity identity, PaymentOrderStore orders, PaymentProcessingStore processing,
            SubscriptionWorkspaceStore workspaces, PaymentGateway gateway, Clock clock,
            com.adaptlearngraph.shared.domain.IntegrationPolicy policy) {
        this.identity=identity; this.orders=orders; this.processing=processing; this.workspaces=workspaces; this.gateway=gateway; this.clock=clock;
        this.policy=policy;
    }

    @Override
    public void requireWorkspace() {
        var actor=identity.current().actor();
        workspaces.require(actor,actor.organizationId(),Action.WORKSPACE,clock.instant());
    }
    @Override
    public Status create(PaymentOrderStore.Command command) {
        var actor=identity.current();
        if(command.organizationId()!=null) workspaces.require(actor.actor(),command.organizationId(),Action.RENEW,clock.instant());
        if (policy.payosEnabled()) gateway.requireConfigured();
        var order = orders.create(actor,command,clock.instant());
        if (!policy.payosEnabled()) {
            processing.bypassForDevelopment(order.orderId(), clock.instant());
            processing.apply(order.orderId(), clock.instant());
            order = orders.find(order.orderId()).orElseThrow();
        }
        return view(order);
    }
    @Override public Status status(UUID orderId) { return view(authorized(orderId)); }
    @Override
    public Status current(UUID organizationId) {
        var context=identity.current();
        if(organizationId!=null) workspaces.require(context.actor(),organizationId,Action.BILLING_READ,clock.instant());
        var order=orders.current(context,organizationId);
        return order.map(this::view).orElseGet(()->new Status(null,"NOT_APPLIED",
                context.registrationId()==null?null:workspaces.setup(context.registrationId())));
    }
    @Override
    public Status reconcile(UUID orderId) {
        var order=authorized(orderId);
        processing.schedule(orderId,clock.instant());
        return view(order);
    }
    @Override
    public Summary summary(UUID organizationId) {
        workspaces.require(identity.current().actor(),organizationId,Action.BILLING_READ,clock.instant());
        return workspaces.summary(organizationId,clock.instant());
    }
    @Override
    public List<Workspace> workspaces() {
        workspaces.require(identity.current().actor(),null,Action.SUSPENSION,clock.instant());
        return workspaces.workspaces();
    }
    @Override
    public void suspend(UUID organizationId,boolean suspended) {
        workspaces.suspend(identity.current().actor(),organizationId,suspended,clock.instant());
    }
    @Override
    public List<Member> members(UUID organizationId) {
        workspaces.require(identity.current().actor(),organizationId,Action.MEMBER_READ,clock.instant());
        return workspaces.members(organizationId);
    }
    @Override
    public void changeMember(UUID organizationId,UUID member,boolean active,Set<String> roles,long revision) {
        workspaces.changeMember(identity.current().actor(),organizationId,member,active,roles,revision,clock.instant());
    }
    @Override
    public Member updateMember(UUID organizationId,UUID member,com.adaptlearngraph.subscription.domain.MemberProfileUpdate update) {
        return workspaces.updateMember(identity.current().actor(),organizationId,member,update,clock.instant());
    }
    private PaymentOrder authorized(UUID orderId) {
        var context=identity.current();
        var order=orders.find(orderId).orElseThrow(()->new SubscriptionFailure(SubscriptionFailure.Code.NOT_FOUND,"Order not found."));
        if(context.registrationId()!=null) {
            if(!context.registrationId().equals(order.registrationId()) || !context.actor().accountId().equals(order.ownerAccountId())) throw forbidden();
        } else {
            UUID organization=order.organizationId();
            if(organization==null) organization=workspaces.setup(order.registrationId()).organizationId();
            workspaces.require(context.actor(),organization,Action.BILLING_READ,clock.instant());
        }
        return order;
    }
    private Status view(PaymentOrder order) {
        return new Status(order,orders.applicationState(order.orderId()),
                order.registrationId()==null?null:workspaces.setup(order.registrationId()));
    }
    private static SubscriptionFailure forbidden() { return new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN,"This order belongs to another purchase context."); }
}
