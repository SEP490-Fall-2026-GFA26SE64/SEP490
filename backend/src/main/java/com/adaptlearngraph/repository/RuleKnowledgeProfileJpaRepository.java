package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Source-based own history: only actually assessed groups, accepted evidence and retained review records. */
public interface RuleKnowledgeProfileJpaRepository extends Repository<RuleAssessmentAttemptEntity,UUID> {
    @Query(value="""
            WITH entries AS (
                SELECT 'DIAGNOSTIC'::text AS kind,g.group_id AS id,g.skill_id AS skill_id,g.knowledge_level AS knowledge_level,
                    d->>'skillName' AS skill_name,d->>'skillVersion' AS skill_version,g.outcome_codes AS outcome_codes,
                    a.finished_at AS observed_at,a.purpose AS purpose,a.id AS attempt_id,r.correct_count,r.total_count,r.passed,
                    r.mandatory_satisfied,r.veto_triggered,r.reasons,NULL::text AS source_kind,a.id AS source_id,NULL::text AS review_state
                FROM platform.rule_assessment_attempt a JOIN platform.rule_assessment_group g ON g.attempt_id=a.id
                    AND g.organization_id=a.organization_id AND g.learner_id=a.learner_id
                JOIN platform.rule_assessment_group_result r ON r.attempt_id=g.attempt_id AND r.group_id=g.group_id
                JOIN LATERAL jsonb_array_elements(a.context_snapshot->'context'->'requirements') d
                    ON d->'requirement'->>'skillId'=g.skill_id AND d->'requirement'->>'knowledgeLevel'=g.knowledge_level
                WHERE a.organization_id=:org AND a.learner_id=:learner AND a.state='FINALIZED'
                UNION ALL
                SELECT 'EVIDENCE',e.id,e.skill_id,e.knowledge_level,e.requirement_snapshot->>'skillName',e.requirement_snapshot->>'skillVersion',
                    e.requirement_snapshot->'outcomeCodes',e.achieved_at,NULL,CASE WHEN e.source_kind='MODULE_ASSESSMENT' THEN e.source_id END,
                    NULL,NULL,NULL,NULL,NULL,'[]'::jsonb,e.source_kind,e.source_id,NULL
                FROM platform.skill_knowledge_evidence e WHERE e.organization_id=:org AND e.learner_id=:learner
                UNION ALL
                SELECT 'REVIEW',v.id,v.skill_id,v.knowledge_level,d->>'skillName',d->>'skillVersion',g.outcome_codes,
                    v.created_at,a.purpose,a.id,NULL,NULL,NULL,NULL,NULL,jsonb_build_array(v.reason),'SKILL_ASSESSMENT',v.attempt_id,v.state
                FROM platform.skill_knowledge_review v JOIN platform.rule_assessment_attempt a ON a.id=v.attempt_id
                    AND a.organization_id=v.organization_id AND a.learner_id=v.learner_id
                JOIN platform.rule_assessment_group g ON g.attempt_id=v.attempt_id AND g.group_id=v.group_id
                JOIN LATERAL jsonb_array_elements(a.context_snapshot->'context'->'requirements') d
                    ON d->'requirement'->>'skillId'=g.skill_id AND d->'requirement'->>'knowledgeLevel'=g.knowledge_level
                WHERE v.organization_id=:org AND v.learner_id=:learner
            )
            SELECT kind,id,skill_id AS skillId,knowledge_level AS knowledgeLevel,skill_name AS skillName,skill_version AS skillVersion,
                outcome_codes::text AS outcomeCodes,observed_at AS observedAt,purpose,attempt_id AS attemptId,correct_count AS correctCount,
                total_count AS totalCount,passed,mandatory_satisfied AS mandatorySatisfied,veto_triggered AS vetoTriggered,reasons::text AS reasons,
                source_kind AS sourceKind,source_id AS sourceId,review_state AS reviewState
            FROM entries WHERE (:kind='ALL' OR kind=:kind) ORDER BY observed_at DESC,kind,id LIMIT :limit OFFSET :offset
            """,nativeQuery=true)
    List<Row> page(@Param("org") UUID org,@Param("learner") UUID learner,@Param("kind") String kind,@Param("limit") int limit,@Param("offset") int offset);
    interface Row {
        String getKind();UUID getId();String getSkillId();String getKnowledgeLevel();String getSkillName();String getSkillVersion();String getOutcomeCodes();
        Instant getObservedAt();String getPurpose();UUID getAttemptId();Integer getCorrectCount();Integer getTotalCount();Boolean getPassed();
        Boolean getMandatorySatisfied();Boolean getVetoTriggered();String getReasons();String getSourceKind();UUID getSourceId();String getReviewState();
    }
}
