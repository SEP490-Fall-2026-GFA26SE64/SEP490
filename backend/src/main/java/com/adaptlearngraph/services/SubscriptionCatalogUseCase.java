package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.PlanTerms;
import com.adaptlearngraph.entities.domain.SubscriptionPlan;
import java.util.List;
import java.util.UUID;

public interface SubscriptionCatalogUseCase {
    List<SubscriptionPlan> plans();
    List<SubscriptionPlan> organizationPlans(UUID organizationId);
    List<SubscriptionPlan> administrativePlans();
    SubscriptionPlan update(UUID planId, UUID expectedVersionId, PlanTerms terms);
}
