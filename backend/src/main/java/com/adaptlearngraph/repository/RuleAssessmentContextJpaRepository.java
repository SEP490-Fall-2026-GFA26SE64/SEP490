package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import java.util.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Accepted evidence and real completed module choices; diagnostic scores are never official exemptions. */
public interface RuleAssessmentContextJpaRepository extends Repository<RuleAssessmentAttemptEntity,UUID> {
    @Query(value="""
            SELECT passed FROM platform.latest_knowledge_assessment
            WHERE organization_id=:org AND learner_id=:learner AND skill_id=:skill
                AND knowledge_level=:level AND skill_version=:skillVersion
            """,nativeQuery=true)
    Optional<Boolean> assessed(@Param("org") UUID org,@Param("learner") UUID learner,@Param("skill") String skill,
            @Param("level") String level,@Param("skillVersion") String skillVersion);
    @Query(value="""
            SELECT EXISTS (SELECT 1 FROM platform.rule_assessment_attempt a
                JOIN platform.rule_assessment_group main ON main.attempt_id=a.id AND main.group_role='MAIN'
                    AND main.organization_id=a.organization_id AND main.learner_id=a.learner_id
                JOIN LATERAL jsonb_array_elements(a.context_snapshot->'context'->'requirements') definition
                    ON definition->'requirement'->>'skillId'=main.skill_id AND definition->'requirement'->>'knowledgeLevel'=main.knowledge_level
                WHERE a.organization_id=:org AND a.learner_id=:learner AND a.purpose='SKILL_ASSESSMENT'
                    AND a.state='FINALIZED' AND a.processing_status='PENDING' AND main.skill_id=:skill AND definition->>'skillVersion'=:skillVersion)
            """,nativeQuery=true)
    boolean projectionPending(@Param("org") UUID org,@Param("learner") UUID learner,@Param("skill") String skill,@Param("skillVersion") String skillVersion);
    /** Covers result-worker lag and all entry points sharing a Skill/level/version allowance. */
    @Query(value="""
            SELECT EXISTS (SELECT 1 FROM platform.rule_assessment_attempt a
                JOIN platform.rule_assessment_group main ON main.attempt_id=a.id AND main.group_role='MAIN'
                    AND main.organization_id=a.organization_id AND main.learner_id=a.learner_id
                JOIN LATERAL jsonb_array_elements(a.context_snapshot->'context'->'requirements') main_definition
                    ON main_definition->'requirement'->>'skillId'=main.skill_id AND main_definition->'requirement'->>'knowledgeLevel'=main.knowledge_level
                JOIN platform.rule_assessment_group g ON g.attempt_id=a.id AND g.group_role='PREREQUISITE'
                    AND g.organization_id=a.organization_id AND g.learner_id=a.learner_id
                JOIN platform.rule_assessment_group_result score ON score.attempt_id=g.attempt_id AND score.group_id=g.group_id AND NOT score.passed
                JOIN LATERAL jsonb_array_elements(a.context_snapshot->'context'->'requirements') definition
                    ON definition->'requirement'->>'skillId'=g.skill_id AND definition->'requirement'->>'knowledgeLevel'=g.knowledge_level
                WHERE a.organization_id=:org AND a.learner_id=:learner AND a.purpose='SKILL_ASSESSMENT' AND a.state='FINALIZED'
                    AND main.skill_id=:skill AND main.knowledge_level=:level AND main_definition->>'skillVersion'=:skillVersion
                    AND NOT EXISTS (SELECT 1 FROM platform.initial_pathway_current c JOIN platform.pathway_requirement_step s
                        ON s.request_id=c.request_id AND s.revision=c.current_revision AND s.organization_id=c.organization_id AND s.learner_id=c.learner_id
                        WHERE c.organization_id=a.organization_id AND c.learner_id=a.learner_id AND c.archived_at IS NULL
                            AND c.request_id::text=a.context_snapshot #>> '{context,requestId}' AND s.state='BYPASSED'
                            AND s.skill_id=g.skill_id AND s.knowledge_level=g.knowledge_level AND s.requirement_snapshot->>'skillVersion'=definition->>'skillVersion')
                    AND NOT EXISTS (SELECT 1 FROM platform.latest_knowledge_assessment h WHERE h.organization_id=a.organization_id AND h.learner_id=a.learner_id
                        AND h.skill_id=g.skill_id AND h.knowledge_level=g.knowledge_level AND h.skill_version=definition->>'skillVersion'
                        AND h.passed AND h.finished_at>=a.finished_at)
                    AND NOT EXISTS (SELECT 1 FROM platform.skill_knowledge_evidence e WHERE e.organization_id=a.organization_id AND e.learner_id=a.learner_id
                        AND e.skill_id=g.skill_id AND e.knowledge_level=g.knowledge_level AND e.requirement_snapshot->>'skillVersion'=definition->>'skillVersion'))
            """,nativeQuery=true)
    boolean foundationsPending(@Param("org") UUID org,@Param("learner") UUID learner,@Param("skill") String skill,
            @Param("level") String level,@Param("skillVersion") String skillVersion);
    @Query(value="""
            SELECT e.id AS id,e.source_kind AS sourceKind,e.source_id AS sourceId,e.source_version AS sourceVersion,e.achieved_at AS achievedAt
            FROM platform.skill_knowledge_evidence e
            WHERE e.organization_id=:org AND e.learner_id=:learner AND e.skill_id=:skill AND e.knowledge_level=:level
                AND e.requirement_snapshot->>'skillVersion'=:skillVersion
            ORDER BY e.achieved_at,e.id LIMIT 100
            """,nativeQuery=true)
    List<Official> official(@Param("org") UUID org,@Param("learner") UUID learner,@Param("skill") String skill,
            @Param("level") String level,@Param("skillVersion") String skillVersion);
    interface Official { UUID getId();String getSourceKind();UUID getSourceId();long getSourceVersion();java.time.Instant getAchievedAt(); }
    @Query(value="""
            SELECT s.request_id AS requestId,s.revision AS pathwayRevision,s.skill_id AS skillId,s.knowledge_level AS knowledgeLevel,
                s.requirement_snapshot::text AS requirementSnapshot,o.content_version AS contentVersion,
                s.kind AS kind,s.source_bypass_id AS sourceBypassId
            FROM platform.initial_pathway_current current
            JOIN platform.initial_pathway_request r ON r.request_id=current.request_id AND r.organization_id=current.organization_id
                AND r.learner_id=current.learner_id AND r.requirement_snapshot_id IS NOT NULL
            JOIN platform.pathway_requirement_step s ON s.request_id=r.request_id AND s.revision=current.current_revision
                AND s.organization_id=r.organization_id AND s.learner_id=r.learner_id
            JOIN platform.pathway_requirement_option o ON o.request_id=s.request_id AND o.revision=s.revision AND o.step_id=s.step_id
            JOIN platform.learning_module_completion c ON c.organization_id=CAST(s.organization_id AS text)
                AND c.learner_id=CAST(s.learner_id AS text) AND c.module_id=o.module_id AND c.revision=o.module_revision
                AND c.content_version=o.content_version AND c.skill_id=s.skill_id
            JOIN platform.learning_completion_requirement proof ON proof.organization_id=c.organization_id AND proof.learner_id=c.learner_id
                AND proof.module_id=c.module_id AND proof.revision=c.revision AND proof.knowledge_level=s.knowledge_level
                AND proof.requirement_snapshot->>'skillVersion'=s.requirement_snapshot->>'skillVersion'
            WHERE current.organization_id=:org AND current.learner_id=:learner AND current.archived_at IS NULL
                AND (current.review_status='APPROVED' OR (current.review_status='NONE' AND r.generation_status='NO_LEARNING_REQUIRED' AND s.kind='PARALLEL_SUPPLEMENT'))
                AND r.selection_id=:selection AND r.selection_revision=:selectionRevision
                AND s.step_id=:step AND s.provision='MODULE_ONLY' AND o.module_id=:module AND o.module_revision=:moduleRevision
            """,nativeQuery=true)
    Optional<CompletedOption> completedOption(@Param("org") UUID org,@Param("learner") UUID learner,@Param("selection") UUID selection,
            @Param("selectionRevision") long selectionRevision,@Param("step") UUID step,@Param("module") String module,@Param("moduleRevision") int moduleRevision);
    interface CompletedOption {
        UUID getRequestId();long getPathwayRevision();String getSkillId();String getKnowledgeLevel();String getRequirementSnapshot();
        String getContentVersion();String getKind();UUID getSourceBypassId();
    }
}
