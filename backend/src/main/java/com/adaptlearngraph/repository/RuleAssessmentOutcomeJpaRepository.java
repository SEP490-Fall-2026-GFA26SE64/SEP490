package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import com.adaptlearngraph.constants.TransactionManagers;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Existing processing_job queue and exact evidence owners, without another progress or assessment store. */
public interface RuleAssessmentOutcomeJpaRepository extends Repository<RuleAssessmentAttemptEntity,UUID> {
    String HANDLER="RULE_ASSESSMENT_OUTCOME";
    @Query(value="""
            SELECT j.job_id AS jobId,e.event_id AS eventId,e.source_revision AS sourceRevision,a.id AS attemptId,
                a.organization_id AS organizationId,a.learner_id AS learnerId
            FROM platform.processing_job j JOIN platform.outbox_event e ON e.event_id=j.event_id
            JOIN platform.rule_assessment_attempt a ON a.id=e.aggregate_id AND a.state='FINALIZED'
            WHERE j.handler='RULE_ASSESSMENT_OUTCOME' AND e.event_type='RULE_ASSESSMENT_FINALIZED'
                AND a.processing_status='PENDING' AND j.status IN ('PENDING','RETRY') AND j.next_retry_at<=clock_timestamp()
            ORDER BY j.next_retry_at,j.created_at,j.job_id LIMIT 1 FOR UPDATE OF j SKIP LOCKED
            """,nativeQuery=true)
    Optional<Work> lockNext();
    interface Work { UUID getJobId();UUID getEventId();long getSourceRevision();UUID getAttemptId();UUID getOrganizationId();UUID getLearnerId(); }
    @Query(value="""
            SELECT g.group_id AS groupId,g.skill_id AS skillId,g.knowledge_level AS knowledgeLevel,g.outcome_codes::text AS outcomeCodes,
                g.group_role AS role,r.correct_count AS correctCount,r.total_count AS totalCount,r.mandatory_satisfied AS mandatorySatisfied,
                r.passed AS passed,r.veto_triggered AS vetoTriggered,r.reasons::text AS reasons,
                EXISTS (SELECT 1 FROM platform.skill_knowledge_evidence e WHERE e.organization_id=a.organization_id AND e.learner_id=a.learner_id
                    AND e.skill_id=g.skill_id AND e.knowledge_level=g.knowledge_level AND e.requirement_snapshot->>'skillVersion'=definition->>'skillVersion'
                    AND e.requirement_snapshot->'outcomeCodes' @> g.outcome_codes) AS officialNow,
                EXISTS (SELECT 1 FROM platform.skill_knowledge_evidence e WHERE e.organization_id=a.organization_id AND e.learner_id=a.learner_id
                    AND e.skill_id=g.skill_id AND e.knowledge_level=g.knowledge_level AND e.requirement_snapshot->>'skillVersion'=definition->>'skillVersion'
                    AND e.requirement_snapshot->'outcomeCodes' @> g.outcome_codes AND e.achieved_at<=a.finished_at) AS officialAtFinalization
            FROM platform.rule_assessment_attempt a JOIN platform.rule_assessment_group g ON g.attempt_id=a.id
                AND g.organization_id=a.organization_id AND g.learner_id=a.learner_id
            JOIN platform.rule_assessment_group_result r ON r.attempt_id=g.attempt_id AND r.group_id=g.group_id
            JOIN LATERAL jsonb_array_elements(a.context_snapshot->'context'->'requirements') definition
                ON definition->'requirement'->>'skillId'=g.skill_id AND definition->'requirement'->>'knowledgeLevel'=g.knowledge_level
            WHERE a.organization_id=:org AND a.learner_id=:learner AND a.id=:attempt AND a.state='FINALIZED'
            ORDER BY g.skill_id,g.knowledge_level LIMIT 1001
            """,nativeQuery=true)
    List<GroupRow> groups(@Param("org") UUID org,@Param("learner") UUID learner,@Param("attempt") UUID attempt);
    /** A fresh passing prerequisite group cannot erase already discovered formal learning; also covers outbox projection lag. */
    @Query(value="""
            SELECT EXISTS (
                SELECT 1 FROM platform.rule_assessment_attempt current_attempt
                JOIN platform.rule_assessment_attempt prior ON prior.organization_id=current_attempt.organization_id
                    AND prior.learner_id=current_attempt.learner_id
                    AND ((prior.context_snapshot #>> '{context,requestId}'=current_attempt.context_snapshot #>> '{context,requestId}'
                        AND prior.context_snapshot #>> '{context,stepId}'=current_attempt.context_snapshot #>> '{context,stepId}')
                        OR (prior.context_snapshot #>> '{context,stepKind}'='PARALLEL_SUPPLEMENT'
                            AND current_attempt.context_snapshot #>> '{context,stepKind}'='PARALLEL_SUPPLEMENT'
                            AND prior.context_snapshot #>> '{context,sourceBypassId}'=current_attempt.context_snapshot #>> '{context,sourceBypassId}'
                            AND EXISTS (SELECT 1 FROM platform.rule_assessment_group previous_main JOIN platform.rule_assessment_group current_main
                                ON current_main.attempt_id=current_attempt.id AND current_main.group_role='MAIN'
                                    AND current_main.skill_id=previous_main.skill_id AND current_main.knowledge_level=previous_main.knowledge_level
                                    AND current_main.outcome_codes=previous_main.outcome_codes
                                WHERE previous_main.attempt_id=prior.id AND previous_main.group_role='MAIN')))
                    AND prior.purpose='SKILL_ASSESSMENT' AND prior.state='FINALIZED' AND prior.finished_at<=current_attempt.finished_at
                JOIN platform.rule_assessment_group g ON g.attempt_id=prior.id AND g.group_role='PREREQUISITE'
                JOIN platform.rule_assessment_group_result score ON score.attempt_id=g.attempt_id AND score.group_id=g.group_id AND NOT score.passed
                JOIN LATERAL jsonb_array_elements(prior.context_snapshot->'context'->'requirements') definition
                    ON definition->'requirement'->>'skillId'=g.skill_id AND definition->'requirement'->>'knowledgeLevel'=g.knowledge_level
                WHERE current_attempt.organization_id=:org AND current_attempt.learner_id=:learner AND current_attempt.id=:attempt
                    AND NOT EXISTS (SELECT 1 FROM platform.skill_knowledge_evidence e
                        WHERE e.organization_id=prior.organization_id AND e.learner_id=prior.learner_id AND e.skill_id=g.skill_id AND e.knowledge_level=g.knowledge_level
                            AND e.requirement_snapshot->>'skillVersion'=definition->>'skillVersion' AND e.requirement_snapshot->'outcomeCodes' @> g.outcome_codes)
            ) OR EXISTS (
                SELECT 1 FROM platform.rule_assessment_attempt a
                JOIN platform.initial_pathway_current pointer ON pointer.request_id=CAST(a.context_snapshot->'context'->>'requestId' AS uuid)
                    AND pointer.organization_id=a.organization_id AND pointer.learner_id=a.learner_id
                JOIN platform.pathway_requirement_dependency dependency ON dependency.request_id=pointer.request_id AND dependency.revision=pointer.current_revision
                    AND dependency.dependent_step_id=CAST(a.context_snapshot->'context'->>'stepId' AS uuid)
                JOIN platform.pathway_requirement_step prerequisite ON prerequisite.request_id=dependency.request_id AND prerequisite.revision=dependency.revision
                    AND prerequisite.step_id=dependency.prerequisite_step_id AND prerequisite.kind='REQUIRED'
                    AND prerequisite.organization_id=a.organization_id AND prerequisite.learner_id=a.learner_id
                WHERE a.organization_id=:org AND a.learner_id=:learner AND a.id=:attempt
                    AND NOT EXISTS (SELECT 1 FROM platform.skill_knowledge_evidence e
                        WHERE e.organization_id=a.organization_id AND e.learner_id=a.learner_id AND e.skill_id=prerequisite.skill_id AND e.knowledge_level=prerequisite.knowledge_level
                            AND e.requirement_snapshot->>'skillVersion'=prerequisite.requirement_snapshot->>'skillVersion'
                            AND (e.requirement_snapshot->'outcomeCodes') @> (prerequisite.requirement_snapshot->'outcomeCodes'))
            )
            """,nativeQuery=true)
    boolean assignedLearningPending(@Param("org") UUID org,@Param("learner") UUID learner,@Param("attempt") UUID attempt);
    interface GroupRow extends RuleAssessmentAttemptJpaRepository.ResultRow {
        String getSkillId();String getKnowledgeLevel();String getOutcomeCodes();String getRole();
        boolean getOfficialNow();boolean getOfficialAtFinalization();
    }
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.skill_knowledge_review(id,organization_id,learner_id,skill_id,knowledge_level,attempt_id,group_id,state,reason,created_at)
            VALUES (:id,:org,:learner,:skill,:level,:attempt,:group,'NEED_REVIEW','OFFICIAL_PREREQUISITE_GROUP_FAILED',clock_timestamp())
            ON CONFLICT(attempt_id,group_id) DO NOTHING
            """,nativeQuery=true)
    int review(@Param("id") UUID id,@Param("org") UUID org,@Param("learner") UUID learner,@Param("skill") String skill,@Param("level") String level,
            @Param("attempt") UUID attempt,@Param("group") UUID group);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.skill_knowledge_evidence(id,organization_id,learner_id,skill_id,knowledge_level,requirement_snapshot,
                source_kind,source_id,source_version,achieved_at)
            SELECT :id,a.organization_id,a.learner_id,s.skill_id,s.knowledge_level,CAST(:snapshot AS jsonb),'MODULE_ASSESSMENT',a.id,:sourceVersion,clock_timestamp()
            FROM platform.rule_assessment_attempt a
            JOIN platform.pathway_requirement_step s ON s.request_id=:request AND s.revision=:pathwayRevision AND s.step_id=:step
                AND s.organization_id=a.organization_id AND s.learner_id=a.learner_id AND s.skill_id=:skill AND s.knowledge_level=:level AND s.provision='MODULE_ONLY'
            JOIN platform.pathway_requirement_option o ON o.request_id=s.request_id AND o.revision=s.revision AND o.step_id=s.step_id
                AND o.module_id=:module AND o.module_revision=:moduleRevision AND o.content_version=:contentVersion
            JOIN platform.learning_module_completion c ON c.organization_id=CAST(a.organization_id AS text) AND c.learner_id=CAST(a.learner_id AS text)
                AND c.module_id=o.module_id AND c.revision=o.module_revision AND c.skill_id=s.skill_id AND c.content_version=o.content_version
            JOIN platform.learning_completion_requirement proof ON proof.organization_id=c.organization_id AND proof.learner_id=c.learner_id
                AND proof.module_id=c.module_id AND proof.revision=c.revision AND proof.knowledge_level=s.knowledge_level
            WHERE a.id=:attempt AND a.organization_id=:org AND a.learner_id=:learner AND a.purpose='SKILL_ASSESSMENT' AND a.state='FINALIZED'
                AND proof.requirement_snapshot->>'skillVersion'=CAST(:snapshot AS jsonb)->>'skillVersion'
                AND (proof.requirement_snapshot->'outcomeCodes') @> (CAST(:snapshot AS jsonb)->'outcomeCodes')
            ON CONFLICT(organization_id,learner_id,skill_id,knowledge_level,source_kind,source_id,source_version) DO NOTHING
            """,nativeQuery=true)
    int evidence(@Param("id") UUID id,@Param("org") UUID org,@Param("learner") UUID learner,@Param("attempt") UUID attempt,
            @Param("sourceVersion") long sourceVersion,@Param("skill") String skill,@Param("level") String level,@Param("snapshot") String snapshot,
            @Param("request") UUID request,@Param("pathwayRevision") long pathwayRevision,@Param("step") UUID step,
            @Param("module") String module,@Param("moduleRevision") int moduleRevision,@Param("contentVersion") String contentVersion);
    @Query(value="""
            SELECT id FROM platform.skill_knowledge_evidence WHERE organization_id=:org AND learner_id=:learner AND source_id=:attempt
                AND source_kind='MODULE_ASSESSMENT' AND source_version=:sourceVersion AND skill_id=:skill AND knowledge_level=:level
            """,nativeQuery=true)
    Optional<UUID> evidenceId(@Param("org") UUID org,@Param("learner") UUID learner,@Param("attempt") UUID attempt,
            @Param("sourceVersion") long sourceVersion,@Param("skill") String skill,@Param("level") String level);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.rule_assessment_attempt SET processing_status='PROCESSED',revision=revision+1
            WHERE organization_id=:org AND learner_id=:learner AND id=:attempt AND state='FINALIZED' AND processing_status='PENDING'
            """,nativeQuery=true)
    int processed(@Param("org") UUID org,@Param("learner") UUID learner,@Param("attempt") UUID attempt);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.skill_knowledge_review r SET state='RESOLVED',resolved_by_evidence_id=e.id
            FROM platform.skill_knowledge_evidence e,platform.rule_assessment_attempt a,platform.rule_assessment_group g
            WHERE e.id=:evidence AND e.organization_id=:org AND e.learner_id=:learner
                AND r.organization_id=e.organization_id AND r.learner_id=e.learner_id AND r.skill_id=e.skill_id AND r.knowledge_level=e.knowledge_level
                AND r.state='NEED_REVIEW' AND a.finished_at<=e.achieved_at
                AND a.id=r.attempt_id AND a.organization_id=r.organization_id AND a.learner_id=r.learner_id
                AND g.attempt_id=r.attempt_id AND g.group_id=r.group_id AND e.requirement_snapshot->'outcomeCodes' @> g.outcome_codes
                AND EXISTS (SELECT 1 FROM jsonb_array_elements(a.context_snapshot->'context'->'requirements') definition
                    WHERE definition->'requirement'->>'skillId'=r.skill_id AND definition->'requirement'->>'knowledgeLevel'=r.knowledge_level
                        AND definition->>'skillVersion'=e.requirement_snapshot->>'skillVersion')
            """,nativeQuery=true)
    int resolveReviews(@Param("org") UUID org,@Param("learner") UUID learner,@Param("evidence") UUID evidence);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            WITH candidates AS (
                SELECT DISTINCT ON (r.id) r.id,e.id AS evidence_id
                FROM platform.skill_knowledge_review r
                JOIN platform.rule_assessment_attempt a ON a.id=r.attempt_id AND a.organization_id=r.organization_id AND a.learner_id=r.learner_id
                JOIN platform.rule_assessment_group g ON g.attempt_id=r.attempt_id AND g.group_id=r.group_id
                JOIN LATERAL jsonb_array_elements(a.context_snapshot->'context'->'requirements') definition
                    ON definition->'requirement'->>'skillId'=r.skill_id AND definition->'requirement'->>'knowledgeLevel'=r.knowledge_level
                JOIN platform.skill_knowledge_evidence e ON e.organization_id=r.organization_id AND e.learner_id=r.learner_id
                    AND e.skill_id=r.skill_id AND e.knowledge_level=r.knowledge_level AND e.achieved_at>=a.finished_at
                    AND e.requirement_snapshot->>'skillVersion'=definition->>'skillVersion' AND e.requirement_snapshot->'outcomeCodes' @> g.outcome_codes
                WHERE r.organization_id=:org AND r.learner_id=:learner AND r.state='NEED_REVIEW'
                ORDER BY r.id,e.achieved_at DESC,e.id LIMIT 1000
            ) UPDATE platform.skill_knowledge_review r SET state='RESOLVED',resolved_by_evidence_id=c.evidence_id
                FROM candidates c WHERE r.id=c.id AND r.organization_id=:org AND r.learner_id=:learner AND r.state='NEED_REVIEW'
            """,nativeQuery=true)
    int resolveCompatibleReviews(@Param("org") UUID org,@Param("learner") UUID learner);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.processing_job SET status='RETRY',attempts=attempts+1,next_retry_at=clock_timestamp()+interval '30 seconds',failure_code=:reason
            WHERE job_id=:job AND handler='RULE_ASSESSMENT_OUTCOME' AND status IN ('PENDING','RETRY')
            """,nativeQuery=true)
    int retry(@Param("job") UUID job,@Param("reason") String reason);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.processing_job SET status='SUCCEEDED',failure_code=NULL
            WHERE job_id=:job AND handler='RULE_ASSESSMENT_OUTCOME' AND status IN ('PENDING','RETRY')
            """,nativeQuery=true)
    int done(@Param("job") UUID job);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.processing_receipt(event_id,handler,source_revision) VALUES (:event,'RULE_ASSESSMENT_OUTCOME',:revision)
            ON CONFLICT(event_id,handler) DO NOTHING
            """,nativeQuery=true)
    int receipt(@Param("event") UUID event,@Param("revision") long revision);
}
