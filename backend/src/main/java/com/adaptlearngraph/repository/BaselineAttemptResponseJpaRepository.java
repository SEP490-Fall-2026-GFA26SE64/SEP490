package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAttemptResponseEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Accepted responses of an adaptive attempt; organization-scoped reads and insert-only writes. */
public interface BaselineAttemptResponseJpaRepository
        extends Repository<BaselineAttemptResponseEntity, BaselineAttemptResponseEntity.Key>, InsertOnlyRepository<BaselineAttemptResponseEntity> {

    record Row(Integer position, String responsePayload, Boolean correct, Instant acceptedAt, UUID requestId) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAttemptResponseJpaRepository$Row(r.position, r.responsePayload, r.isCorrect,
                r.acceptedAt, r.requestId)
            from BaselineAttemptResponseEntity r where r.organizationId = :org and r.attemptId = :attempt order by r.position
            """)
    List<Row> responses(@Param("org") UUID organizationId, @Param("attempt") UUID attemptId);
}
