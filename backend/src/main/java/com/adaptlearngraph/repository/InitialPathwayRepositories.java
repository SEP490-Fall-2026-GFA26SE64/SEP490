package com.adaptlearngraph.repository;

import java.util.Objects;

/** Spring Data repositories behind the initial pathway store, receipts and review assignments (one JPA transaction per command). */
public record InitialPathwayRepositories(InitialPathwayRequestJpaRepository requests, InitialPathwayCurrentJpaRepository current,
        InitialPathwayRevisionJpaRepository revisions, InitialGapSnapshotJpaRepository gaps, InitialPathwayModuleJpaRepository modules,
        InitialPathwayTargetJpaRepository targets, InitialPathwayTeachingV2JpaRepository teaching,
        InitialPathwayDependencyJpaRepository dependencies, InitialPathwayOverrideJpaRepository overrides,
        InitialPathwayApprovalJpaRepository approvals, InitialPathwayRunJpaRepository runs, PathwayActorJpaRepository actors,
        OutboxEventJpaRepository outbox, AuditEventJpaRepository audit) {

    public InitialPathwayRepositories {
        Objects.requireNonNull(requests); Objects.requireNonNull(current); Objects.requireNonNull(revisions);
        Objects.requireNonNull(gaps); Objects.requireNonNull(modules); Objects.requireNonNull(targets);
        Objects.requireNonNull(teaching); Objects.requireNonNull(dependencies); Objects.requireNonNull(overrides);
        Objects.requireNonNull(approvals); Objects.requireNonNull(runs); Objects.requireNonNull(actors);
        Objects.requireNonNull(outbox); Objects.requireNonNull(audit);
    }

    /** Bean lookup, e.g. {@code BeanFactory::getBean}. */
    public interface Lookup {
        <T> T bean(Class<T> type);
    }

    public static InitialPathwayRepositories from(Lookup beans) {
        return new InitialPathwayRepositories(beans.bean(InitialPathwayRequestJpaRepository.class),
                beans.bean(InitialPathwayCurrentJpaRepository.class), beans.bean(InitialPathwayRevisionJpaRepository.class),
                beans.bean(InitialGapSnapshotJpaRepository.class), beans.bean(InitialPathwayModuleJpaRepository.class),
                beans.bean(InitialPathwayTargetJpaRepository.class), beans.bean(InitialPathwayTeachingV2JpaRepository.class),
                beans.bean(InitialPathwayDependencyJpaRepository.class), beans.bean(InitialPathwayOverrideJpaRepository.class),
                beans.bean(InitialPathwayApprovalJpaRepository.class), beans.bean(InitialPathwayRunJpaRepository.class),
                beans.bean(PathwayActorJpaRepository.class), beans.bean(OutboxEventJpaRepository.class),
                beans.bean(AuditEventJpaRepository.class));
    }
}
