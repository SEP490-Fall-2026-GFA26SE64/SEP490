package com.adaptlearngraph.repository;

import java.util.Objects;

/** Spring Data repositories behind the adaptive attempt store and outcome adapters (one JPA transaction per attempt boundary). */
public record AdaptiveAttemptRepositories(AdaptiveAttemptJpaRepository attempts, BaselineAttemptPoolItemJpaRepository pool,
        BaselineAttemptItemJpaRepository items, BaselineAttemptResponseJpaRepository responses,
        BaselineAttemptSkillStateJpaRepository skills, BaselineAttemptCommandJpaRepository commands,
        BaselineAttemptResultJpaRepository results, BaselineAttemptSkillResultJpaRepository skillResults,
        BaselineMasteryEvidenceJpaRepository evidence, OutboxEventJpaRepository outbox, AuditEventJpaRepository audit,
        PostgresAdvisoryLocks locks) {

    public AdaptiveAttemptRepositories {
        Objects.requireNonNull(attempts); Objects.requireNonNull(pool); Objects.requireNonNull(items);
        Objects.requireNonNull(responses); Objects.requireNonNull(skills); Objects.requireNonNull(commands);
        Objects.requireNonNull(results); Objects.requireNonNull(skillResults); Objects.requireNonNull(evidence);
        Objects.requireNonNull(outbox); Objects.requireNonNull(audit); Objects.requireNonNull(locks);
    }

    /** Bean lookup, e.g. {@code BeanFactory::getBean}. */
    public interface Lookup {
        <T> T bean(Class<T> type);
    }

    public static AdaptiveAttemptRepositories from(Lookup beans, PostgresAdvisoryLocks locks) {
        return new AdaptiveAttemptRepositories(beans.bean(AdaptiveAttemptJpaRepository.class),
                beans.bean(BaselineAttemptPoolItemJpaRepository.class), beans.bean(BaselineAttemptItemJpaRepository.class),
                beans.bean(BaselineAttemptResponseJpaRepository.class), beans.bean(BaselineAttemptSkillStateJpaRepository.class),
                beans.bean(BaselineAttemptCommandJpaRepository.class), beans.bean(BaselineAttemptResultJpaRepository.class),
                beans.bean(BaselineAttemptSkillResultJpaRepository.class), beans.bean(BaselineMasteryEvidenceJpaRepository.class),
                beans.bean(OutboxEventJpaRepository.class), beans.bean(AuditEventJpaRepository.class), locks);
    }
}
