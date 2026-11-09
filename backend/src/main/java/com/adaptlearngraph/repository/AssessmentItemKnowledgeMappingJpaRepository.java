package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AssessmentItemKnowledgeMappingEntity;
import java.util.UUID;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.repository.Repository;

public interface AssessmentItemKnowledgeMappingJpaRepository
        extends Repository<AssessmentItemKnowledgeMappingEntity,UUID>, InsertOnlyRepository<AssessmentItemKnowledgeMappingEntity> {
    /** Latest identity first: a draft/unclassified successor never resurrects an older published version. */
    @Query(value="""
            WITH latest AS (
                SELECT DISTINCT ON (i.item_id) i.* FROM platform.item_version i
                JOIN platform.question_bank_scope w ON w.question_bank_id=i.question_bank_id
                WHERE w.organization_id=:org ORDER BY i.item_id,i.version DESC,i.item_version_id
            )
            SELECT d.item_version_id AS itemVersionId,d.prompt AS prompt,d.response_schema::text AS responseSchema,
                d.protected_key::text AS protectedKey,d.content_hash AS contentHash,m.mapping_hash AS mappingHash,
                m.outcome_code AS outcomeCode,m.mandatory AS mandatory
            FROM latest d JOIN platform.assessment_item_knowledge_mapping m ON m.item_version_id=d.item_version_id
                AND m.question_bank_id=d.question_bank_id AND m.organization_id=:org
            JOIN platform.assessment_item_skill_scope scope ON scope.item_version_id=m.item_version_id AND scope.skill_version=:skillVersion
            WHERE d.publication_state='PUBLISHED' AND d.micro_skill_id=m.skill_id
                AND m.skill_id=:skill AND m.knowledge_level=:level
                AND NOT EXISTS (SELECT 1 FROM platform.question_bank_identity q WHERE q.question_id=d.item_id AND q.retired)
            ORDER BY d.item_version_id LIMIT :maximum
            """,nativeQuery=true)
    List<Candidate> eligible(@Param("org") UUID org,@Param("skill") String skill,@Param("level") String level,
            @Param("skillVersion") String skillVersion,@Param("maximum") int maximum);
    /** Same eligibility as paper selection; staff configuration receives only a bounded count. */
    @Query(value="""
            WITH latest AS (
                SELECT DISTINCT ON (i.item_id) i.* FROM platform.item_version i
                JOIN platform.question_bank_scope w ON w.question_bank_id=i.question_bank_id
                WHERE w.organization_id=:org ORDER BY i.item_id,i.version DESC,i.item_version_id
            ) SELECT count(*) FROM (
                SELECT d.item_version_id FROM latest d JOIN platform.assessment_item_knowledge_mapping m ON m.item_version_id=d.item_version_id
                    AND m.question_bank_id=d.question_bank_id AND m.organization_id=:org
                JOIN platform.assessment_item_skill_scope scope ON scope.item_version_id=m.item_version_id AND scope.skill_version=:skillVersion
            WHERE d.publication_state='PUBLISHED' AND d.micro_skill_id=m.skill_id
                    AND m.skill_id=:skill AND m.knowledge_level=:level
                    AND NOT EXISTS (SELECT 1 FROM platform.question_bank_identity q WHERE q.question_id=d.item_id AND q.retired)
                LIMIT 501
            ) available
            """,nativeQuery=true)
    int availableCount(@Param("org") UUID org,@Param("skill") String skill,@Param("level") String level,@Param("skillVersion") String skillVersion);
    @org.springframework.data.jpa.repository.Modifying
    @Query(value="INSERT INTO platform.assessment_item_skill_scope(item_version_id,skill_version,source) VALUES(:item,:version,'PUBLICATION')",nativeQuery=true)
    int bindScope(@Param("item") UUID item,@Param("version") String version);
    interface Candidate {
        UUID getItemVersionId();String getPrompt();String getResponseSchema();String getProtectedKey();
        String getContentHash();String getMappingHash();String getOutcomeCode();boolean getMandatory();
    }
}
