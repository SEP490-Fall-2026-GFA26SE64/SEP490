package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.InitialPathwayRequestEntity;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Initial pathway requests with their current review pointer. Owner reads are scoped by organization and learner, review
 * reads by organization; only the generation worker's claim scans the cross-tenant dispatch queue.
 */
public interface InitialPathwayRequestJpaRepository
        extends Repository<InitialPathwayRequestEntity, UUID>, InsertOnlyRepository<InitialPathwayRequestEntity> {

    record Row(UUID requestId, UUID organizationId, UUID learnerId, UUID selectionId, Long selectionRevision, String planningInputHash,
            String frozenInput, String generationStatus, String reasonCode, String reviewStatus, Long currentRevision,
            String validationStatus, String contentHash) {}

    record ScopeRow(UUID organizationId, UUID learnerId) {}

    String READ = """
            select new com.adaptlearngraph.repository.InitialPathwayRequestJpaRepository$Row(r.requestId, r.organizationId, r.learnerId,
                r.selectionId, r.selectionRevision, r.planningInputHash, r.frozenInput, r.generationStatus, r.reasonCode,
                c.reviewStatus, c.currentRevision, v.validationStatus, v.contentHash)
            from InitialPathwayRequestEntity r
            join InitialPathwayCurrentEntity c on c.requestId = r.requestId
            left join InitialPathwayRevisionEntity v on v.requestId = c.requestId and v.revision = c.currentRevision
            """;

    @Query(READ + "where r.organizationId = :org and r.learnerId = :learner and r.requestId = :id")
    List<Row> request(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId);

    @Query(READ + "where r.organizationId = :org and r.learnerId = :learner and c.archivedAt is null")
    List<Row> current(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);

    @Query(READ + """
            where r.organizationId = :org and r.learnerId = :learner and r.selectionId = :selection
              and r.selectionRevision = :revision and r.planningInputHash = :hash
            """)
    List<Row> equivalent(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("selection") UUID selectionId,
            @Param("revision") long selectionRevision, @Param("hash") String planningInputHash);

    @Query(READ + """
            where r.organizationId = :org and r.requestId in :ids and c.currentRevision is not null and c.archivedAt is null
            order by r.createdAt, r.requestId
            """)
    List<Row> assigned(@Param("org") UUID organizationId, @Param("ids") Collection<UUID> requestIds, Pageable page);

    @Query("""
            select new com.adaptlearngraph.repository.InitialPathwayRequestJpaRepository$ScopeRow(r.organizationId, r.learnerId)
            from InitialPathwayRequestEntity r where r.organizationId = :org and r.requestId = :id
            """)
    List<ScopeRow> scope(@Param("org") UUID organizationId, @Param("id") UUID requestId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update InitialPathwayRequestEntity r set r.generationStatus = 'STALE', r.reasonCode = :reason, r.claimToken = null,
                r.claimWorkerVersion = null, r.leaseExpiresAt = null
            where r.organizationId = :org and r.learnerId = :learner and r.requestId = :id
              and r.generationStatus in ('PENDING', 'GENERATING', 'FAILED_RETRYABLE')
            """)
    int staleRequest(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId,
            @Param("reason") String reasonCode);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update InitialPathwayRequestEntity r set r.generationStatus = 'STALE', r.reasonCode = :reason, r.claimToken = null,
                r.claimWorkerVersion = null, r.leaseExpiresAt = null
            where r.organizationId = :org and r.learnerId = :learner
              and r.generationStatus in ('PENDING', 'GENERATING', 'FAILED_RETRYABLE')
            """)
    int staleLearner(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("reason") String reasonCode);

    // Native: database clock (clock_timestamp()), LIMIT 1 and FOR UPDATE OF r SKIP LOCKED claim across the dispatch queue.
    @Query(value = """
            SELECT r.organization_id,r.learner_id,r.request_id,r.attempts FROM platform.initial_pathway_request r
            JOIN platform.initial_pathway_current c USING(request_id)
            JOIN platform.employee_role_selection s ON s.selection_id=r.selection_id AND s.ended_at IS NULL
            JOIN platform.account a ON a.account_id=r.learner_id AND a.organization_id=r.organization_id AND a.active
            WHERE c.archived_at IS NULL AND c.current_revision IS NULL AND
              ((r.generation_status IN ('PENDING','FAILED_RETRYABLE') AND r.next_retry_at<=clock_timestamp())
               OR (r.generation_status='GENERATING' AND r.lease_expires_at<=clock_timestamp()))
            ORDER BY r.created_at,r.request_id LIMIT 1 FOR UPDATE OF r SKIP LOCKED
            """, nativeQuery = true)
    List<Object[]> claimable();

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update InitialPathwayRequestEntity r set r.generationStatus = 'BLOCKED', r.reasonCode = 'RETRY_EXHAUSTED', r.claimToken = null,
                r.claimWorkerVersion = null, r.leaseExpiresAt = null
            where r.requestId = :id and r.organizationId = :org and r.learnerId = :learner
            """)
    int block(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId);

    // Native: lease deadline from the database clock (clock_timestamp() + interval).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.initial_pathway_request SET generation_status='GENERATING',reason_code=NULL,claim_token=:token,claim_worker_version=:worker,
                lease_expires_at=clock_timestamp()+(:leaseMs * interval '1 millisecond'),attempts=attempts+1
            WHERE request_id=:id AND organization_id=:org AND learner_id=:learner
            """, nativeQuery = true)
    int startGeneration(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId,
            @Param("token") UUID claimToken, @Param("worker") String workerVersion, @Param("leaseMs") long leaseMillis);

    // Native: unexpired-lease check and retry time use the database clock (clock_timestamp()).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.initial_pathway_request r SET generation_status=:status,reason_code=:reason,claim_token=NULL,claim_worker_version=NULL,lease_expires_at=NULL,
                next_retry_at=clock_timestamp()+(:retryMs * interval '1 millisecond')
            WHERE r.organization_id=:org AND r.learner_id=:learner AND r.request_id=:id AND r.generation_status='GENERATING'
              AND r.claim_token=:token AND r.lease_expires_at>clock_timestamp()
              AND EXISTS(SELECT 1 FROM platform.initial_pathway_current c WHERE c.request_id=r.request_id AND c.archived_at IS NULL AND c.current_revision IS NULL)
            """, nativeQuery = true)
    int finish(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId,
            @Param("token") UUID claimToken, @Param("status") String generationStatus, @Param("reason") String reasonCode,
            @Param("retryMs") long retryMillis);

    // Native: jsonb path extraction (#>>) of the frozen binding Role.
    @Query(value = """
            SELECT frozen_input #>> ARRAY['input','binding','roleId'] FROM platform.initial_pathway_request
            WHERE organization_id=:org AND request_id=:id LIMIT 2
            """, nativeQuery = true)
    List<String> bindingRole(@Param("org") UUID organizationId, @Param("id") UUID requestId);

    // Native: jsonb path extraction (#>>) of the frozen binding Role with LIMIT.
    @Query(value = """
            SELECT r.request_id,r.frozen_input #>> ARRAY['input','binding','roleId'] AS role
            FROM platform.initial_pathway_request r JOIN platform.initial_pathway_current c
              ON c.request_id=r.request_id AND c.organization_id=r.organization_id AND c.learner_id=r.learner_id
            WHERE r.organization_id=:org AND c.archived_at IS NULL AND c.current_revision IS NOT NULL
            ORDER BY r.created_at,r.request_id LIMIT :maximum
            """, nativeQuery = true)
    List<Object[]> reviewableWithRole(@Param("org") UUID organizationId, @Param("maximum") long maximum);

    @Query("select count(r) > 0 from InitialPathwayRequestEntity r where r.organizationId = :org and r.requestId = :id")
    boolean exists(@Param("org") UUID organizationId, @Param("id") UUID requestId);

    // Native: jsonb path (#>>) filter on the frozen binding Role.
    @Query(value = """
            SELECT EXISTS(SELECT 1 FROM platform.initial_pathway_request r
                WHERE r.organization_id=:org AND r.request_id=:id AND r.frozen_input #>> ARRAY['input','binding','roleId'] IN (:roles))
            """, nativeQuery = true)
    boolean existsForRoles(@Param("org") UUID organizationId, @Param("id") UUID requestId, @Param("roles") Collection<String> roleIds);

    @Query("""
            select r.requestId from InitialPathwayRequestEntity r
            join InitialPathwayCurrentEntity c on c.requestId = r.requestId and c.organizationId = r.organizationId and c.learnerId = r.learnerId
            where r.organizationId = :org and c.archivedAt is null and c.currentRevision is not null
            order by r.createdAt, r.requestId
            """)
    List<UUID> reviewable(@Param("org") UUID organizationId, Pageable limit);

    // Native: jsonb path (#>>) filter on the frozen binding Role with LIMIT.
    @Query(value = """
            SELECT r.request_id FROM platform.initial_pathway_request r
            JOIN platform.initial_pathway_current c ON c.request_id=r.request_id
              AND c.organization_id=r.organization_id AND c.learner_id=r.learner_id
            WHERE r.organization_id=:org AND c.archived_at IS NULL AND c.current_revision IS NOT NULL
              AND r.frozen_input #>> ARRAY['input','binding','roleId'] IN (:roles)
            ORDER BY r.created_at,r.request_id LIMIT :maximum
            """, nativeQuery = true)
    List<UUID> reviewableForRoles(@Param("org") UUID organizationId, @Param("roles") Collection<String> roleIds,
            @Param("maximum") long maximum);
}
