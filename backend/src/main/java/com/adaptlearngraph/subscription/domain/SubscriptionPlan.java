package com.adaptlearngraph.subscription.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record SubscriptionPlan(UUID planId, String code, UUID versionId, long revision,
                               PlanTerms terms, Instant createdAt, UUID createdBy) {
    public SubscriptionPlan {
        Objects.requireNonNull(planId, "planId");
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(versionId, "versionId");
        Objects.requireNonNull(terms, "terms");
        Objects.requireNonNull(createdAt, "createdAt");
        if (revision < 1) throw new IllegalArgumentException("Plan revision must be positive.");
    }
}
