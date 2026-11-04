package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.EmployeeJobPositionProfileEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Initial jobPosition profiles and their baseline evidence, scoped by organization and learner. */
public interface EmployeeJobPositionProfileJpaRepository
        extends Repository<EmployeeJobPositionProfileEntity, EmployeeJobPositionProfileEntity.Key> {

    record MasteryRow(String jobPositionId, String jobPositionName, UUID attemptId, UUID blueprintId, Integer blueprintVersion,
            Instant initializedAt, String mastery) {}

    record MasterySkillRow(UUID attemptId, String microSkillId, String confidenceLabel, String name) {}

    record ProgressRow(String requiredSkills, String mastery, Integer blueprintVersion, UUID attemptId) {}

    record OriginRow(UUID attemptId, UUID blueprintId, Integer blueprintVersion, String catalogFingerprint, String requiredSkills,
            String mastery, String state, UUID modelVersionId, UUID masteryMappingVersionId, UUID parameterSetId,
            String attemptFingerprint, UUID attemptBlueprint, Integer attemptBlueprintVersion, String policyMode,
            UUID policyVersionId, String policyHash, String policySnapshot) {}

    record OriginSkillRow(String microSkillId, BigDecimal mastery, String confidenceLabel, UUID masteryMappingVersionId,
            UUID policyVersionId, String policyHash, UUID evidencePolicy, String evidenceHash) {}

    // Native: ON CONFLICT DO NOTHING keeps the first real outcome; the profile is immutable once initialized.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.employee_job_position_profile(organization_id,learner_id,job_position_id,attempt_id,blueprint_id,
                blueprint_version,catalog_fingerprint,required_skills,mastery,initialized_at)
            VALUES(:org,:learner,:jobPosition,:attempt,:blueprint,:version,:fingerprint,CAST(:skills AS jsonb),CAST(:mastery AS jsonb),:time)
            ON CONFLICT(organization_id,learner_id,job_position_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("jobPosition") String jobPositionId,
            @Param("attempt") UUID attemptId, @Param("blueprint") UUID blueprintId, @Param("version") int blueprintVersion,
            @Param("fingerprint") String catalogFingerprint, @Param("skills") String requiredSkills, @Param("mastery") String mastery,
            @Param("time") Instant initializedAt);

    @Query("""
            select count(p) > 0 from EmployeeJobPositionProfileEntity p
            where p.organizationId = :org and p.learnerId = :learner and p.jobPositionId = :jobPosition
            """)
    boolean exists(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("jobPosition") String jobPositionId);

    @Query("""
            select new com.adaptlearngraph.repository.EmployeeJobPositionProfileJpaRepository$MasteryRow(p.jobPositionId,
                v.jobPositionNameSnapshot, p.attemptId, p.blueprintId, p.blueprintVersion, p.initializedAt, p.mastery)
            from EmployeeJobPositionProfileEntity p
            join BaselineAdaptiveBlueprintVersionEntity v
              on v.blueprintId = p.blueprintId and v.version = p.blueprintVersion
             and v.organizationId = p.organizationId and v.jobPositionId = p.jobPositionId
            where p.organizationId = :org and p.learnerId = :learner
            order by p.initializedAt desc, p.jobPositionId
            """)
    List<MasteryRow> mastery(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);

    /** Skill results of the given profile attempts in one statement, names resolved from each profile's blueprint version. */
    @Query("""
            select new com.adaptlearngraph.repository.EmployeeJobPositionProfileJpaRepository$MasterySkillRow(s.attemptId, s.microSkillId,
                s.confidenceLabel,
                (select min(b.microSkillNameSnapshot) from BaselineAdaptiveBlueprintSkillEntity b
                 where b.blueprintId = p.blueprintId and b.blueprintVersion = p.blueprintVersion and b.microSkillId = s.microSkillId))
            from BaselineAttemptSkillResultEntity s
            join EmployeeJobPositionProfileEntity p on p.attemptId = s.attemptId
            where s.organizationId = :org and p.organizationId = :org and p.learnerId = :learner and s.attemptId in :attempts
            order by s.attemptId, s.microSkillId
            """)
    List<MasterySkillRow> masterySkills(@Param("org") UUID organizationId, @Param("learner") UUID learnerId,
            @Param("attempts") Collection<UUID> attemptIds);

    @Query("""
            select new com.adaptlearngraph.repository.EmployeeJobPositionProfileJpaRepository$ProgressRow(p.requiredSkills, p.mastery,
                p.blueprintVersion, p.attemptId)
            from EmployeeJobPositionProfileEntity p
            where p.organizationId = :org and p.learnerId = :learner and p.jobPositionId = :jobPosition
            """)
    List<ProgressRow> progress(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("jobPosition") String jobPositionId);

    @Query("""
            select a.attemptId from BaselineAdaptiveAttemptEntity a
            where a.organizationId = :org and a.learnerId = :learner and a.state = 'IN_PROGRESS'
            order by a.startedAt, a.attemptId
            """)
    List<UUID> inProgressAttempts(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, Pageable first);

    @Query("""
            select new com.adaptlearngraph.repository.EmployeeJobPositionProfileJpaRepository$OriginRow(p.attemptId, p.blueprintId,
                p.blueprintVersion, p.catalogFingerprint, p.requiredSkills, p.mastery, a.state, a.modelVersionId,
                a.masteryMappingVersionId, a.parameterSetId, a.catalogFingerprint, a.blueprintId, a.blueprintVersion,
                a.assessmentPolicyMode, a.assessmentPolicyVersionId, a.assessmentPolicyHash, a.assessmentPolicySnapshot)
            from EmployeeJobPositionProfileEntity p
            left join BaselineAdaptiveAttemptEntity a on a.attemptId = p.attemptId
              and a.organizationId = p.organizationId and a.learnerId = p.learnerId and a.jobPositionId = p.jobPositionId
            where p.organizationId = :org and p.learnerId = :learner and p.jobPositionId = :jobPosition
            """)
    List<OriginRow> origin(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("jobPosition") String jobPositionId);

    @Query("""
            select new com.adaptlearngraph.repository.EmployeeJobPositionProfileJpaRepository$OriginSkillRow(s.microSkillId, s.mastery,
                s.confidenceLabel, s.masteryMappingVersionId, s.policyVersionId, s.policyHash, e.policyVersionId, e.policyHash)
            from BaselineAttemptSkillResultEntity s
            join BaselineMasteryEvidenceEntity e
              on e.organizationId = s.organizationId and e.attemptId = s.attemptId and e.microSkillId = s.microSkillId
            where s.organizationId = :org and s.attemptId = :attempt
            """)
    List<OriginSkillRow> originSkills(@Param("org") UUID organizationId, @Param("attempt") UUID attemptId);

    @Query("""
            select count(a) > 0 from BaselineAdaptiveAttemptEntity a
            where a.organizationId = :org and a.learnerId = :learner and a.jobPositionId = :jobPosition
              and a.state in ('SUBMITTED', 'AUTO_SUBMITTED')
            """)
    boolean hasSubmittedAttempt(@Param("org") UUID organizationId, @Param("learner") UUID learnerId,
            @Param("jobPosition") String jobPositionId);
}
