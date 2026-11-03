package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.SubscriptionDto.SubscriptionPlanResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.UpdatePlanRequest;
import com.adaptlearngraph.entities.domain.PlanTerms;
import com.adaptlearngraph.entities.domain.SubscriptionPlan;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.modelmapper.ModelMapper;

/** DTO boundary of the subscription plan catalog API. */
public class SubscriptionPlanApplicationService {
    private final SubscriptionCatalogUseCase catalog;
    private final ModelMapper mapper;

    public SubscriptionPlanApplicationService(SubscriptionCatalogUseCase catalog, ModelMapper mapper) {
        this.catalog = Objects.requireNonNull(catalog, "catalog");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public List<SubscriptionPlanResponse> purchasePlans() {
        return toResponses(catalog.plans());
    }

    public List<SubscriptionPlanResponse> administrativePlans() {
        return toResponses(catalog.administrativePlans());
    }

    public List<SubscriptionPlanResponse> renewalPlans(UUID organizationId) {
        return toResponses(catalog.organizationPlans(organizationId));
    }

    /** The plan id comes from the path; only the editable commercial terms are taken from the body. */
    public SubscriptionPlanResponse update(UUID planId, UpdatePlanRequest input) {
        var terms = new PlanTerms(input.name(), input.description(), input.priceVnd(), input.currency(),
                input.durationMonths(), input.employeeSeats());
        return toResponse(catalog.update(planId, input.expectedVersionId(), terms));
    }

    private List<SubscriptionPlanResponse> toResponses(List<SubscriptionPlan> plans) {
        return plans.stream().map(this::toResponse).toList();
    }

    private SubscriptionPlanResponse toResponse(SubscriptionPlan plan) {
        return mapper.map(plan, SubscriptionPlanResponse.class);
    }
}