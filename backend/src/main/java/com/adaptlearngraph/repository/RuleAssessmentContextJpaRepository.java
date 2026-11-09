package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import java.util.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Accepted evidence and real completed module choices; diagnostic scores are never official exemptions. */
public interface RuleAssessmentContextJpaRepository extends Repository<RuleAssessmentAttemptEntity,UUID> {
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
