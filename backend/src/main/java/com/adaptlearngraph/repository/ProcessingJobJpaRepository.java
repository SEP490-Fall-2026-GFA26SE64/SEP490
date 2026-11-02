package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.ProcessingJobEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Outbox-driven processing jobs. Claiming keeps native {@code FOR UPDATE OF j SKIP LOCKED}; completion and retry are
 * fenced by the claiming lease and the RUNNING state, so an expired worker can never overwrite a newer lease.
 */
public interface ProcessingJobJpaRepository extends Repository<ProcessingJobEntity, UUID>, InsertOnlyRepository<ProcessingJobEntity> {
    record Claimed(UUID jobId, String handler, Integer attempts, UUID aggregateId) {}

    @Query(value = """
            SELECT j.job_id FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
            WHERE j.handler IN ('PAYMENT_CREATE','PAYMENT_RECONCILE','PAYMENT_APPLY')
              AND ((j.status IN ('PENDING','RETRY') AND j.next_retry_at <= :now)
                OR (j.status = 'RUNNING' AND j.lease_expires_at <= :now))
            ORDER BY j.next_retry_at, j.created_at LIMIT 1 FOR UPDATE OF j SKIP LOCKED
            """, nativeQuery = true)
    Optional<UUID> lockNextPaymentJob(@Param("now") Instant now);

    @Query("""
            select new com.adaptlearngraph.repository.ProcessingJobJpaRepository$Claimed(j.jobId, j.handler, j.attempts, e.aggregateId)
            from ProcessingJobEntity j join OutboxEventEntity e on e.eventId = j.eventId where j.jobId = :job
            """)
    Optional<Claimed> claimed(@Param("job") UUID jobId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update ProcessingJobEntity j set j.status = 'RUNNING', j.attempts = j.attempts + 1, j.leaseOwner = :lease,
                j.leaseExpiresAt = :until where j.jobId = :job
            """)
    int lease(@Param("job") UUID jobId, @Param("lease") String lease, @Param("until") Instant until);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update ProcessingJobEntity j set j.status = 'SUCCEEDED', j.leaseOwner = null, j.leaseExpiresAt = null,
                j.failureCode = null where j.jobId = :job and j.leaseOwner = :lease and j.status = 'RUNNING'
            """)
    int finish(@Param("job") UUID jobId, @Param("lease") String lease);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update ProcessingJobEntity j set j.status = :status, j.failureCode = :failure, j.nextRetryAt = :next,
                j.leaseOwner = null, j.leaseExpiresAt = null
            where j.jobId = :job and j.leaseOwner = :lease and j.status = 'RUNNING'
            """)
    int release(@Param("job") UUID jobId, @Param("lease") String lease, @Param("status") String status,
            @Param("failure") String failureCode, @Param("next") Instant nextRetry);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update ProcessingJobEntity j set j.status = 'BLOCKED'
            where j.status = 'FAILED' and j.handler in ('PAYMENT_CREATE', 'PAYMENT_RECONCILE', 'PAYMENT_APPLY')
              and j.eventId in (select e.eventId from OutboxEventEntity e where e.aggregateId = :aggregate)
            """)
    int blockFailedPaymentJobs(@Param("aggregate") UUID aggregateId);

    @Query("""
            select count(j) > 0 from ProcessingJobEntity j join OutboxEventEntity e on e.eventId = j.eventId
            where e.aggregateId = :aggregate and j.handler = :handler and j.status in ('PENDING', 'RUNNING', 'RETRY')
            """)
    boolean active(@Param("aggregate") UUID aggregateId, @Param("handler") String handler);
}
