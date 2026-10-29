package com.adaptlearngraph.subscription.application.port.in;

import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.SubscriptionPlan;
import java.util.List;
import java.util.UUID;

public interface SubscriptionCatalogUseCase {
    List<SubscriptionPlan> plans();
    List<SubscriptionPlan> organizationPlans(UUID organizationId);
    List<SubscriptionPlan> administrativePlans();
    SubscriptionPlan update(UUID planId, UUID expectedVersionId, PlanTerms terms);
}
