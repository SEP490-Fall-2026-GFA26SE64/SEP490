package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.LearnerStateEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** learner_state row locks and target-revision counters that serialize a learner's target-role selection commands. */
public interface SelectionLearnerJpaRepository extends Repository<LearnerStateEntity, UUID> {

    // Native: FOR UPDATE row lock serializing the learner's F02 selection command.
    @Query(value = "SELECT learner_id FROM platform.learner_state WHERE learner_id = :learner FOR UPDATE", nativeQuery = true)
    List<UUID> lock(@Param("learner") UUID learnerId);

    // Native: FOR UPDATE OF learner_state, restricted to an active account of the trusted organization.
    @Query(value = """
            SELECT l.learner_id FROM platform.learner_state l JOIN platform.account a ON a.account_id=l.learner_id
            WHERE l.learner_id=:learner AND a.organization_id=:org AND a.active FOR UPDATE OF l
            """, nativeQuery = true)
    List<UUID> lockActive(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);

    @Query("select l.targetRevision from LearnerStateEntity l where l.learnerId = :learner")
    List<Long> targetRevision(@Param("learner") UUID learnerId);

    // Native: database clock (clock_timestamp()) shared by the selection, archive and event timestamps of one command.
    @Query(value = "SELECT clock_timestamp()", nativeQuery = true)
    Object clock();

    // Native: INSERT ... SELECT ... ON CONFLICT DO NOTHING; the state row is created only for an active account of the organization.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.learner_state(learner_id)
            SELECT account_id FROM platform.account WHERE account_id=:learner AND organization_id=:org AND active
            ON CONFLICT(learner_id) DO NOTHING
            """, nativeQuery = true)
    int insertForActiveAccount(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update LearnerStateEntity l set l.targetRevision = :next
            where l.learnerId = :learner and l.targetRevision = :expected
            """)
    int updateTargetRevision(@Param("learner") UUID learnerId, @Param("expected") long expectedRevision, @Param("next") long newRevision);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update LearnerStateEntity l set l.targetRevision = l.targetRevision + 1 where l.learnerId = :learner")
    int incrementTargetRevision(@Param("learner") UUID learnerId);
}
