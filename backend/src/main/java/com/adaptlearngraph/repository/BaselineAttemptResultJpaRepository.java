package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAttemptResultEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Immutable scored attempt results (insert-only) and the own-Employee result/history read model. The read model stays
 * native: it needs a LEFT JOIN LATERAL with count(DISTINCT row-constructor) over Blueprint snapshot tables. Rows are
 * [attempt_id, organization_id, job_position_id, job_position_name_snapshot, assessment_policy_mode,
 * assessment_policy_version_id, assessment_policy_hash, assessment_policy_snapshot(text), skill_policy_version_id,
 * skill_policy_hash, attempt_purpose, target_role_id, role_name_snapshot, state, scope_policy, blueprint_scope_policy,
 * completion_reason, started_at, finished_at, replaces_attempt_id, replacement_attempt_id, raw_score, micro_skill_id,
 * micro_skill_name_snapshot, snapshot_variants, mastery, confidence_label].
 */
public interface BaselineAttemptResultJpaRepository
        extends Repository<BaselineAttemptResultEntity, UUID>, InsertOnlyRepository<BaselineAttemptResultEntity> {
    String RESULTS = """
            SELECT attempt.attempt_id,attempt.organization_id,attempt.job_position_id,version.job_position_name_snapshot,
                attempt.assessment_policy_mode,attempt.assessment_policy_version_id,attempt.assessment_policy_hash,
                attempt.assessment_policy_snapshot::text AS assessment_policy_snapshot,
                skill.policy_version_id AS skill_policy_version_id,skill.policy_hash AS skill_policy_hash,
                attempt.attempt_purpose,attempt.target_role_id,role.role_name_snapshot,attempt.state,
                attempt.scope_policy,version.scope_policy AS blueprint_scope_policy,
                attempt.completion_reason,attempt.started_at,attempt.finished_at,attempt.replaces_attempt_id,
                successor.attempt_id AS replacement_attempt_id,result.raw_score,
                skill.micro_skill_id,skill_name.micro_skill_name_snapshot,skill_name.snapshot_variants,skill.mastery,skill.confidence_label
            FROM platform.baseline_adaptive_attempt attempt
            JOIN platform.account employee
              ON employee.account_id=attempt.learner_id AND employee.organization_id=attempt.organization_id
             AND employee.active
            JOIN platform.baseline_adaptive_blueprint_version version
              ON version.blueprint_id=attempt.blueprint_id AND version.version=attempt.blueprint_version
             AND version.organization_id=attempt.organization_id AND version.job_position_id=attempt.job_position_id
            LEFT JOIN platform.baseline_adaptive_blueprint_role role
              ON role.blueprint_id=attempt.blueprint_id AND role.blueprint_version=attempt.blueprint_version
             AND role.role_id=attempt.target_role_id
            LEFT JOIN platform.baseline_attempt_result result
              ON result.attempt_id=attempt.attempt_id AND result.organization_id=attempt.organization_id
            LEFT JOIN platform.baseline_adaptive_attempt successor
              ON successor.replaces_attempt_id=attempt.attempt_id
             AND successor.organization_id=attempt.organization_id AND successor.learner_id=attempt.learner_id
            LEFT JOIN platform.baseline_attempt_skill_result skill
              ON skill.attempt_id=attempt.attempt_id AND skill.organization_id=attempt.organization_id
            LEFT JOIN LATERAL (
                SELECT MIN(snapshot.micro_skill_name_snapshot) AS micro_skill_name_snapshot,
                    count(DISTINCT (snapshot.micro_skill_name_snapshot,snapshot.catalog_version)) AS snapshot_variants
                FROM platform.baseline_adaptive_blueprint_skill snapshot
                WHERE snapshot.blueprint_id=attempt.blueprint_id
                  AND snapshot.blueprint_version=attempt.blueprint_version
                  AND snapshot.micro_skill_id=skill.micro_skill_id
                  AND (attempt.scope_policy='FULL_JOB_POSITION_V2' OR attempt.target_role_id IS NULL OR snapshot.role_id=attempt.target_role_id)
            ) skill_name ON skill.micro_skill_id IS NOT NULL
            WHERE attempt.organization_id=:org AND attempt.learner_id=:learner
              AND ((:workspaceIdentity AND EXISTS(
                SELECT 1 FROM platform.organization_membership membership
                JOIN platform.organization_membership_role role USING(membership_id)
                WHERE membership.account_id=employee.account_id AND membership.organization_id=:org
                  AND membership.active AND role.role_code='EMPLOYEE'))
                OR (NOT :workspaceIdentity AND EXISTS(
                SELECT 1 FROM platform.account_role role
                WHERE role.account_id=employee.account_id AND role.role_code='EMPLOYEE')))
              AND attempt.state<>'IN_PROGRESS'
            """;

    // Native: LEFT JOIN LATERAL with count(DISTINCT row-constructor); see the interface comment for the row layout.
    @Query(value = RESULTS + " ORDER BY attempt.finished_at DESC,attempt.attempt_id,skill.micro_skill_id", nativeQuery = true)
    List<Object[]> history(@Param("org") UUID organizationId, @Param("learner") UUID learnerId,
            @Param("workspaceIdentity") boolean workspaceIdentity);

    // Native: LEFT JOIN LATERAL with count(DISTINCT row-constructor); see the interface comment for the row layout.
    @Query(value = RESULTS + " AND attempt.attempt_id=:id ORDER BY skill.micro_skill_id", nativeQuery = true)
    List<Object[]> result(@Param("org") UUID organizationId, @Param("learner") UUID learnerId,
            @Param("workspaceIdentity") boolean workspaceIdentity, @Param("id") UUID attemptId);
}
