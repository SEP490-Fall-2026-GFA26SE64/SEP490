package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.AssessmentItemEntity;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manifest entries of one assessment version. Callers resolve the owning assessment through an organization-scoped
 * header read or lock first; the frozen-manifest triggers stay authoritative.
 */
public interface AssessmentItemJpaRepository
        extends Repository<AssessmentItemEntity, AssessmentItemEntity.Key>, InsertOnlyRepository<AssessmentItemEntity> {

    /** Answer-safe manifest row: deliberately excludes the protected answer key. */
    record ManifestItem(Integer position, UUID itemVersionId, String roleId, String roleNameSnapshot, BigDecimal scoringWeight,
                        String microSkillId, String microSkillNameSnapshot, String difficulty, String prompt,
                        String responseSchema) {}

    record Entry(Integer position, UUID itemVersionId, Boolean required, BigDecimal scoringWeight, String roleId,
                 String roleNameSnapshot) {}

    @Query("""
            select new com.adaptlearngraph.repository.AssessmentItemJpaRepository$ManifestItem(entry.itemPosition,
                entry.itemVersionId, entry.roleId, entry.roleNameSnapshot, entry.scoringWeight, item.microSkillId,
                item.microSkillNameSnapshot, item.difficulty, item.prompt, item.responseSchema)
            from AssessmentItemEntity entry
            join ItemVersionEntity item on item.itemVersionId = entry.itemVersionId
            where entry.assessmentVersionId = :assessmentVersionId
            order by entry.itemPosition
            """)
    List<ManifestItem> manifest(@Param("assessmentVersionId") UUID assessmentVersionId);

    @Query("""
            select new com.adaptlearngraph.repository.AssessmentItemJpaRepository$Entry(entry.itemPosition, entry.itemVersionId,
                entry.required, entry.scoringWeight, entry.roleId, entry.roleNameSnapshot)
            from AssessmentItemEntity entry
            where entry.assessmentVersionId = :assessmentVersionId
            order by entry.itemPosition
            """)
    List<Entry> entries(@Param("assessmentVersionId") UUID assessmentVersionId);

    // Native: assessment_item is mapped @Immutable, so Hibernate does not allow a JPQL bulk delete of it.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "DELETE FROM platform.assessment_item WHERE assessment_version_id = :assessmentVersionId", nativeQuery = true)
    int deleteManifest(@Param("assessmentVersionId") UUID assessmentVersionId);
}
