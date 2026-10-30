package com.adaptlearngraph.subscription.application;

import com.adaptlearngraph.subscription.application.port.in.SubscriptionCatalogUseCase;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionPlanStore;
import com.adaptlearngraph.subscription.domain.BillingCalendar;
import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import com.adaptlearngraph.subscription.domain.SubscriptionPlan;
import java.time.Clock;
import java.util.List;
import java.util.UUID;

public final class SubscriptionCatalogService implements SubscriptionCatalogUseCase {
    private final SubscriptionPlanStore plans;
    private final SubscriptionIdentity identity;
    private final Clock clock;

    public SubscriptionCatalogService(SubscriptionPlanStore plans, SubscriptionIdentity identity, Clock clock) {
        this.plans = plans;
        this.identity = identity;
        this.clock = clock;
    }

    @Override
    public List<SubscriptionPlan> plans() {
        var context = requireIdentity();
        var actor = context.actor();
        boolean platform = actor.roles().contains(Role.PLATFORM_ADMINISTRATOR);
        boolean administrator = actor.roles().contains(Role.ORGANIZATION_ADMINISTRATOR)
                && actor.organizationId() != null && actor.membershipActive() && actor.satisfiesMfa();
        boolean registrant = context.registrationId() != null && actor.satisfiesMfa();
        if (!platform && !administrator && !registrant) throw forbidden();
        return plans.currentPlans();
    }

    @Override
    public List<SubscriptionPlan> organizationPlans(UUID organizationId) {
        var actor = requireIdentity().actor();
        if (organizationId == null || !organizationId.equals(actor.organizationId()) || !actor.membershipActive()
                || !actor.satisfiesMfa() || !actor.roles().contains(Role.ORGANIZATION_ADMINISTRATOR)) throw forbidden();
        return plans.currentPlans();
    }

    @Override
    public List<SubscriptionPlan> administrativePlans() {
        var actor = requireIdentity().actor();
        if (!actor.roles().contains(Role.PLATFORM_ADMINISTRATOR)) throw forbidden();
        return plans.currentPlans();
    }

    @Override
    public SubscriptionPlan update(UUID planId, UUID expectedVersionId, PlanTerms terms) {
        var actor = requireIdentity().actor();
        if (!actor.roles().contains(Role.PLATFORM_ADMINISTRATOR)) throw forbidden();
        if (planId == null || expectedVersionId == null || terms == null) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                    "A plan, its expected version and all commercial terms are required.");
        }
        var now = clock.instant();
        BillingCalendar.endOfPeriod(now, terms.durationMonths(), BillingCalendar.anniversaryDay(now));
        return plans.update(planId, expectedVersionId, terms, actor.accountId(), now);
    }

    private SubscriptionIdentity.Context requireIdentity() {
        var context = identity.current();
        if (context == null || context.actor() == null || !context.actor().accountActive()) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.UNAUTHENTICATED, "Sign in to continue.");
        }
        if (context.registrationId() == null && context.actor().roles().size() != 1) throw forbidden();
        return context;
    }

    private static SubscriptionFailure forbidden() {
        return new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN,
                "Your authenticated account is not permitted to perform this subscription operation.");
    }
}
