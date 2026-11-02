package com.adaptlearngraph.repository;

import java.util.Objects;

/** Spring Data repositories behind the adaptive Blueprint store (one scoped JPA transaction per Blueprint command). */
public record AdaptiveBlueprintRepositories(BaselineBlueprintJpaRepository identities,
        BaselineAdaptiveBlueprintWorkingRevisionJpaRepository workings, BaselineAdaptiveBlueprintVersionJpaRepository versions,
        BaselineAdaptiveBlueprintRoleJpaRepository roles, BaselineAdaptiveBlueprintSkillJpaRepository skills,
        BaselineBlueprintActivationJpaRepository activations, BaselineBlueprintActivationEventJpaRepository events,
        BaselineBlueprintCommandJpaRepository commands, AdaptiveBlueprintListingJpaRepository listing, PostgresAdvisoryLocks locks) {

    public AdaptiveBlueprintRepositories {
        Objects.requireNonNull(identities); Objects.requireNonNull(workings); Objects.requireNonNull(versions);
        Objects.requireNonNull(roles); Objects.requireNonNull(skills); Objects.requireNonNull(activations);
        Objects.requireNonNull(events); Objects.requireNonNull(commands); Objects.requireNonNull(listing);
        Objects.requireNonNull(locks);
    }

    public static AdaptiveBlueprintRepositories from(AdaptiveAttemptRepositories.Lookup beans, PostgresAdvisoryLocks locks) {
        return new AdaptiveBlueprintRepositories(beans.bean(BaselineBlueprintJpaRepository.class),
                beans.bean(BaselineAdaptiveBlueprintWorkingRevisionJpaRepository.class),
                beans.bean(BaselineAdaptiveBlueprintVersionJpaRepository.class),
                beans.bean(BaselineAdaptiveBlueprintRoleJpaRepository.class), beans.bean(BaselineAdaptiveBlueprintSkillJpaRepository.class),
                beans.bean(BaselineBlueprintActivationJpaRepository.class), beans.bean(BaselineBlueprintActivationEventJpaRepository.class),
                beans.bean(BaselineBlueprintCommandJpaRepository.class), beans.bean(AdaptiveBlueprintListingJpaRepository.class), locks);
    }
}
