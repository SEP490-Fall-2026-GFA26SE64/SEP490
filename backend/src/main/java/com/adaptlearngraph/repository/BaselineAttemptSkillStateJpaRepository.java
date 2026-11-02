package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.BaselineAttemptSkillStateEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Running per-skill estimates of an adaptive attempt; organization-scoped, updates are revision-fenced. */
public interface BaselineAttemptSkillStateJpaRepository
        extends Repository<BaselineAttemptSkillStateEntity, BaselineAttemptSkillStateEntity.Key>, InsertOnlyRepository<BaselineAttemptSkillStateEntity> {

    record Row(String microSkillId, BigDecimal theta, BigDecimal standardError, BigDecimal testInformation, Integer answeredCount,
               Long revision, Instant updatedAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAttemptSkillStateJpaRepository$Row(s.microSkillId, s.theta, s.standardError,
                s.testInformation, s.answeredCount, s.revision, s.updatedAt)
            from BaselineAttemptSkillStateEntity s where s.organizationId = :org and s.attemptId = :attempt order by s.microSkillId
            """)
    List<Row> skills(@Param("org") UUID organizationId, @Param("attempt") UUID attemptId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update BaselineAttemptSkillStateEntity s set s.theta = :theta, s.standardError = :se, s.testInformation = :information,
                s.answeredCount = :count, s.revision = :revision, s.updatedAt = :accepted
            where s.attemptId = :attempt and s.organizationId = :org and s.microSkillId = :skill and s.revision = :expected
            """)
    int advance(@Param("org") UUID organizationId, @Param("attempt") UUID attemptId, @Param("skill") String microSkillId,
            @Param("expected") long expectedRevision, @Param("theta") BigDecimal theta, @Param("se") BigDecimal standardError,
            @Param("information") BigDecimal testInformation, @Param("count") int answeredCount, @Param("revision") long revision,
            @Param("accepted") Instant acceptedAt);
}
