package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.SubscriptionDto.MemberResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.OrderStatusResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.PaidPeriodResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.PaymentOrderResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.PlanTermsResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.SubscriptionPlanResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.SummaryResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.WorkspaceResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.WorkspaceSetupResponse;
import com.adaptlearngraph.entities.domain.PaymentOrder;
import com.adaptlearngraph.entities.domain.PlanTerms;
import com.adaptlearngraph.entities.domain.SubscriptionPlan;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.Member;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.PaidPeriod;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.Setup;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.Summary;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.Workspace;
import com.adaptlearngraph.services.SubscriptionLifecycleUseCase.Status;
import org.modelmapper.ModelMapper;
import org.modelmapper.spi.MappingContext;

/** TypeMaps for the subscription plan, order, billing, workspace and member APIs. */
public final class SubscriptionMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(PlanTerms.class, PlanTermsResponse.class).setConverter(context -> {
            PlanTerms source = context.getSource();
            return new PlanTermsResponse(source.name(), source.description(), source.priceVnd(), source.currency(),
                    source.durationMonths(), source.employeeSeats());
        });
        mapper.typeMap(SubscriptionPlan.class, SubscriptionPlanResponse.class).setConverter(context -> {
            SubscriptionPlan source = context.getSource();
            return new SubscriptionPlanResponse(source.planId(), source.code(), source.versionId(), source.revision(),
                    nested(context, source.terms(), PlanTermsResponse.class));
        });
        mapper.typeMap(PaymentOrder.class, PaymentOrderResponse.class).setConverter(context -> {
            PaymentOrder source = context.getSource();
            return new PaymentOrderResponse(source.orderId(), source.intentId(), source.kind(), source.registrationId(),
                    source.organizationId(), source.ownerAccountId(), source.planId(), source.planVersionId(),
                    nested(context, source.terms(), PlanTermsResponse.class), source.providerOrderCode(),
                    source.paymentStatus(), source.paymentLinkId(), source.checkoutUrl(), source.observedPaidAmount(),
                    source.createdAt(), source.expiresAt(), source.confirmedAt(), source.failureCode(), source.attempt());
        });
        mapper.typeMap(Setup.class, WorkspaceSetupResponse.class).setConverter(context -> {
            Setup source = context.getSource();
            return new WorkspaceSetupResponse(source.organizationId(), source.state(), source.readyAt(), source.failureCode());
        });
        mapper.typeMap(Status.class, OrderStatusResponse.class).setConverter(context -> {
            Status source = context.getSource();
            return new OrderStatusResponse(nested(context, source.order(), PaymentOrderResponse.class),
                    source.applicationState(), nested(context, source.workspace(), WorkspaceSetupResponse.class));
        });
        mapper.typeMap(PaidPeriod.class, PaidPeriodResponse.class).setConverter(context -> {
            PaidPeriod source = context.getSource();
            return new PaidPeriodResponse(source.periodId(), source.startsAt(), source.endsAt(),
                    nested(context, source.terms(), PlanTermsResponse.class));
        });
        mapper.typeMap(Summary.class, SummaryResponse.class).setConverter(context -> {
            Summary source = context.getSource();
            var history = source.paymentHistory() == null ? null : source.paymentHistory().stream()
                    .map(order -> nested(context, order, PaymentOrderResponse.class)).toList();
            return new SummaryResponse(source.organizationId(), source.organizationName(), source.workspaceStatus(),
                    source.subscriptionStatus(), nested(context, source.current(), PaidPeriodResponse.class),
                    nested(context, source.scheduled(), PaidPeriodResponse.class), source.usedSeats(),
                    source.allocatedSeats(), source.admissionLimit(), history);
        });
        mapper.typeMap(Workspace.class, WorkspaceResponse.class).setConverter(context -> {
            Workspace source = context.getSource();
            var subscription = source.subscription();
            var current = subscription.current();
            return new WorkspaceResponse(source.organizationId(), source.name(), source.status(), source.setupState(),
                    new com.adaptlearngraph.dtos.SubscriptionDto.WorkspaceSubscriptionResponse(subscription.status(),
                            current == null ? null : new com.adaptlearngraph.dtos.SubscriptionDto.CurrentPlanResponse(
                                    current.name(), current.startsAt(), current.endsAt())),
                    source.administrators().stream().map(admin ->
                            new com.adaptlearngraph.dtos.SubscriptionDto.WorkspaceAdministratorResponse(admin.accountId(),
                                    admin.fullName(), admin.email(), admin.active(), admin.accountActive())).toList());
        });
        mapper.typeMap(Member.class, MemberResponse.class).setConverter(context -> {
            Member source = context.getSource();
            return new MemberResponse(source.membershipId(), source.accountId(), source.fullName(), source.email(),
                    source.active(), source.roles(), source.departmentId(), source.jobPositionReferenceId(),
                    source.revision(), source.departmentName(), source.jobPositionName(), source.accountActive(),
                    source.targetRoleId(), source.targetRoleCode(), source.targetRoleName(), source.targetRoleLevel());
        });
    }

    private static <D> D nested(MappingContext<?, ?> context, Object source, Class<D> type) {
        return source == null ? null : context.getMappingEngine().map(context.create(source, type));
    }
}