package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AccountRoleEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Server-configured Employee identity and starting-selection reads for adaptive attempts. Identity reads are keyed by the
 * trusted actor (the organization is verified by the caller); native statements keep the share locks and the shared
 * advisory scope lock that JPA cannot express.
 */
public interface AdaptiveAttemptContextJpaRepository extends Repository<AccountRoleEntity, AccountRoleEntity.Key> {

    record Account(UUID organizationId, Boolean active) {}

    record Selection(UUID roleId, Long targetRevision) {}

    @Query("select new com.adaptlearngraph.repository.AdaptiveAttemptContextJpaRepository$Account(a.organizationId, a.active) "
            + "from AccountEntity a where a.accountId = :actor")
    List<Account> account(@Param("actor") UUID actorId);

    @Query("select count(r) > 0 from AccountRoleEntity r where r.accountId = :actor and r.roleCode = 'EMPLOYEE'")
    boolean isEmployee(@Param("actor") UUID actorId);

    @Query("""
            select new com.adaptlearngraph.repository.AdaptiveAttemptContextJpaRepository$Selection(reference.entityId, learner.targetRevision)
            from TargetSelectionEntity selection
            join LearnerStateEntity learner on learner.learnerId = selection.learnerId
            join AccountEntity actor on actor.accountId = selection.learnerId
            join CatalogReferenceEntity reference on reference.catalogRefId = selection.roleRefId and reference.kind = 'TARGET_ROLE'
            where selection.learnerId = :actor and actor.organizationId = :org and selection.endedAt is null
            """)
    List<Selection> currentSelection(@Param("org") UUID organizationId, @Param("actor") UUID actorId);

    // Native: FOR SHARE row lock; REQ-001 serializes selection on learner_state.
    @Query(value = "SELECT learner_id FROM platform.learner_state WHERE learner_id=:actor FOR SHARE", nativeQuery = true)
    List<UUID> shareLockLearner(@Param("actor") UUID actorId);

    // Native: transaction-scoped shared advisory lock (pg_advisory_xact_lock_shared), also covering absent rows.
    @Query(value = "SELECT 1 FROM (SELECT pg_advisory_xact_lock_shared(hashtextextended(:coordination,0))) l", nativeQuery = true)
    List<Integer> shareLockScope(@Param("coordination") String coordination);

    // Native: FOR SHARE row lock on the JobPosition's Blueprint activation.
    @Query(value = """
            SELECT blueprint_id FROM platform.baseline_blueprint_activation WHERE organization_id=:org AND job_position_id=:jobPosition FOR SHARE
            """, nativeQuery = true)
    List<UUID> shareLockActivation(@Param("org") UUID organizationId, @Param("jobPosition") String jobPositionId);
}
