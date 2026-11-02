package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineBlueprintCommandEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Immutable Blueprint command receipts keyed by organization, actor and idempotency key. */
public interface BaselineBlueprintCommandJpaRepository
        extends Repository<BaselineBlueprintCommandEntity, BaselineBlueprintCommandEntity.Key>,
        InsertOnlyRepository<BaselineBlueprintCommandEntity> {

    record Row(String occupationId, String operation, String requestHash, String responsePayload, Instant createdAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineBlueprintCommandJpaRepository$Row(c.occupationId, c.operation,
                c.requestHash, c.responsePayload, c.createdAt)
            from BaselineBlueprintCommandEntity c
            where c.organizationId = :org and c.actorId = :actor and c.idempotencyKey = :retry
            """)
    List<Row> receipt(@Param("org") UUID organizationId, @Param("actor") UUID actorId, @Param("retry") String idempotencyKey);
}
