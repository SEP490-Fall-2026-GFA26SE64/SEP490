package com.adaptlearngraph.subscription.application.port.out;

import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.SubscriptionPlan;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SubscriptionPlanStore {
    List<SubscriptionPlan> currentPlans();
    SubscriptionPlan update(UUID planId, UUID expectedVersionId, PlanTerms terms, UUID actorId, Instant now);
}
