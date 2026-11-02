package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.TargetSelectionRequestEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Idempotent F02 selection command claims, keyed by the acting learner. */
public interface TargetSelectionRequestJpaRepository extends Repository<TargetSelectionRequestEntity, UUID> {

    record Row(UUID requestId, String requestHash, String status, UUID resultSelectionId, Long resultTargetRevision,
            Boolean resultChanged, String outcomeCode) {}

    @Query("""
            select new com.adaptlearngraph.repository.TargetSelectionRequestJpaRepository$Row(r.requestId, r.requestHash, r.status,
                r.resultSelectionId, r.resultTargetRevision, r.resultChanged, r.outcomeCode)
            from TargetSelectionRequestEntity r
            where r.actorId = :actor and r.operation = :operation and r.idempotencyKey = :key
            """)
    List<Row> find(@Param("actor") UUID actorId, @Param("operation") String operation, @Param("key") String idempotencyKey);

    // Native: ON CONFLICT DO NOTHING makes the concurrent claim race return 0 rows instead of failing the transaction.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.target_selection_request (request_id, actor_id, operation, idempotency_key, request_hash, status, created_at)
            VALUES (:requestId, :actorId, :operation, :idempotencyKey, :requestHash, 'PENDING', :createdAt)
            ON CONFLICT (actor_id, operation, idempotency_key) DO NOTHING
            """, nativeQuery = true)
    int claim(@Param("requestId") UUID requestId, @Param("actorId") UUID actorId, @Param("operation") String operation,
            @Param("idempotencyKey") String idempotencyKey, @Param("requestHash") String requestHash, @Param("createdAt") Instant createdAt);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update TargetSelectionRequestEntity r set r.status = 'SUCCEEDED', r.resultSelectionId = :selection,
                r.resultTargetRevision = :revision, r.resultChanged = :changed, r.outcomeCode = null, r.completedAt = :completedAt
            where r.requestId = :request and r.operation = :operation and r.status = 'PENDING'
            """)
    int complete(@Param("request") UUID requestId, @Param("operation") String operation, @Param("selection") UUID selectionId,
            @Param("revision") long targetRevision, @Param("changed") boolean changed, @Param("completedAt") Instant completedAt);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update TargetSelectionRequestEntity r set r.status = 'REJECTED', r.resultSelectionId = null, r.resultTargetRevision = null,
                r.resultChanged = null, r.outcomeCode = :outcome, r.completedAt = :completedAt
            where r.requestId = :request and r.operation = :operation and r.status = 'PENDING'
            """)
    int reject(@Param("request") UUID requestId, @Param("operation") String operation, @Param("outcome") String outcomeCode,
            @Param("completedAt") Instant completedAt);
}
