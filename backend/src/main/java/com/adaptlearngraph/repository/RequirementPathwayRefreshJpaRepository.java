package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.ProcessingJobEntity;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** One recoverable catalog/evidence reconciliation job per original accepted requirement pathway request. */
public interface RequirementPathwayRefreshJpaRepository extends Repository<ProcessingJobEntity,UUID> {
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.processing_job(job_id,event_id,handler)
            SELECT gen_random_uuid(),e.event_id,'RULE_PATHWAY_REFRESH' FROM platform.outbox_event e
            JOIN platform.initial_pathway_request r ON r.request_id=e.aggregate_id AND r.requirement_snapshot_id IS NOT NULL
            WHERE e.event_type='RULE_PATHWAY_REQUESTED'
                AND NOT EXISTS (SELECT 1 FROM platform.processing_job j WHERE j.event_id=e.event_id AND j.handler='RULE_PATHWAY_REFRESH')
            ORDER BY e.created_at,e.event_id LIMIT 10 ON CONFLICT(event_id,handler) DO NOTHING
            """,nativeQuery=true)
    int discover();
    @Query(value="""
            SELECT j.job_id AS jobId,e.event_id AS eventId,r.request_id AS requestId,r.organization_id AS organizationId,r.learner_id AS learnerId
            FROM platform.processing_job j JOIN platform.outbox_event e ON e.event_id=j.event_id AND e.event_type='RULE_PATHWAY_REQUESTED'
            JOIN platform.initial_pathway_request r ON r.request_id=e.aggregate_id AND r.requirement_snapshot_id IS NOT NULL
            WHERE j.handler='RULE_PATHWAY_REFRESH' AND j.status IN ('PENDING','RETRY') AND j.next_retry_at<=clock_timestamp()
            ORDER BY j.next_retry_at,j.created_at,j.job_id LIMIT 1 FOR UPDATE OF j SKIP LOCKED
            """,nativeQuery=true)
    Optional<Work> next();
    interface Work {UUID getJobId();UUID getEventId();UUID getRequestId();UUID getOrganizationId();UUID getLearnerId();}
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.processing_job SET status='RETRY',next_retry_at=clock_timestamp()+interval '30 seconds',
                failure_code=:failure,attempts=attempts+CASE WHEN CAST(:failure AS text) IS NULL THEN 0 ELSE 1 END
            WHERE job_id=:job AND handler='RULE_PATHWAY_REFRESH' AND status IN ('PENDING','RETRY')
            """,nativeQuery=true)
    int later(@Param("job") UUID job,@Param("failure") String failure);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.processing_job SET status='SUCCEEDED',failure_code=NULL WHERE job_id=:job AND handler='RULE_PATHWAY_REFRESH' AND status IN ('PENDING','RETRY')
            """,nativeQuery=true)
    int done(@Param("job") UUID job);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.processing_receipt(event_id,handler,source_revision) VALUES (:event,'RULE_PATHWAY_REFRESH',:revision)
            ON CONFLICT(event_id,handler) DO NOTHING
            """,nativeQuery=true)
    int receipt(@Param("event") UUID event,@Param("revision") long revision);
}
