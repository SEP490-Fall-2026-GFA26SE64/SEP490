package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.TargetSelectionEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** F02 target selections; every read and write is keyed by the learner. */
public interface TargetSelectionJpaRepository extends Repository<TargetSelectionEntity, UUID>, InsertOnlyRepository<TargetSelectionEntity> {

    record Row(UUID selectionId, UUID learnerId, UUID roleRefId, String roleSnapshot, Instant selectedAt, Instant endedAt,
            Long targetRevision) {}

    String ROW = "select new com.adaptlearngraph.repository.TargetSelectionJpaRepository$Row(s.selectionId, s.learnerId, s.roleRefId, "
            + "s.roleSnapshot, s.selectedAt, s.endedAt, ";

    @Query(ROW + """
            l.targetRevision)
            from TargetSelectionEntity s join LearnerStateEntity l on l.learnerId = s.learnerId
            where s.learnerId = :learner and s.endedAt is null
            """)
    List<Row> active(@Param("learner") UUID learnerId);

    @Query(ROW + """
            r.resultTargetRevision)
            from TargetSelectionEntity s join TargetSelectionRequestEntity r
              on r.actorId = s.learnerId and r.operation = :operation and r.status = 'SUCCEEDED'
             and r.resultSelectionId = s.selectionId and r.resultTargetRevision = :revision
            where s.learnerId = :learner and s.selectionId = :selection
            """)
    List<Row> historical(@Param("learner") UUID learnerId, @Param("selection") UUID selectionId, @Param("revision") long targetRevision,
            @Param("operation") String operation, Pageable first);

    @Query("""
            select count(s) > 0 from TargetSelectionEntity s join AccountEntity a on a.accountId = s.learnerId
            where s.learnerId = :learner and a.organizationId = :org and s.endedAt is null
            """)
    boolean hasOpen(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update TargetSelectionEntity s set s.endedAt = :endedAt
            where s.learnerId = :learner and s.selectionId = :selection and s.endedAt is null
            """)
    int end(@Param("learner") UUID learnerId, @Param("selection") UUID selectionId, @Param("endedAt") Instant endedAt);
}
