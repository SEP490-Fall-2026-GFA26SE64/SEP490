package com.adaptlearngraph.subscription.domain;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public record MemberProfileUpdate(String fullName, Set<String> roles, UUID departmentId,
                                  UUID occupationReferenceId, long revision) {
    public MemberProfileUpdate {
        if (fullName == null || fullName.isBlank() || fullName.strip().length() > 120) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                    "Enter a full name of at most 120 characters.", "fullName");
        }
        fullName = fullName.strip();
        if (roles == null || roles.size() != 1 || roles.stream().anyMatch(Objects::isNull)
                || !Set.of("EMPLOYEE", "DOMAIN_EXPERT", "LD_MANAGER", "ORGANIZATION_ADMINISTRATOR").containsAll(roles)) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, "Select exactly one organization role.", "roles");
        }
        roles = Set.copyOf(roles);
        if (revision < 0) throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                "A valid membership revision is required.", "revision");
    }
}
