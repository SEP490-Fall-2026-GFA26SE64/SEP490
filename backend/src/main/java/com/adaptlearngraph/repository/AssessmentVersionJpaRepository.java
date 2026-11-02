package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AssessmentVersionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Generated assessment versions; every read is scoped by the owning organization's baseline series. */
public interface AssessmentVersionJpaRepository extends Repository<AssessmentVersionEntity, UUID> {
    /** Answer keys of one organization's baseline assessment, in manifest order. Never mapped to a response DTO directly. */
    record AnswerKey(UUID itemVersionId, String protectedKey) {
        @Override public String toString() { return "AnswerKey[" + itemVersionId + "]"; }
    }

    @Query("""
            select new com.adaptlearngraph.repository.AssessmentVersionJpaRepository$AnswerKey(item.itemVersionId, item.protectedKey)
            from AssessmentVersionEntity assessment
            join BaselineAssessmentSeriesEntity series on series.blueprintId = assessment.blueprintId
            join AssessmentItemEntity manifest on manifest.assessmentVersionId = assessment.assessmentVersionId
            join ItemVersionEntity item on item.itemVersionId = manifest.itemVersionId
            where series.organizationId = :organization and assessment.assessmentVersionId = :assessment
              and assessment.purpose = 'BASELINE'
            order by manifest.itemPosition
            """)
    List<AnswerKey> answerKeys(@Param("organization") UUID organizationId, @Param("assessment") UUID assessmentVersionId);
}