package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayRequestEntity;
import com.adaptlearngraph.constants.TransactionManagers;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Requirement projections on the existing initial request/revision/review owner. Native JSON batching keeps one atomic bounded projection write. */
public interface RequirementPathwayJpaRepository extends Repository<InitialPathwayRequestEntity,UUID> {
    @Query(value="""
            SELECT module_id FROM (
                SELECT DISTINCT ON (module_id) module_id,action FROM platform.initial_pathway_override
                WHERE organization_id=:org AND request_id=:request AND next_revision<=:revision
                    AND action IN ('INCLUDE','EXCLUDE') ORDER BY module_id,next_revision DESC,created_at DESC
            ) latest WHERE action='EXCLUDE'
            """,nativeQuery=true)
    List<String> excludedModules(@Param("org") UUID org,@Param("request") UUID request,@Param("revision") long revision);
    String READ="""
            SELECT r.request_id AS requestId,r.organization_id AS organizationId,r.learner_id AS learnerId,r.selection_id AS selectionId,
                r.selection_revision AS selectionRevision,r.planning_input_hash AS planningInputHash,r.frozen_input::text AS frozenInput,
                r.generation_status AS generationStatus,r.reason_code AS reasonCode,r.created_at AS createdAt,r.flow_version AS flowVersion,
                r.frozen_input#>>'{input,binding,roleName}' AS roleName,r.frozen_input#>>'{input,binding,levelName}' AS levelName,
                c.current_revision AS currentRevision,c.review_status AS reviewStatus,c.archived_at AS archivedAt,
                c.timing_duration_months AS timingDurationMonths,c.timing_started_at AS timingStartedAt,
                c.timing_deadline_at AS timingDeadlineAt,c.timing_completed_at AS timingCompletedAt,c.timing_on_time AS timingOnTime,
                EXISTS (SELECT 1 FROM platform.initial_pathway_approval a WHERE a.request_id=r.request_id AND a.organization_id=r.organization_id) AS previouslyApproved,
                v.content_hash AS contentHash,v.content::text AS content,v.approval_basis_revision AS approvalBasisRevision,v.run_id AS runId
            FROM platform.initial_pathway_request r JOIN platform.initial_pathway_current c ON c.request_id=r.request_id
                AND c.organization_id=r.organization_id AND c.learner_id=r.learner_id
            LEFT JOIN platform.initial_pathway_revision v ON v.request_id=r.request_id AND v.revision=c.current_revision
                AND v.organization_id=r.organization_id AND v.learner_id=r.learner_id AND v.format_version=3
            """;
    interface Row {
        UUID getRequestId();UUID getOrganizationId();UUID getLearnerId();UUID getSelectionId();long getSelectionRevision();
        String getPlanningInputHash();String getFrozenInput();String getGenerationStatus();String getReasonCode();Instant getCreatedAt();String getFlowVersion();
        Long getCurrentRevision();String getReviewStatus();Instant getArchivedAt();String getContentHash();String getContent();Long getApprovalBasisRevision();UUID getRunId();
        Integer getTimingDurationMonths();Instant getTimingStartedAt();Instant getTimingDeadlineAt();Instant getTimingCompletedAt();Boolean getTimingOnTime();boolean getPreviouslyApproved();
        String getRoleName();String getLevelName();
    }
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.initial_pathway_current c SET timing_duration_months=:months,timing_basis=CAST(:basis AS jsonb),
                timing_started_at=:start,timing_deadline_at=:deadline
            WHERE c.organization_id=:org AND c.learner_id=:learner AND c.request_id=:request AND c.timing_started_at IS NULL
                AND NOT EXISTS (SELECT 1 FROM platform.initial_pathway_approval a WHERE a.request_id=c.request_id AND a.organization_id=c.organization_id)
            """,nativeQuery=true)
    int startTiming(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("months") int months,
                    @Param("basis") String basis,@Param("start") Instant start,@Param("deadline") Instant deadline);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.initial_pathway_current SET timing_completed_at=:now,
                timing_on_time=CASE WHEN timing_deadline_at IS NULL THEN NULL ELSE :now<=timing_deadline_at END
            WHERE organization_id=:org AND learner_id=:learner AND request_id=:request AND review_status='APPROVED'
                AND timing_completed_at IS NULL
            """,nativeQuery=true)
    int completeTiming(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("now") Instant now);
    @Query(value="""
            SELECT greatest(coalesce(c.timing_started_at,(SELECT min(a.confirmed_at) FROM platform.initial_pathway_approval a
                    WHERE a.request_id=c.request_id AND a.organization_id=c.organization_id)),
                (SELECT max(CASE WHEN s.state='FULFILLED' THEN e.achieved_at ELSE b.decided_at END)
                 FROM platform.pathway_requirement_step s
                 LEFT JOIN platform.skill_knowledge_evidence e ON e.id=s.fulfilled_evidence_id
                    AND e.organization_id=s.organization_id AND e.learner_id=s.learner_id
                 LEFT JOIN LATERAL (SELECT max(x.decided_at) AS decided_at FROM platform.pathway_requirement_bypass x
                    WHERE x.request_id=s.request_id AND x.step_id=s.step_id AND x.revision<=s.revision
                        AND x.organization_id=s.organization_id AND x.learner_id=s.learner_id) b ON true
                 WHERE s.request_id=c.request_id AND s.revision=:revision AND s.organization_id=c.organization_id
                    AND s.learner_id=c.learner_id AND s.kind='REQUIRED'))
            FROM platform.initial_pathway_current c WHERE c.organization_id=:org AND c.learner_id=:learner AND c.request_id=:request
                AND c.current_revision=:revision AND c.review_status='APPROVED'
            """,nativeQuery=true)
    Optional<Instant> completionTime(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("revision") long revision);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.initial_pathway_current SET review_status='REJECTED'
            WHERE organization_id=:org AND learner_id=:learner AND request_id=:request AND current_revision=:revision
                AND review_status='AWAITING_EXPERT_REVIEW' AND archived_at IS NULL
            """,nativeQuery=true)
    int reject(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("revision") long revision);
    @Query(value="SELECT EXISTS (SELECT 1 FROM platform.initial_pathway_revision WHERE organization_id=:org AND learner_id=:learner AND request_id=:request AND source_event_id=:event AND format_version=3)",nativeQuery=true)
    boolean sourceApplied(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("event") UUID event);
    @Query(value="""
            SELECT EXISTS (SELECT 1 FROM platform.initial_pathway_revision v JOIN platform.initial_pathway_approval a
                ON a.request_id=v.request_id AND a.revision=coalesce(v.approval_basis_revision,v.revision) AND a.organization_id=v.organization_id
            JOIN platform.initial_pathway_revision basis ON basis.request_id=a.request_id AND basis.revision=a.revision AND basis.content_hash=a.content_hash
            WHERE v.organization_id=:org AND v.learner_id=:learner AND v.request_id=:request AND v.revision=:revision AND v.format_version=3 AND v.validation_status='VALID')
            """,nativeQuery=true)
    boolean historicallyApproved(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("revision") long revision);
    @Query(value=READ+" WHERE r.organization_id=:org AND r.learner_id=:learner AND c.archived_at IS NULL AND r.requirement_snapshot_id IS NOT NULL LIMIT 2",nativeQuery=true)
    List<Row> current(@Param("org") UUID org,@Param("learner") UUID learner);
    @Query(value=READ+" WHERE r.organization_id=:org AND r.learner_id=:learner AND r.request_id=:id AND r.requirement_snapshot_id IS NOT NULL",nativeQuery=true)
    Optional<Row> own(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id);
    /** Caller first verifies the current assigned Expert; this lookup never accepts a client tenant. */
    @Query(value=READ+" WHERE r.organization_id=:org AND r.request_id=:id AND r.requirement_snapshot_id IS NOT NULL",nativeQuery=true)
    Optional<Row> ownForExpert(@Param("org") UUID org,@Param("id") UUID id);
    @Query(value=READ+" WHERE r.organization_id=:org AND r.request_id=:id AND r.requirement_snapshot_id IS NOT NULL FOR UPDATE OF r,c",nativeQuery=true)
    Optional<Row> lock(@Param("org") UUID org,@Param("id") UUID id);
    @Query(value=READ+" WHERE r.organization_id=:org AND r.request_id IN (:ids) AND c.archived_at IS NULL AND r.requirement_snapshot_id IS NOT NULL ORDER BY r.created_at,r.request_id LIMIT :limit OFFSET :offset",nativeQuery=true)
    List<Row> assigned(@Param("org") UUID org,@Param("ids") Collection<UUID> ids,@Param("offset") int offset,@Param("limit") int limit);
    @Query(value="""
            SELECT r.request_id AS requestId,r.organization_id AS organizationId,r.learner_id AS learnerId
            FROM platform.initial_pathway_request r JOIN platform.initial_pathway_current c ON c.request_id=r.request_id
                AND c.organization_id=r.organization_id AND c.learner_id=r.learner_id
            JOIN platform.employee_role_selection s ON s.selection_id=r.selection_id AND s.organization_id=r.organization_id
                AND s.learner_id=r.learner_id AND s.target_revision=r.selection_revision AND s.ended_at IS NULL
            WHERE r.requirement_snapshot_id IS NOT NULL AND c.archived_at IS NULL AND c.current_revision IS NULL
                AND EXISTS (SELECT 1 FROM platform.account a WHERE a.account_id=r.learner_id AND a.organization_id=r.organization_id AND a.active)
                AND ((r.generation_status IN ('PENDING','FAILED_RETRYABLE') AND r.next_retry_at<=clock_timestamp())
                    OR (r.generation_status='GENERATING' AND r.lease_expires_at<=clock_timestamp()))
            ORDER BY r.next_retry_at,r.created_at,r.request_id LIMIT 1 FOR UPDATE OF r SKIP LOCKED
            """,nativeQuery=true)
    Optional<QueueRow> next();
    interface QueueRow { UUID getRequestId();UUID getOrganizationId();UUID getLearnerId(); }
    @Query("select r.attempts from InitialPathwayRequestEntity r where r.organizationId=:org and r.learnerId=:learner and r.requestId=:id and r.requirementSnapshotId is not null")
    Optional<Integer> attempts(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id);
    @Query(value="""
            SELECT r.attempts-coalesce((SELECT max(e.source_revision) FROM platform.outbox_event e
                WHERE e.aggregate_id=r.request_id AND e.event_type='RULE_PATHWAY_GENERATION_RETRY_REQUESTED'),0)
            FROM platform.initial_pathway_request r WHERE r.organization_id=:org AND r.learner_id=:learner AND r.request_id=:id AND r.requirement_snapshot_id IS NOT NULL
            """,nativeQuery=true)
    Optional<Integer> automaticAttempts(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.initial_pathway_request r SET generation_status='PENDING',reason_code=NULL,next_retry_at=clock_timestamp(),claim_token=NULL,claim_worker_version=NULL,lease_expires_at=NULL
            FROM platform.initial_pathway_current c WHERE r.organization_id=:org AND r.learner_id=:learner AND r.request_id=:id AND r.requirement_snapshot_id IS NOT NULL
                AND c.request_id=r.request_id AND c.organization_id=r.organization_id AND c.learner_id=r.learner_id
                AND c.archived_at IS NULL AND c.current_revision IS NULL AND r.generation_status IN ('BLOCKED','FAILED_RETRYABLE','STALE')
            """,nativeQuery=true)
    int requestRetry(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id);
    @Modifying(flushAutomatically=true,clearAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query(value="""
            UPDATE platform.initial_pathway_current SET current_revision=:next,review_status=:status
            WHERE organization_id=:org AND learner_id=:learner AND request_id=:id AND archived_at IS NULL
                AND ((CAST(:expected AS bigint) IS NULL AND current_revision IS NULL) OR current_revision=CAST(:expected AS bigint))
            """,nativeQuery=true)
    int publish(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id,@Param("expected") Long expected,@Param("next") long next,@Param("status") String status);
    @Modifying(flushAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.pathway_requirement_step(request_id,revision,step_id,organization_id,learner_id,skill_id,knowledge_level,
                requirement_snapshot,provision,certificate_id,certificate_version,kind,source_bypass_id,state,reason,ordinal,fulfilled_evidence_id)
            SELECT :request,:revision,CAST(step->>'id' AS uuid),:org,:learner,step->'requirement'->>'skillId',step->'requirement'->>'knowledgeLevel',
                step->'requirement',step->'requirement'->>'provision',step->'certificate'->>'id',step->'certificate'->>'version',step->>'kind',
                CAST(step->>'sourceBypassId' AS uuid),step->>'state',step->>'reason',ordinal::integer,CAST(step->>'fulfilledEvidenceId' AS uuid)
            FROM jsonb_array_elements(CAST(:plan AS jsonb)->'steps') WITH ORDINALITY AS projected(step,ordinal)
            """,nativeQuery=true)
    int steps(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("revision") long revision,@Param("plan") String plan);
    @Modifying(flushAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.pathway_requirement_option(request_id,revision,step_id,module_id,content_version,module_revision,compatibility_snapshot)
            SELECT :request,:revision,CAST(step->>'id' AS uuid),option->>'moduleId',option->>'contentVersion',CAST(option->>'moduleRevision' AS integer),option
            FROM jsonb_array_elements(CAST(:plan AS jsonb)->'steps') step CROSS JOIN LATERAL jsonb_array_elements(step->'options') option
            WHERE EXISTS (SELECT 1 FROM platform.pathway_requirement_step s WHERE s.request_id=:request AND s.revision=:revision
                AND s.step_id=CAST(step->>'id' AS uuid) AND s.organization_id=:org AND s.learner_id=:learner)
            """,nativeQuery=true)
    int options(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("revision") long revision,@Param("plan") String plan);
    @Modifying(flushAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.pathway_requirement_dependency(request_id,revision,prerequisite_step_id,dependent_step_id,assessed_source)
            SELECT :request,:revision,CAST(dependency->>'prerequisiteStepId' AS uuid),CAST(dependency->>'dependentStepId' AS uuid),
                jsonb_build_object('attemptId',dependency->>'attemptId','groupId',dependency->>'groupId')
            FROM jsonb_array_elements(CAST(:plan AS jsonb)->'dependencies') dependency
            WHERE EXISTS (SELECT 1 FROM platform.initial_pathway_revision v WHERE v.request_id=:request AND v.revision=:revision
                AND v.organization_id=:org AND v.learner_id=:learner AND v.format_version=3)
            """,nativeQuery=true)
    int dependencies(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("revision") long revision,@Param("plan") String plan);
    @Query(value="""
            SELECT DISTINCT ON (required->>'skillId',required->>'knowledgeLevel',required->>'skillVersion')
                required::text AS requirementSnapshot,e.id AS evidenceId
            FROM jsonb_array_elements(CAST(:requirements AS jsonb)) required JOIN platform.skill_knowledge_evidence e
                ON e.organization_id=:org AND e.learner_id=:learner AND e.skill_id=required->>'skillId' AND e.knowledge_level=required->>'knowledgeLevel'
                AND e.requirement_snapshot->>'skillVersion'=required->>'skillVersion'
            ORDER BY required->>'skillId',required->>'knowledgeLevel',required->>'skillVersion',e.achieved_at DESC,e.id
            """,nativeQuery=true)
    List<Official> official(@Param("org") UUID org,@Param("learner") UUID learner,@Param("requirements") String requirements);
    interface Official {String getRequirementSnapshot();UUID getEvidenceId();}
    @Query(value="""
            SELECT b.id AS bypassId,s.requirement_snapshot::text AS requirementSnapshot,b.reason AS reason
            FROM platform.initial_pathway_current c JOIN platform.initial_pathway_request r ON r.request_id=c.request_id
                AND r.organization_id=c.organization_id AND r.learner_id=c.learner_id AND r.requirement_snapshot_id IS NOT NULL
            JOIN platform.initial_pathway_revision v ON v.request_id=c.request_id AND v.revision=c.current_revision AND v.format_version=3
            JOIN platform.pathway_requirement_step s ON s.request_id=v.request_id AND s.revision=v.revision AND s.kind='REQUIRED' AND s.state='BYPASSED'
                AND s.organization_id=r.organization_id AND s.learner_id=r.learner_id
            JOIN platform.pathway_requirement_bypass b ON b.request_id=s.request_id AND b.step_id=s.step_id AND b.revision<=s.revision
                AND b.organization_id=s.organization_id AND b.learner_id=s.learner_id
            WHERE c.organization_id=:org AND c.learner_id=:learner AND c.archived_at IS NOT NULL AND r.selection_id<>:selection
                AND NOT EXISTS (SELECT 1 FROM platform.pathway_requirement_bypass newer WHERE newer.supersedes_id=b.id)
                AND EXISTS (SELECT 1 FROM platform.initial_pathway_approval approval JOIN platform.initial_pathway_revision basis
                    ON basis.request_id=approval.request_id AND basis.revision=approval.revision AND basis.content_hash=approval.content_hash
                    WHERE approval.request_id=r.request_id AND approval.revision=coalesce(v.approval_basis_revision,v.revision)
                        AND approval.organization_id=r.organization_id)
            ORDER BY b.decided_at,b.id LIMIT 1001
            """,nativeQuery=true)
    List<Carried> carried(@Param("org") UUID org,@Param("learner") UUID learner,@Param("selection") UUID selection);
    interface Carried {UUID getBypassId();String getRequirementSnapshot();String getReason();}
    /** Retain actual unresolved descendants of parallel work across further target changes, even if result projection was delayed. */
    @Query(value="""
            SELECT DISTINCT ON (b.id,g.skill_id,g.knowledge_level) b.id AS bypassId,
                jsonb_build_object('skillId',g.skill_id,'skillName',definition->>'skillName','knowledgeLevel',g.knowledge_level,
                    'skillVersion',definition->>'skillVersion','provision',definition->>'mode')::text AS requirementSnapshot,
                'ASSESSED_PREREQUISITE_REQUIRES_LEARNING' AS reason,a.id AS attemptId,g.group_id AS groupId,
                CAST(a.context_snapshot->'context'->>'requestId' AS uuid) AS sourceRequestId,CAST(a.context_snapshot->'context'->>'stepId' AS uuid) AS dependentStepId
            FROM platform.rule_assessment_attempt a JOIN platform.rule_assessment_group g ON g.attempt_id=a.id AND g.group_role='PREREQUISITE'
                AND g.organization_id=a.organization_id AND g.learner_id=a.learner_id
            JOIN platform.rule_assessment_group_result score ON score.attempt_id=g.attempt_id AND score.group_id=g.group_id AND NOT score.passed
            JOIN LATERAL jsonb_array_elements(a.context_snapshot->'context'->'requirements') definition
                ON definition->'requirement'->>'skillId'=g.skill_id AND definition->'requirement'->>'knowledgeLevel'=g.knowledge_level
            JOIN platform.pathway_requirement_bypass b ON b.id=CAST(a.context_snapshot->'context'->>'sourceBypassId' AS uuid)
                AND b.organization_id=a.organization_id AND b.learner_id=a.learner_id
            JOIN platform.initial_pathway_current previous ON previous.request_id=CAST(a.context_snapshot->'context'->>'requestId' AS uuid)
                AND previous.organization_id=a.organization_id AND previous.learner_id=a.learner_id AND previous.archived_at IS NOT NULL
            WHERE a.organization_id=:org AND a.learner_id=:learner AND a.purpose='SKILL_ASSESSMENT' AND a.state='FINALIZED'
                AND a.context_snapshot->'context'->>'stepKind'='PARALLEL_SUPPLEMENT'
                AND NOT EXISTS (SELECT 1 FROM platform.skill_knowledge_evidence e WHERE e.organization_id=a.organization_id AND e.learner_id=a.learner_id
                    AND e.skill_id=g.skill_id AND e.knowledge_level=g.knowledge_level AND e.requirement_snapshot->>'skillVersion'=definition->>'skillVersion')
            ORDER BY b.id,g.skill_id,g.knowledge_level,a.finished_at,a.id,g.group_id LIMIT 1001
            """,nativeQuery=true)
    List<ParallelNeed> parallelNeeds(@Param("org") UUID org,@Param("learner") UUID learner);
    interface ParallelNeed extends Carried {UUID getAttemptId();UUID getGroupId();UUID getSourceRequestId();UUID getDependentStepId();}
    /** An authentic pin must follow an accepted exact option; skill-only self-study rows grant no pathway access. */
    @Query(value="""
            SELECT DISTINCT ON (p.module_id,p.revision,s.skill_id,s.knowledge_level,s.requirement_snapshot->>'skillVersion')
                s.requirement_snapshot::text AS requirementSnapshot,p.module_id AS moduleId,p.revision AS moduleRevision,p.started_at AS startedAt,
                o.content_version AS contentVersion
            FROM platform.module_learning_pin p
            JOIN platform.pathway_requirement_option o ON o.module_id=p.module_id AND o.module_revision=p.revision
            JOIN platform.pathway_requirement_step s ON s.request_id=o.request_id AND s.revision=o.revision AND s.step_id=o.step_id
                AND CAST(s.organization_id AS text)=p.organization_id AND CAST(s.learner_id AS text)=p.learner_id
            JOIN platform.initial_pathway_revision v ON v.request_id=s.request_id AND v.revision=s.revision AND v.format_version=3 AND v.validation_status='VALID'
            JOIN platform.initial_pathway_request r ON r.request_id=s.request_id AND r.organization_id=s.organization_id AND r.learner_id=s.learner_id AND r.requirement_snapshot_id IS NOT NULL
            LEFT JOIN platform.initial_pathway_approval a ON a.request_id=v.request_id AND a.revision=coalesce(v.approval_basis_revision,v.revision)
                AND a.organization_id=s.organization_id
            LEFT JOIN platform.initial_pathway_revision basis ON basis.request_id=a.request_id AND basis.revision=a.revision AND basis.content_hash=a.content_hash
            LEFT JOIN LATERAL (SELECT max(switched_at) AS accepted_at FROM platform.learning_version_switch sw WHERE sw.organization_id=p.organization_id
                AND sw.learner_id=p.learner_id AND sw.module_id=p.module_id AND sw.to_revision=p.revision) switched ON true
            WHERE p.organization_id=CAST(:org AS text) AND p.learner_id=CAST(:learner AS text) AND p.module_id IN (:modules)
                AND v.created_at<=greatest(p.started_at,switched.accepted_at) AND ((basis.request_id IS NOT NULL AND a.confirmed_at<=greatest(p.started_at,switched.accepted_at))
                    OR (r.generation_status='NO_LEARNING_REQUIRED' AND s.kind='PARALLEL_SUPPLEMENT'
                        AND EXISTS (SELECT 1 FROM platform.pathway_requirement_bypass b
                            JOIN platform.initial_pathway_revision old ON old.request_id=b.request_id AND old.revision=b.revision
                            JOIN platform.initial_pathway_approval approval ON approval.request_id=old.request_id AND approval.revision=coalesce(old.approval_basis_revision,old.revision)
                            JOIN platform.initial_pathway_revision approved ON approved.request_id=approval.request_id AND approved.revision=approval.revision AND approved.content_hash=approval.content_hash
                            WHERE b.id=s.source_bypass_id AND b.organization_id=s.organization_id AND b.learner_id=s.learner_id AND approval.confirmed_at<=greatest(p.started_at,switched.accepted_at))))
            ORDER BY p.module_id,p.revision,s.skill_id,s.knowledge_level,s.requirement_snapshot->>'skillVersion',v.created_at,s.step_id LIMIT 1001
            """,nativeQuery=true)
    List<Started> startedModules(@Param("org") UUID org,@Param("learner") UUID learner,@Param("modules") Collection<String> modules);
    interface Started {String getRequirementSnapshot();String getModuleId();int getModuleRevision();Instant getStartedAt();String getContentVersion();}
    @Query(value="""
            SELECT EXISTS (SELECT 1 FROM platform.pathway_requirement_step s JOIN platform.initial_pathway_revision v
                ON v.request_id=s.request_id AND v.revision=s.revision AND v.format_version=3 AND v.validation_status='VALID'
            WHERE s.organization_id=:org AND s.learner_id=:learner AND s.request_id=:request AND s.revision=:revision AND s.step_id=:step
                AND s.provision='CERTIFICATE_ONLY' AND s.certificate_id=:certificate AND s.certificate_version=:version
                AND s.requirement_snapshot=CAST(:requirement AS jsonb))
            """,nativeQuery=true)
    boolean submittedCertificate(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("revision") long revision,
            @Param("step") UUID step,@Param("certificate") String certificate,@Param("version") String version,@Param("requirement") String requirement);
    @Query(value="""
            SELECT CAST(step->>'id' AS uuid) AS stepId,option->>'moduleId' AS moduleId,CAST(option->>'moduleRevision' AS integer) AS moduleRevision,
                p.started_at AS startedAt,c.completed_at AS completedAt
            FROM jsonb_array_elements(CAST(:plan AS jsonb)->'steps') step CROSS JOIN LATERAL jsonb_array_elements(step->'options') option
            LEFT JOIN platform.module_learning_pin p ON p.organization_id=CAST(:org AS text) AND p.learner_id=CAST(:learner AS text)
                AND p.module_id=option->>'moduleId' AND p.revision=CAST(option->>'moduleRevision' AS integer)
            LEFT JOIN platform.learning_module_completion c ON c.organization_id=CAST(:org AS text) AND c.learner_id=CAST(:learner AS text)
                AND c.module_id=option->>'moduleId' AND c.revision=CAST(option->>'moduleRevision' AS integer) AND c.content_version=option->>'contentVersion'
                AND c.skill_id=step->'requirement'->>'skillId'
                AND EXISTS (SELECT 1 FROM platform.learning_completion_requirement proof WHERE proof.organization_id=c.organization_id AND proof.learner_id=c.learner_id
                    AND proof.module_id=c.module_id AND proof.revision=c.revision AND proof.knowledge_level=step->'requirement'->>'knowledgeLevel'
                    AND proof.requirement_snapshot->>'skillVersion'=step->'requirement'->>'skillVersion')
            LIMIT 100001
            """,nativeQuery=true)
    List<Progress> progress(@Param("org") UUID org,@Param("learner") UUID learner,@Param("plan") String plan);
    interface Progress {UUID getStepId();String getModuleId();int getModuleRevision();Instant getStartedAt();Instant getCompletedAt();}
    @Query(value="""
            SELECT count(*) FROM jsonb_array_elements(CAST(:plan AS jsonb)->'steps') step
            JOIN platform.skill_knowledge_evidence e ON e.id=CAST(step->>'fulfilledEvidenceId' AS uuid)
                AND e.organization_id=:org AND e.learner_id=:learner AND e.skill_id=step->'requirement'->>'skillId'
                AND e.knowledge_level=step->'requirement'->>'knowledgeLevel'
                AND e.requirement_snapshot->>'skillVersion'=step->'requirement'->>'skillVersion'
            WHERE step->>'state'='FULFILLED'
            """,nativeQuery=true)
    long validFulfilled(@Param("org") UUID org,@Param("learner") UUID learner,@Param("plan") String plan);
    @Query(value="""
            SELECT DISTINCT ON (b.step_id) b.step_id AS stepId,b.id AS bypassId,b.reason AS reason
            FROM platform.pathway_requirement_bypass b
            JOIN platform.pathway_requirement_step original ON original.request_id=b.request_id AND original.revision=b.revision AND original.step_id=b.step_id
                AND original.organization_id=b.organization_id AND original.learner_id=b.learner_id
            JOIN platform.pathway_requirement_step current_step ON current_step.request_id=b.request_id AND current_step.revision=:revision AND current_step.step_id=b.step_id
                AND current_step.organization_id=b.organization_id AND current_step.learner_id=b.learner_id
                AND current_step.skill_id=original.skill_id AND current_step.knowledge_level=original.knowledge_level AND current_step.provision=original.provision
                AND current_step.requirement_snapshot->>'skillVersion' IS NOT DISTINCT FROM original.requirement_snapshot->>'skillVersion'
            WHERE b.organization_id=:org AND b.learner_id=:learner AND b.request_id=:request AND b.revision<=:revision
                AND NOT EXISTS (SELECT 1 FROM platform.pathway_requirement_bypass newer WHERE newer.supersedes_id=b.id)
            ORDER BY b.step_id,b.decided_at DESC,b.id LIMIT 1001
            """,nativeQuery=true)
    List<Bypass> bypasses(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("revision") long revision);
    interface Bypass {UUID getStepId();UUID getBypassId();String getReason();}
    /** Validates all supplemental origins in one scoped query, including non-gating descendants of a carried bypass. */
    @Query(value="""
            SELECT count(*) FROM jsonb_array_elements(CAST(:sources AS jsonb)) source
            JOIN platform.rule_assessment_attempt a ON a.id=CAST(source->'source'->>'attemptId' AS uuid)
                AND a.organization_id=:org AND a.learner_id=:learner AND a.purpose='SKILL_ASSESSMENT' AND a.state='FINALIZED'
                AND a.context_snapshot->'context'->>'requestId'=coalesce(source->'source'->>'requestId',CAST(:request AS text))
                AND a.context_snapshot->'context'->>'stepId'=source->'source'->>'dependentStepId'
            JOIN platform.rule_assessment_group g ON g.attempt_id=a.id AND g.group_id=CAST(source->'source'->>'groupId' AS uuid) AND g.group_role='PREREQUISITE'
                AND g.organization_id=a.organization_id AND g.learner_id=a.learner_id
                AND g.skill_id=source->'requirement'->>'skillId' AND g.knowledge_level=source->'requirement'->>'knowledgeLevel'
            JOIN platform.rule_assessment_group_result score ON score.attempt_id=g.attempt_id AND score.group_id=g.group_id AND NOT score.passed
            JOIN platform.pathway_requirement_step parent ON parent.request_id=CAST(a.context_snapshot->'context'->>'requestId' AS uuid)
                AND parent.revision=CAST(a.context_snapshot->'context'->>'pathwayRevision' AS bigint) AND parent.step_id=CAST(source->'source'->>'dependentStepId' AS uuid)
                AND parent.organization_id=a.organization_id AND parent.learner_id=a.learner_id
            JOIN LATERAL jsonb_array_elements(a.context_snapshot->'context'->'requirements') definition
                ON definition->'requirement'->>'skillId'=g.skill_id AND definition->'requirement'->>'knowledgeLevel'=g.knowledge_level
            WHERE definition->>'skillVersion'=source->'requirement'->>'skillVersion'
                AND definition->>'mode'=source->'requirement'->>'provision'
                AND parent.kind=source->>'kind' AND parent.source_bypass_id IS NOT DISTINCT FROM CAST(source->>'sourceBypassId' AS uuid)
                AND ((source->>'kind'='REQUIRED' AND a.context_snapshot->'context'->>'stepKind'='REQUIRED')
                    OR (source->>'kind'='PARALLEL_SUPPLEMENT' AND a.context_snapshot->'context'->>'stepKind'='PARALLEL_SUPPLEMENT'
                        AND a.context_snapshot->'context'->>'sourceBypassId'=source->>'sourceBypassId'))
                AND NOT EXISTS (SELECT 1 FROM platform.skill_knowledge_evidence e WHERE e.organization_id=a.organization_id AND e.learner_id=a.learner_id
                    AND e.skill_id=g.skill_id AND e.knowledge_level=g.knowledge_level AND e.achieved_at<=a.finished_at
                    AND e.requirement_snapshot->>'skillVersion'=definition->>'skillVersion')
            """,nativeQuery=true)
    long validSources(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("sources") String sources);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.pathway_requirement_bypass(id,organization_id,learner_id,request_id,revision,step_id,expert_id,assignment_snapshot,reason,decided_at,retry_key)
            VALUES (:id,:org,:learner,:request,:revision,:step,:expert,CAST(:assignment AS jsonb),:reason,clock_timestamp(),:retry)
            """,nativeQuery=true)
    int bypass(@Param("id") UUID id,@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("revision") long revision,
            @Param("step") UUID step,@Param("expert") UUID expert,@Param("assignment") String assignment,@Param("reason") String reason,@Param("retry") UUID retry);
}
