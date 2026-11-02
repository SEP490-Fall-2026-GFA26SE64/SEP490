package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAttemptPoolItemEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Frozen item pool of an adaptive attempt; organization-scoped reads and insert-only writes. */
public interface BaselineAttemptPoolItemJpaRepository extends Repository<BaselineAttemptPoolItemEntity, BaselineAttemptPoolItemEntity.Key>,
        InsertOnlyRepository<BaselineAttemptPoolItemEntity> {

    record Row(UUID itemVersionId, String microSkillId) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAttemptPoolItemJpaRepository$Row(p.itemVersionId, p.microSkillId)
            from BaselineAttemptPoolItemEntity p where p.organizationId = :org and p.attemptId = :attempt order by p.itemVersionId
            """)
    List<Row> pool(@Param("org") UUID organizationId, @Param("attempt") UUID attemptId);
}
