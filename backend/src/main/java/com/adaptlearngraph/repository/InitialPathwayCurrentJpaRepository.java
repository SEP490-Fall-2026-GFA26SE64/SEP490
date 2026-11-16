package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.InitialPathwayCurrentEntity;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Current review pointer of initial pathways; every compare-and-set returns its exact row count. */
public interface InitialPathwayCurrentJpaRepository
        extends Repository<InitialPathwayCurrentEntity, UUID>, InsertOnlyRepository<InitialPathwayCurrentEntity> {

    record Pointer(UUID requestId, Long currentRevision) {}

    // Native: archive time from the database clock (clock_timestamp()).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.initial_pathway_current SET review_status='ARCHIVED',archived_at=clock_timestamp()
            WHERE organization_id=:org AND learner_id=:learner AND request_id=:id
            """, nativeQuery = true)
    int archive(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId);

    // Native: FOR UPDATE row lock, so archiving changes exactly the rows read here (former UPDATE ... RETURNING).
    @Query(value = """
            SELECT request_id FROM platform.initial_pathway_current
            WHERE organization_id=:org AND learner_id=:learner AND archived_at IS NULL FOR UPDATE
            """, nativeQuery = true)
    List<UUID> lockOpen(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);

    @Query("""
            select new com.adaptlearngraph.repository.InitialPathwayCurrentJpaRepository$Pointer(c.requestId, c.currentRevision)
            from InitialPathwayCurrentEntity c
            where c.organizationId = :org and c.learnerId = :learner and c.requestId in :ids
            """)
    List<Pointer> pointers(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("ids") Collection<UUID> requestIds);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update InitialPathwayCurrentEntity c set c.reviewStatus = 'ARCHIVED', c.archivedAt = :time
            where c.organizationId = :org and c.learnerId = :learner and c.requestId in :ids and c.archivedAt is null
            """)
    int archiveAt(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("ids") Collection<UUID> requestIds,
            @Param("time") Instant archivedAt);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update InitialPathwayCurrentEntity c set c.currentRevision = 1L, c.reviewStatus = 'AWAITING_EXPERT_REVIEW'
            where c.organizationId = :org and c.learnerId = :learner and c.requestId = :id
              and c.currentRevision is null and c.archivedAt is null
            """)
    int publishFirst(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update InitialPathwayCurrentEntity c set c.currentRevision = :next
            where c.organizationId = :org and c.learnerId = :learner and c.requestId = :id and c.currentRevision = :previous
              and c.reviewStatus = 'AWAITING_EXPERT_REVIEW' and c.archivedAt is null
            """)
    int advance(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId,
            @Param("previous") long previousRevision, @Param("next") long nextRevision);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update InitialPathwayCurrentEntity c set c.reviewStatus = 'APPROVED'
            where c.organizationId = :org and c.learnerId = :learner and c.requestId = :id and c.currentRevision = :revision
              and c.reviewStatus in ('AWAITING_EXPERT_REVIEW','REJECTED') and c.archivedAt is null
              and exists (select 1 from InitialPathwayRevisionEntity v where v.requestId = c.requestId and v.revision = :revision
                  and v.contentHash = :hash and v.validationStatus = 'VALID')
            """)
    int approve(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId,
            @Param("revision") long revision, @Param("hash") String contentHash);
}
