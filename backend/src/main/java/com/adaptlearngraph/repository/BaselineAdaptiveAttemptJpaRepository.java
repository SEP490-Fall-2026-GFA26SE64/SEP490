package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAdaptiveAttemptEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Adaptive baseline attempts; reads are scoped by learner within the learner's own organization. */
public interface BaselineAdaptiveAttemptJpaRepository extends Repository<BaselineAdaptiveAttemptEntity, UUID> {
    @Query("""
            select count(attempt) > 0 from BaselineAdaptiveAttemptEntity attempt
            join AccountEntity learner on learner.accountId = attempt.learnerId and learner.organizationId = attempt.organizationId
            where attempt.learnerId = :learner and attempt.state = 'IN_PROGRESS'
            """)
    boolean hasInProgress(@Param("learner") UUID learnerId);
}