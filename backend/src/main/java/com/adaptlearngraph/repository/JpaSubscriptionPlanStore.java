package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.domain.PlanTerms;
import com.adaptlearngraph.entities.domain.SubscriptionPlan;
import com.adaptlearngraph.entities.SubscriptionPlanVersionEntity;
import com.adaptlearngraph.exception.SubscriptionFailure;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.support.TransactionTemplate;

/** JPA adapter for {@link SubscriptionPlanStore}: optimistic expected-version check under the plan row lock. */
public final class JpaSubscriptionPlanStore implements SubscriptionPlanStore {
    private final SubscriptionPlanJpaRepository plans;
    private final SubscriptionPlanVersionJpaRepository versions;
    private final AuditEventJpaRepository audit;
    private final TransactionTemplate transactions;

    public JpaSubscriptionPlanStore(SubscriptionPlanJpaRepository plans, SubscriptionPlanVersionJpaRepository versions,
            AuditEventJpaRepository audit, TransactionTemplate transactions) {
        this.plans = plans;
        this.versions = versions;
        this.audit = audit;
        this.transactions = transactions;
    }

    @Override
    public List<SubscriptionPlan> currentPlans() {
        return plans.currentPlans().stream().map(JpaSubscriptionPlanStore::plan).toList();
    }

    @Override
    public SubscriptionPlan update(UUID planId, UUID expectedVersionId, PlanTerms terms, UUID actorId, Instant now) {
        return transactions.execute(status -> {
            if (plans.lock(planId).isEmpty()) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.NOT_FOUND, "The subscription plan does not exist.");
            }
            var current = plans.current(planId).orElseThrow();
            if (!current.versionId().equals(expectedVersionId)) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,
                        "This plan changed. Reload its current terms before saving.", "expectedVersionId");
            }
            UUID versionId = UUID.randomUUID();
            long revision = Math.addExact(current.revision(), 1);
            versions.insert(new SubscriptionPlanVersionEntity(versionId, planId, revision, terms.name(), terms.description(),
                    terms.priceVnd(), terms.currency(), terms.durationMonths(), terms.employeeSeats(), now, actorId,
                    "PLATFORM_ADMINISTRATOR"));
            plans.point(planId, versionId);
            audit.insert(new AuditEventEntity(UUID.randomUUID(), actorId, null, "SUBSCRIPTION_PLAN_UPDATED", planId,
                    Long.toString(revision), now, "SUCCEEDED", UUID.randomUUID()));
            return new SubscriptionPlan(planId, current.code(), versionId, revision, terms, now, actorId);
        });
    }

    private static SubscriptionPlan plan(SubscriptionPlanJpaRepository.Current row) {
        return new SubscriptionPlan(row.planId(), row.code(), row.versionId(), row.revision(),
                new PlanTerms(row.name(), row.description(), row.priceVnd(), row.currency(), row.durationMonths(),
                        row.employeeSeats()), row.createdAt(), row.createdBy());
    }
}
