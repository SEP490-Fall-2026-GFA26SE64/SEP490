package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.OutboxEventEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface OutboxEventJpaRepository extends Repository<OutboxEventEntity, UUID>, InsertOnlyRepository<OutboxEventEntity> {
    /** Status of the job handling the newest event of this type for the aggregate. */
    @Query("""
            select j.status from OutboxEventEntity e
            join ProcessingJobEntity j on j.eventId = e.eventId and j.handler = :type
            where e.eventType = :type and e.aggregateId = :aggregateId
            order by e.sourceRevision desc
            """)
    List<String> latestJobStatus(@Param("type") String eventType, @Param("aggregateId") UUID aggregateId, Pageable first);

    /** Idempotent event ({@code ON CONFLICT (event_type, aggregate_id, source_revision) DO NOTHING}) with an empty payload. */
    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.outbox_event(event_id, event_type, aggregate_id, source_revision, payload, correlation_id, created_at)
            VALUES (:id, :type, :aggregate, :revision, '{}'::jsonb, :correlation, :now)
            ON CONFLICT (event_type, aggregate_id, source_revision) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("id") UUID eventId, @Param("type") String eventType, @Param("aggregate") UUID aggregateId,
            @Param("revision") long sourceRevision, @Param("correlation") UUID correlationId, @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update OutboxEventEntity e set e.deliveredAt = :now
            where e.eventId = (select j.eventId from ProcessingJobEntity j where j.jobId = :job)
            """)
    int deliveredByJob(@Param("job") UUID jobId, @Param("now") Instant now);
}
