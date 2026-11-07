package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.SubscriptionDto.MemberAccessRequest;
import com.adaptlearngraph.dtos.SubscriptionDto.MemberProfileRequest;
import com.adaptlearngraph.dtos.SubscriptionDto.MemberResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.OrderRequest;
import com.adaptlearngraph.dtos.SubscriptionDto.OrderStatusResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.SummaryResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.WorkspaceResponse;
import com.adaptlearngraph.entities.domain.MemberProfileUpdate;
import com.adaptlearngraph.repository.PaymentOrderStore;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.modelmapper.ModelMapper;

/**
 * DTO boundary of the subscription order, billing, workspace and member APIs. Organization, order and membership ids
 * always come from the request path; request bodies are translated explicitly.
 */
public class SubscriptionLifecycleApplicationService {
    private final SubscriptionLifecycleUseCase lifecycle;
    private final ModelMapper mapper;

    public SubscriptionLifecycleApplicationService(SubscriptionLifecycleUseCase lifecycle, ModelMapper mapper) {
        this.lifecycle = Objects.requireNonNull(lifecycle, "lifecycle");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public void requireWorkspace() {
        lifecycle.requireWorkspace();
    }

    /** Creates a purchase order ({@code organizationId == null}) or a renewal order for the path organization. */
    public OrderStatusResponse create(UUID organizationId, OrderRequest input) {
        var command = new PaymentOrderStore.Command(organizationId, input.planId(), input.expectedVersionId(),
                input.idempotencyKey(), input.replacesOrderId());
        return toResponse(lifecycle.create(command));
    }

    public OrderStatusResponse current(UUID organizationId) {
        return toResponse(lifecycle.current(organizationId));
    }

    public OrderStatusResponse status(UUID orderId) {
        return toResponse(lifecycle.status(orderId));
    }

    public OrderStatusResponse reconcile(UUID orderId) {
        return toResponse(lifecycle.reconcile(orderId));
    }

    public SummaryResponse summary(UUID organizationId) {
        var summary = lifecycle.summary(organizationId);
        return summary == null ? null : mapper.map(summary, SummaryResponse.class);
    }

    public List<WorkspaceResponse> workspaces() {
        return lifecycle.workspaces().stream().map(workspace -> mapper.map(workspace, WorkspaceResponse.class)).toList();
    }

    public void suspend(UUID organizationId, boolean suspended) {
        lifecycle.suspend(organizationId, suspended);
    }

    public List<MemberResponse> members(UUID organizationId) {
        return lifecycle.members(organizationId).stream().map(member -> mapper.map(member, MemberResponse.class)).toList();
    }

    public void changeMember(UUID organizationId, UUID membershipId, MemberAccessRequest input) {
        lifecycle.changeMember(organizationId, membershipId, input.active(), input.roles(), input.revision());
    }

    public MemberResponse updateMember(UUID organizationId, UUID membershipId, MemberProfileRequest input) {
        var update = new MemberProfileUpdate(input.fullName(), input.roles(), input.departmentId(),
                input.occupationReferenceId(), input.revision(), input.departmentName(), input.occupationName(),
                input.targetRoleId(), input.targetRoleCode(), input.targetRoleName(), input.targetRoleLevel());
        var member = lifecycle.updateMember(organizationId, membershipId, update);
        return member == null ? null : mapper.map(member, MemberResponse.class);
    }

    private OrderStatusResponse toResponse(SubscriptionLifecycleUseCase.Status status) {
        return status == null ? null : mapper.map(status, OrderStatusResponse.class);
    }
}
