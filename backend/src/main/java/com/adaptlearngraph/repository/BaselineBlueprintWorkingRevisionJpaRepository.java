package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.BaselineBlueprintWorkingRevisionEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fixed Blueprint working revisions of one organization Occupation series. Saves and closes are scoped revision
 * compare-and-set updates returning their exact row count; the closed-revision trigger stays authoritative.
 */
public interface BaselineBlueprintWorkingRevisionJpaRepository
        extends Repository<BaselineBlueprintWorkingRevisionEntity, UUID>,
        InsertOnlyRepository<BaselineBlueprintWorkingRevisionEntity> {

    record Row(UUID workingRevisionId, UUID organizationId, String occupationId, UUID blueprintId, Integer baseVersion,
               Long revision, String name, String occupationNameSnapshot, String roles, String state, Instant createdAt,
               Instant updatedAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAssessmentSeriesJpaRepository$ScopeRow(w.organizationId,
                w.occupationId)
            from BaselineBlueprintWorkingRevisionEntity w
            where w.organizationId = :org and w.workingRevisionId = :working
            """)
    List<BaselineAssessmentSeriesJpaRepository.ScopeRow> scope(@Param("org") UUID organizationId,
            @Param("working") UUID workingRevisionId);

    @Query("""
            select new com.adaptlearngraph.repository.BaselineBlueprintWorkingRevisionJpaRepository$Row(w.workingRevisionId,
                w.organizationId, w.occupationId, w.blueprintId, w.baseVersion, w.revision, w.name, w.occupationNameSnapshot,
                w.roles, w.state, w.createdAt, w.updatedAt)
            from BaselineBlueprintWorkingRevisionEntity w
            where w.organizationId = :org and w.occupationId = :occupation and w.workingRevisionId = :working
            """)
    List<Row> find(@Param("org") UUID organizationId, @Param("occupation") String occupationId,
            @Param("working") UUID workingRevisionId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update BaselineBlueprintWorkingRevisionEntity w
            set w.revision = w.revision + 1, w.name = :name, w.occupationNameSnapshot = :occupationName, w.roles = :roles,
                w.updatedBy = :actor, w.updatedAt = :time
            where w.organizationId = :org and w.occupationId = :occupation and w.workingRevisionId = :working
              and w.revision = :expected and w.state = 'OPEN'
            """)
    int save(@Param("org") UUID organizationId, @Param("occupation") String occupationId,
            @Param("working") UUID workingRevisionId, @Param("expected") long expectedRevision, @Param("name") String name,
            @Param("occupationName") String occupationNameSnapshot, @Param("roles") String roles, @Param("actor") UUID actorId,
            @Param("time") Instant time);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update BaselineBlueprintWorkingRevisionEntity w
            set w.revision = w.revision + 1, w.state = :state, w.updatedBy = :actor, w.updatedAt = :time, w.closedAt = :time
            where w.organizationId = :org and w.occupationId = :occupation and w.workingRevisionId = :working
              and w.revision = :expected and w.state = 'OPEN'
            """)
    int close(@Param("org") UUID organizationId, @Param("occupation") String occupationId,
            @Param("working") UUID workingRevisionId, @Param("expected") long expectedRevision, @Param("state") String state,
            @Param("actor") UUID actorId, @Param("time") Instant time);
}
