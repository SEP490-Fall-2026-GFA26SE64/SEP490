package com.adaptlearngraph.repository;

import java.util.Objects;

/** Spring Data repositories behind the current role selection store; selection, initial pathway archive and events share one JPA transaction. */
public record RoleSelectionRepositories(SelectionLearnerJpaRepository learners, EmployeeRoleSelectionJpaRepository selections,
        EmployeeRoleSelectionRequestJpaRepository requests, TargetSelectionJpaRepository legacySelections,
        PathwayRevisionJpaRepository legacyPathways, InitialPathwayCurrentJpaRepository initialCurrent,
        InitialPathwayRequestJpaRepository initialRequests, OutboxEventJpaRepository outbox, AuditEventJpaRepository audit,
        PostgresAdvisoryLocks locks) {

    public RoleSelectionRepositories {
        Objects.requireNonNull(learners); Objects.requireNonNull(selections); Objects.requireNonNull(requests);
        Objects.requireNonNull(legacySelections); Objects.requireNonNull(legacyPathways); Objects.requireNonNull(initialCurrent);
        Objects.requireNonNull(initialRequests); Objects.requireNonNull(outbox); Objects.requireNonNull(audit);
        Objects.requireNonNull(locks);
    }

    /** Bean lookup, e.g. {@code BeanFactory::getBean}. */
    public interface Lookup {
        <T> T bean(Class<T> type);
    }

    public static RoleSelectionRepositories from(Lookup beans, PostgresAdvisoryLocks locks) {
        return new RoleSelectionRepositories(beans.bean(SelectionLearnerJpaRepository.class),
                beans.bean(EmployeeRoleSelectionJpaRepository.class), beans.bean(EmployeeRoleSelectionRequestJpaRepository.class),
                beans.bean(TargetSelectionJpaRepository.class), beans.bean(PathwayRevisionJpaRepository.class),
                beans.bean(InitialPathwayCurrentJpaRepository.class), beans.bean(InitialPathwayRequestJpaRepository.class),
                beans.bean(OutboxEventJpaRepository.class), beans.bean(AuditEventJpaRepository.class), locks);
    }
}
