package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAttemptItemEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Items presented in an adaptive attempt; organization-scoped reads and insert-only writes. */
public interface BaselineAttemptItemJpaRepository extends Repository<BaselineAttemptItemEntity, BaselineAttemptItemEntity.Key>,
        InsertOnlyRepository<BaselineAttemptItemEntity> {

    record Row(Integer position, UUID itemVersionId, String microSkillId, String optionOrder, String selectionTrace, Instant presentedAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAttemptItemJpaRepository$Row(i.position, i.itemVersionId, i.microSkillId,
                i.optionOrder, i.selectionTrace, i.presentedAt)
            from BaselineAttemptItemEntity i where i.organizationId = :org and i.attemptId = :attempt order by i.position
            """)
    List<Row> items(@Param("org") UUID organizationId, @Param("attempt") UUID attemptId);

    @Query("""
            select count(i) from BaselineAttemptItemEntity i
            where i.attemptId = :attempt and i.organizationId = :org and i.position = :position and i.microSkillId = :skill
            """)
    long countPresented(@Param("org") UUID organizationId, @Param("attempt") UUID attemptId, @Param("position") int position,
            @Param("skill") String microSkillId);
}
