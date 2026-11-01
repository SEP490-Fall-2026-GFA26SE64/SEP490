package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.PlanTerms;
import com.adaptlearngraph.entities.SubscriptionPlan;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SubscriptionPlanStore {
    List<SubscriptionPlan> currentPlans();
    SubscriptionPlan update(UUID planId, UUID expectedVersionId, PlanTerms terms, UUID actorId, Instant now);
}
