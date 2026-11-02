package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.BaselineAdaptiveAttemptEntity;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Adaptive baseline attempt headers, always scoped by organization (and learner/Occupation for owned access). Native
 * statements keep the row locks (FOR UPDATE / SKIP LOCKED) and the database clock (clock_timestamp()); locked rows are
 * then read through the {@link Row} projection.
 */
public interface AdaptiveAttemptJpaRepository
        extends Repository<BaselineAdaptiveAttemptEntity, UUID>, InsertOnlyRepository<BaselineAdaptiveAttemptEntity> {

    record Row(UUID attemptId, UUID organizationId, UUID learnerId, String occupationId, String attemptPurpose, String targetRoleId,
               Long targetSelectionRevision, UUID blueprintId, Integer blueprintVersion, UUID modelVersionId,
               UUID masteryMappingVersionId, UUID parameterSetId, String catalogFingerprint, Integer maxQuestions,
               Integer timeLimitSeconds, String state, Long revision, Instant startedAt, Instant deadlineAt, Instant finishedAt,
               String completionReason, UUID replacesAttemptId, String scopePolicy, String assessmentPolicyMode,
               UUID assessmentPolicyVersionId, String assessmentPolicyHash, String assessmentPolicySnapshot) {}

    String ROW = """
            select new com.adaptlearngraph.repository.AdaptiveAttemptJpaRepository$Row(a.attemptId, a.organizationId, a.learnerId,
                a.occupationId, a.attemptPurpose, a.targetRoleId, a.targetSelectionRevision, a.blueprintId, a.blueprintVersion,
                a.modelVersionId, a.masteryMappingVersionId, a.parameterSetId, a.catalogFingerprint, a.maxQuestions,
                a.timeLimitSeconds, a.state, a.revision, a.startedAt, a.deadlineAt, a.finishedAt, a.completionReason,
                a.replacesAttemptId, a.scopePolicy, a.assessmentPolicyMode, a.assessmentPolicyVersionId, a.assessmentPolicyHash,
                a.assessmentPolicySnapshot)
            from BaselineAdaptiveAttemptEntity a
            """;
    String OWNED = "where a.organizationId = :org and a.learnerId = :learner and a.occupationId = :occupation ";

    @Query(ROW + "where a.organizationId = :org and a.learnerId = :learner and a.attemptId = :id")
    List<Row> owned(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID attemptId);

    @Query(ROW + OWNED + "and a.attemptId = :id")
    List<Row> find(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("occupation") String occupationId,
            @Param("id") UUID attemptId);

    @Query(ROW + OWNED + "and a.state = 'IN_PROGRESS'")
    List<Row> inProgress(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("occupation") String occupationId);

    /** Chain members without a successor; the successor lookup is deliberately unscoped like the replacement link itself. */
    @Query(ROW + OWNED + "and not exists (select 1 from BaselineAdaptiveAttemptEntity successor where successor.replacesAttemptId = a.attemptId)")
    List<Row> latest(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("occupation") String occupationId);

    @Query(ROW + "where a.organizationId = :org and a.attemptId in :ids")
    List<Row> byIds(@Param("org") UUID organizationId, @Param("ids") Collection<UUID> attemptIds);

    @Query("""
            select count(a) > 0 from BaselineAdaptiveAttemptEntity a
            where a.organizationId = :org and a.learnerId = :learner and a.occupationId = :occupation
              and a.state in ('SUBMITTED', 'AUTO_SUBMITTED')
            """)
    boolean hasMasteryProducingCompletion(@Param("org") UUID organizationId, @Param("learner") UUID learnerId,
            @Param("occupation") String occupationId);

    // Native: row lock (FOR UPDATE) on the actor's active attempt for this Occupation.
    @Query(value = """
            SELECT attempt_id FROM platform.baseline_adaptive_attempt
            WHERE organization_id=:org AND learner_id=:learner AND occupation_id=:occupation AND state='IN_PROGRESS' FOR UPDATE
            """, nativeQuery = true)
    List<UUID> lockInProgress(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("occupation") String occupationId);

    // Native: row lock (FOR UPDATE) on one owned attempt.
    @Query(value = """
            SELECT attempt_id FROM platform.baseline_adaptive_attempt
            WHERE organization_id=:org AND learner_id=:learner AND occupation_id=:occupation AND attempt_id=:id FOR UPDATE
            """, nativeQuery = true)
    List<UUID> lockOwned(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("occupation") String occupationId,
            @Param("id") UUID attemptId);

    // Native: database clock (clock_timestamp()), LIMIT and FOR UPDATE SKIP LOCKED claim of expired attempts.
    @Query(value = """
            SELECT attempt_id FROM platform.baseline_adaptive_attempt WHERE organization_id=:org AND state='IN_PROGRESS'
                AND deadline_at<=clock_timestamp() ORDER BY deadline_at,attempt_id LIMIT :limit FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<UUID> claimExpired(@Param("org") UUID organizationId, @Param("limit") int limit);

    // Native: authoritative database observation time (clock_timestamp()).
    @Query(value = "SELECT clock_timestamp()", nativeQuery = true)
    Object clockTimestamp();

    /** Compare-and-set of an active attempt to its next revision; terminal states never update. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update BaselineAdaptiveAttemptEntity a set a.state = :state, a.revision = :revision, a.finishedAt = :finished,
                a.completionReason = :reason
            where a.organizationId = :org and a.learnerId = :learner and a.occupationId = :occupation and a.attemptId = :id
              and a.revision = :expected and a.state = 'IN_PROGRESS'
            """)
    int transition(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("occupation") String occupationId,
            @Param("id") UUID attemptId, @Param("expected") long expectedRevision, @Param("state") String state,
            @Param("revision") long revision, @Param("finished") Instant finishedAt, @Param("reason") String completionReason);
}
