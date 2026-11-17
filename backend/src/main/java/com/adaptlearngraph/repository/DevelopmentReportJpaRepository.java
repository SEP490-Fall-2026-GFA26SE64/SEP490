package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Read-only L&D development aggregates over the existing pathway, assessment and evidence owners. No writes, no finalization. */
public interface DevelopmentReportJpaRepository extends Repository<RuleAssessmentAttemptEntity,UUID> {
    @Query(value="""
            SELECT r.learner_id AS learnerId,r.request_id AS requestId,r.generation_status AS generationStatus,c.review_status AS reviewStatus,
                r.frozen_input#>>'{input,binding,roleName}' AS roleName,r.frozen_input#>>'{input,binding,levelName}' AS levelName,
                c.timing_started_at AS startedAt,c.timing_deadline_at AS deadlineAt,c.timing_completed_at AS completedAt,
                CASE WHEN c.timing_completed_at IS NOT NULL THEN 'COMPLETED'
                     WHEN c.timing_started_at IS NULL THEN CASE WHEN EXISTS (SELECT 1 FROM platform.initial_pathway_approval a
                         WHERE a.request_id=r.request_id AND a.organization_id=r.organization_id) THEN 'LEGACY_UNTIMED' ELSE 'NOT_STARTED' END
                     WHEN clock_timestamp()>c.timing_deadline_at THEN 'OVERDUE' ELSE 'IN_PROGRESS' END AS timingState,
                count(s.step_id) FILTER (WHERE s.kind='REQUIRED') AS requiredSteps,
                count(s.step_id) FILTER (WHERE s.kind='REQUIRED' AND s.state='FULFILLED') AS fulfilledSteps,
                count(s.step_id) FILTER (WHERE s.kind='REQUIRED' AND s.state='BYPASSED') AS bypassedSteps,
                count(s.step_id) FILTER (WHERE s.kind='REQUIRED' AND s.state='IN_PROGRESS') AS inProgressSteps,
                count(s.step_id) FILTER (WHERE s.kind='REQUIRED' AND s.state='NEEDS_EXPERT_ACTION') AS expertSteps,
                count(s.step_id) FILTER (WHERE s.kind='PARALLEL_SUPPLEMENT') AS supplementSteps
            FROM platform.initial_pathway_request r JOIN platform.initial_pathway_current c ON c.request_id=r.request_id
                AND c.organization_id=r.organization_id AND c.learner_id=r.learner_id AND c.archived_at IS NULL
            LEFT JOIN platform.pathway_requirement_step s ON s.request_id=r.request_id AND s.revision=c.current_revision
                AND s.organization_id=r.organization_id AND s.learner_id=r.learner_id
            WHERE r.organization_id=:org AND r.requirement_snapshot_id IS NOT NULL
            GROUP BY r.request_id,c.review_status,c.timing_started_at,c.timing_deadline_at,c.timing_completed_at
            ORDER BY r.learner_id,r.created_at DESC LIMIT 20000
            """,nativeQuery=true)
    List<PathwayRow> pathways(@Param("org") UUID org);
    interface PathwayRow {
        UUID getLearnerId();UUID getRequestId();String getGenerationStatus();String getReviewStatus();String getRoleName();String getLevelName();
        Instant getStartedAt();Instant getDeadlineAt();Instant getCompletedAt();String getTimingState();
        long getRequiredSteps();long getFulfilledSteps();long getBypassedSteps();long getInProgressSteps();long getExpertSteps();long getSupplementSteps();
    }

    @Query(value="""
            SELECT a.learner_id AS learnerId,count(*) AS attempts,
                count(*) FILTER (WHERE a.state='FINALIZED') AS finalized,
                count(*) FILTER (WHERE a.state='IN_PROGRESS') AS inProgress,
                count(*) FILTER (WHERE a.state='FINALIZED' AND a.purpose='BASELINE') AS baselineFinalized,
                coalesce(sum(g.passed_groups),0) AS passedGroups,coalesce(sum(g.total_groups),0) AS totalGroups,
                max(coalesce(a.finished_at,a.started_at)) AS lastAssessmentAt
            FROM platform.rule_assessment_attempt a
            LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE x.passed AND NOT x.veto_triggered) AS passed_groups,count(*) AS total_groups
                FROM platform.rule_assessment_group_result x WHERE x.attempt_id=a.id) g ON a.state='FINALIZED'
            WHERE a.organization_id=:org GROUP BY a.learner_id
            """,nativeQuery=true)
    List<AssessmentStats> assessmentStats(@Param("org") UUID org);
    interface AssessmentStats {
        UUID getLearnerId();long getAttempts();long getFinalized();long getInProgress();long getBaselineFinalized();
        long getPassedGroups();long getTotalGroups();Instant getLastAssessmentAt();
    }

    @Query(value="""
            SELECT e.learner_id AS learnerId,count(DISTINCT (e.skill_id,e.knowledge_level)) AS achieved,max(e.achieved_at) AS lastAchievedAt,
                (SELECT count(*) FROM platform.skill_knowledge_review r WHERE r.organization_id=e.organization_id AND r.learner_id=e.learner_id
                    AND r.state='NEED_REVIEW') AS needReview
            FROM platform.skill_knowledge_evidence e WHERE e.organization_id=:org GROUP BY e.organization_id,e.learner_id
            """,nativeQuery=true)
    List<EvidenceStats> evidenceStats(@Param("org") UUID org);
    interface EvidenceStats { UUID getLearnerId();long getAchieved();Instant getLastAchievedAt();long getNeedReview(); }

    @Query(value="""
            SELECT c.learner_id AS learnerId,count(*) AS completedModules,max(c.completed_at) AS lastCompletedAt
            FROM platform.learning_module_completion c WHERE c.organization_id=CAST(:org AS text) GROUP BY c.learner_id
            """,nativeQuery=true)
    List<ModuleStats> moduleStats(@Param("org") UUID org);
    interface ModuleStats { String getLearnerId();long getCompletedModules();Instant getLastCompletedAt(); }

    @Query(value="""
            SELECT DISTINCT ON (e.skill_id,e.knowledge_level) e.skill_id AS skillId,e.knowledge_level AS knowledgeLevel,
                coalesce(e.requirement_snapshot->>'skillName',e.skill_id) AS skillName,e.requirement_snapshot->>'skillVersion' AS skillVersion,
                e.source_kind AS sourceKind,e.achieved_at AS achievedAt
            FROM platform.skill_knowledge_evidence e WHERE e.organization_id=:org AND e.learner_id=:learner
            ORDER BY e.skill_id,e.knowledge_level,e.achieved_at DESC,e.id LIMIT 1000
            """,nativeQuery=true)
    List<EvidenceRow> evidence(@Param("org") UUID org,@Param("learner") UUID learner);
    interface EvidenceRow { String getSkillId();String getKnowledgeLevel();String getSkillName();String getSkillVersion();String getSourceKind();Instant getAchievedAt(); }

    @Query(value="""
            SELECT count(*) FROM platform.skill_knowledge_review r WHERE r.organization_id=:org AND r.learner_id=:learner AND r.state='NEED_REVIEW'
            """,nativeQuery=true)
    long needReview(@Param("org") UUID org,@Param("learner") UUID learner);

    @Query(value="""
            SELECT a.id AS attemptId,a.purpose AS purpose,a.state AS state,a.selection_id AS selectionId,a.selection_revision AS selectionRevision,
                a.started_at AS startedAt,a.deadline_at AS deadlineAt,a.finished_at AS finishedAt,a.finish_reason AS finishReason,
                a.context_snapshot#>>'{context,roleName}' AS roleName,a.context_snapshot#>>'{context,levelName}' AS levelName,
                a.context_snapshot#>>'{context,start,stepId}' AS stepId,a.context_snapshot#>>'{context,start,moduleId}' AS moduleId,
                a.context_snapshot#>>'{context,start,moduleRevision}' AS moduleRevision
            FROM platform.rule_assessment_attempt a WHERE a.organization_id=:org AND a.learner_id=:learner
            ORDER BY a.started_at DESC,a.id LIMIT :limit
            """,nativeQuery=true)
    List<AttemptRow> attempts(@Param("org") UUID org,@Param("learner") UUID learner,@Param("limit") int limit);
    interface AttemptRow {
        UUID getAttemptId();String getPurpose();String getState();UUID getSelectionId();long getSelectionRevision();Instant getStartedAt();Instant getDeadlineAt();
        Instant getFinishedAt();String getFinishReason();String getRoleName();String getLevelName();String getStepId();String getModuleId();String getModuleRevision();
    }

    @Query(value="""
            SELECT g.attempt_id AS attemptId,g.group_id AS groupId,g.skill_id AS skillId,g.knowledge_level AS knowledgeLevel,g.group_role AS role,
                coalesce(definition->>'skillName',g.skill_id) AS skillName,
                r.correct_count AS correctCount,r.total_count AS totalCount,r.passed AS passed,r.veto_triggered AS vetoTriggered
            FROM platform.rule_assessment_attempt a JOIN platform.rule_assessment_group g ON g.attempt_id=a.id
                AND g.organization_id=a.organization_id AND g.learner_id=a.learner_id
            JOIN platform.rule_assessment_group_result r ON r.attempt_id=g.attempt_id AND r.group_id=g.group_id
            LEFT JOIN LATERAL (SELECT d AS definition FROM jsonb_array_elements(a.context_snapshot->'context'->'requirements') d
                WHERE d->'requirement'->>'skillId'=g.skill_id AND d->'requirement'->>'knowledgeLevel'=g.knowledge_level LIMIT 1) def ON true
            WHERE a.organization_id=:org AND a.learner_id=:learner AND a.id IN (:attempts) AND a.state='FINALIZED'
            ORDER BY g.attempt_id,g.group_role,g.skill_id,g.knowledge_level LIMIT 5000
            """,nativeQuery=true)
    List<GroupRow> groups(@Param("org") UUID org,@Param("learner") UUID learner,@Param("attempts") Collection<UUID> attempts);
    interface GroupRow {
        UUID getAttemptId();UUID getGroupId();String getSkillId();String getKnowledgeLevel();String getRole();String getSkillName();
        int getCorrectCount();int getTotalCount();boolean getPassed();boolean getVetoTriggered();
    }
}
