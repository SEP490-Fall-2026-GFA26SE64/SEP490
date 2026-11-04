package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.BaselineAdaptiveBlueprintWorkingRevisionEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Adaptive Blueprint drafts. Every transition is a scoped compare-and-set returning its exact row count; the history
 * trigger stays authoritative.
 */
public interface BaselineAdaptiveBlueprintWorkingRevisionJpaRepository
        extends Repository<BaselineAdaptiveBlueprintWorkingRevisionEntity, UUID>,
        InsertOnlyRepository<BaselineAdaptiveBlueprintWorkingRevisionEntity> {

    record Open(UUID blueprintId, UUID workingRevisionId, Long revision, String configuration, UUID updatedBy, Instant updatedAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAdaptiveBlueprintWorkingRevisionJpaRepository$Open(w.blueprintId,
                w.workingRevisionId, w.revision, w.configuration, w.updatedBy, w.updatedAt)
            from BaselineAdaptiveBlueprintWorkingRevisionEntity w
            where w.organizationId = :org and w.jobPositionId = :jobPosition and w.state = 'OPEN'
            """)
    List<Open> open(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update BaselineAdaptiveBlueprintWorkingRevisionEntity w set w.revision = :revision, w.configuration = :configuration,
                w.updatedBy = :actor, w.updatedAt = :time
            where w.organizationId = :org and w.jobPositionId = :jobPosition and w.workingRevisionId = :working
              and w.blueprintId = :id and w.revision = :expected and w.state = 'OPEN'
            """)
    int save(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId, @Param("working") UUID workingRevisionId,
            @Param("id") UUID blueprintId, @Param("expected") long expectedRevision, @Param("revision") long revision,
            @Param("configuration") String configuration, @Param("actor") UUID actorId, @Param("time") Instant time);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update BaselineAdaptiveBlueprintWorkingRevisionEntity w set w.state = :state, w.revision = w.revision + 1,
                w.updatedBy = :actor, w.updatedAt = :time, w.closedAt = :time
            where w.organizationId = :org and w.jobPositionId = :jobPosition and w.workingRevisionId = :working
              and w.revision = :expected and w.state = 'OPEN'
            """)
    int close(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId, @Param("working") UUID workingRevisionId,
            @Param("expected") long expectedRevision, @Param("state") String state, @Param("actor") UUID actorId,
            @Param("time") Instant time);

    // Native: jsonb key-existence filter (jsonb_exists) selects only legacy drafts without jobPositionBounds.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.baseline_adaptive_blueprint_working_revision
            SET state='ABANDONED',revision=revision+1,updated_by=:actor,updated_at=:time,closed_at=:time
            WHERE organization_id=:org AND job_position_id=:jobPosition AND working_revision_id=:working
              AND revision=:expected AND state='OPEN' AND NOT jsonb_exists(configuration,'jobPositionBounds')
            """, nativeQuery = true)
    int archiveLegacy(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId,
            @Param("working") UUID workingRevisionId, @Param("expected") long expectedRevision, @Param("actor") UUID actorId,
            @Param("time") Instant time);
}
