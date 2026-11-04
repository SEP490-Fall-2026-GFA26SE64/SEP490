package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAttemptCommandEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Exact idempotent attempt command receipts, keyed and read by organization, actor and idempotency key. */
public interface BaselineAttemptCommandJpaRepository
        extends Repository<BaselineAttemptCommandEntity, BaselineAttemptCommandEntity.Key>, InsertOnlyRepository<BaselineAttemptCommandEntity> {

    record Row(String jobPositionId, String operation, String requestHash, UUID attemptId, String responsePayload, Instant createdAt) {}

    @Query("""
            select c.jobPositionId from BaselineAttemptCommandEntity c
            where c.organizationId = :org and c.actorId = :actor and c.idempotencyKey = :key
            """)
    List<String> jobPosition(@Param("org") UUID organizationId, @Param("actor") UUID actorId, @Param("key") String idempotencyKey);

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAttemptCommandJpaRepository$Row(c.jobPositionId, c.operation, c.requestHash,
                c.attemptId, c.responsePayload, c.createdAt)
            from BaselineAttemptCommandEntity c where c.organizationId = :org and c.actorId = :actor and c.idempotencyKey = :key
            """)
    List<Row> receipt(@Param("org") UUID organizationId, @Param("actor") UUID actorId, @Param("key") String idempotencyKey);
}
