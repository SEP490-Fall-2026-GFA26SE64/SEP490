package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.ManualLearningPathwayEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Organization-scoped, insert-only manual learning pathways. Callers pass organization/learner ids as text, so the
 * UUID columns are compared through their text form exactly as before (an unknown id simply matches nothing).
 */
public interface ManualLearningPathwayJpaRepository
        extends Repository<ManualLearningPathwayEntity, UUID>, InsertOnlyRepository<ManualLearningPathwayEntity> {

    record Row(UUID id, UUID learnerId, UUID expertId, String title, String moduleIds, Instant confirmedAt) {}

    String ROW = "select new com.adaptlearngraph.repository.ManualLearningPathwayJpaRepository$Row(p.id, p.learnerId, p.expertId,"
            + " p.title, p.moduleIds, p.confirmedAt) from ManualLearningPathwayEntity p"
            + " where cast(p.organizationId as String) = :organization";

    @Query(ROW + " order by p.confirmedAt desc")
    List<Row> pathways(@Param("organization") String organizationId);

    @Query(ROW + " and cast(p.learnerId as String) = :learner order by p.confirmedAt desc")
    List<Row> pathways(@Param("organization") String organizationId, @Param("learner") String learnerId);
}
