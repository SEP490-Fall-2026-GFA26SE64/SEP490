package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineManagementCommandEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Immutable baseline management command receipts keyed by the acting account and its idempotency key. */
public interface BaselineManagementCommandJpaRepository
        extends Repository<BaselineManagementCommandEntity, BaselineManagementCommandEntity.Key>,
        InsertOnlyRepository<BaselineManagementCommandEntity> {

    record Row(UUID organizationId, String occupationId, UUID actorId, String idempotencyKey, String operation,
               String requestHash, String responseJson, Instant createdAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineManagementCommandJpaRepository$Row(c.organizationId, c.occupationId,
                c.actorId, c.idempotencyKey, c.operation, c.requestHash, c.responseJson, c.createdAt)
            from BaselineManagementCommandEntity c
            where c.actorId = :actor and c.idempotencyKey = :retry
            """)
    List<Row> receipt(@Param("actor") UUID actorId, @Param("retry") String idempotencyKey);
}
