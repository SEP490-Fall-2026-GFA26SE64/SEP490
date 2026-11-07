package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.EmployeeRoleSelectionEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Current string-ID role selections, scoped by organization and learner. */
public interface EmployeeRoleSelectionJpaRepository
        extends Repository<EmployeeRoleSelectionEntity, UUID>, InsertOnlyRepository<EmployeeRoleSelectionEntity> {

    record Row(UUID selectionId, String roleId, String jobPositionId, String roleSnapshot, Long targetRevision, Instant selectedAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.EmployeeRoleSelectionJpaRepository$Row(s.selectionId, s.roleId, s.jobPositionId,
                s.roleSnapshot, s.targetRevision, s.selectedAt)
            from EmployeeRoleSelectionEntity s
            where s.organizationId = :org and s.learnerId = :learner and s.endedAt is null
            """)
    List<Row> current(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update EmployeeRoleSelectionEntity s set s.endedAt = :time
            where s.organizationId = :org and s.learnerId = :learner and s.endedAt is null
            """)
    int endCurrent(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("time") Instant endedAt);

    @Query(value="""
            SELECT EXISTS (SELECT 1 FROM platform.baseline_adaptive_attempt a
                WHERE a.organization_id=:org AND a.learner_id=:learner AND a.state='IN_PROGRESS')
                OR EXISTS (SELECT 1 FROM platform.rule_assessment_attempt a
                WHERE a.organization_id=:org AND a.learner_id=:learner AND a.state='IN_PROGRESS')
            """,nativeQuery=true)
    boolean assessmentInProgress(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);

    /** Exact tenant/learner request binding, including pending generation, returned and stale repair states.
     * Native SQL reads the requirement revision sidecar; the caller holds the existing learner lock.
     */
    @Query(value = """
            SELECT EXISTS (
                SELECT 1 FROM platform.initial_pathway_request r
                JOIN platform.initial_pathway_current c ON c.request_id=r.request_id
                    AND c.organization_id=r.organization_id AND c.learner_id=r.learner_id
                WHERE r.organization_id=:org AND r.learner_id=:learner AND c.archived_at IS NULL
                  AND NOT (
                    r.generation_status='NO_LEARNING_REQUIRED'
                    OR (r.requirement_snapshot_id IS NOT NULL AND r.generation_status='SUCCEEDED'
                        AND c.review_status='APPROVED' AND c.current_revision IS NOT NULL
                        AND EXISTS (SELECT 1 FROM platform.initial_pathway_revision v
                            WHERE v.request_id=r.request_id AND v.revision=c.current_revision
                              AND v.organization_id=r.organization_id AND v.learner_id=r.learner_id
                              AND v.validation_status='VALID' AND v.format_version=3
                              AND EXISTS (SELECT 1 FROM platform.initial_pathway_approval approval
                                  JOIN platform.initial_pathway_revision basis ON basis.request_id=approval.request_id AND basis.revision=approval.revision
                                      AND basis.content_hash=approval.content_hash AND basis.organization_id=v.organization_id AND basis.learner_id=v.learner_id
                                  WHERE approval.request_id=v.request_id AND approval.revision=coalesce(v.approval_basis_revision,v.revision)
                                      AND approval.organization_id=v.organization_id))
                        AND NOT EXISTS (SELECT 1 FROM platform.pathway_requirement_step s
                            WHERE s.request_id=r.request_id AND s.revision=c.current_revision
                              AND s.organization_id=r.organization_id AND s.learner_id=r.learner_id
                              AND s.kind='REQUIRED' AND NOT (
                                (s.state='FULFILLED' AND EXISTS (SELECT 1 FROM platform.skill_knowledge_evidence e
                                    WHERE e.id=s.fulfilled_evidence_id AND e.organization_id=s.organization_id
                                        AND e.learner_id=s.learner_id AND e.skill_id=s.skill_id AND e.knowledge_level=s.knowledge_level
                                        AND e.requirement_snapshot->>'skillVersion'=s.requirement_snapshot->>'skillVersion'
                                        AND (e.requirement_snapshot->'outcomeCodes') @> (s.requirement_snapshot->'outcomeCodes')))
                                OR (s.state='BYPASSED' AND EXISTS (SELECT 1 FROM platform.pathway_requirement_bypass b
                                    JOIN platform.pathway_requirement_step original ON original.request_id=b.request_id AND original.revision=b.revision AND original.step_id=b.step_id
                                        AND original.organization_id=s.organization_id AND original.learner_id=s.learner_id AND original.skill_id=s.skill_id AND original.knowledge_level=s.knowledge_level
                                        AND original.provision=s.provision AND original.requirement_snapshot->>'skillVersion' IS NOT DISTINCT FROM s.requirement_snapshot->>'skillVersion'
                                        AND (original.requirement_snapshot->'outcomeCodes') @> (s.requirement_snapshot->'outcomeCodes')
                                        AND (s.requirement_snapshot->'outcomeCodes') @> (original.requirement_snapshot->'outcomeCodes')
                                    WHERE b.organization_id=s.organization_id AND b.learner_id=s.learner_id
                                        AND b.request_id=s.request_id AND b.step_id=s.step_id AND b.revision<=s.revision
                                        AND NOT EXISTS (SELECT 1 FROM platform.pathway_requirement_bypass newer WHERE newer.supersedes_id=b.id)))
                              )))
                  )
            )
            """, nativeQuery = true)
    boolean targetBound(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);
}
