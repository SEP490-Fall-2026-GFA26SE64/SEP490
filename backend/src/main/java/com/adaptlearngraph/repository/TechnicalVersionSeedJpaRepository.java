package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.IrtParameterSetEntity;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Explicit local/development synthetic technical fixtures: bank/item inventory checks, model and mastery mapping
 * versions, seeded parameter sets and item parameters. Idempotent writes stay native {@code ON CONFLICT} inserts,
 * jsonb configuration comparisons and {@code clock_timestamp()} promotions stay native (model_version and
 * mastery_mapping_version have no entity); the remaining reads and the BUILDING set row are JPQL/entity based.
 */
public interface TechnicalVersionSeedJpaRepository extends Repository<IrtParameterSetEntity, UUID>, InsertOnlyRepository<IrtParameterSetEntity> {
    record ItemPin(UUID itemVersionId, String contentHash) {}

    record SetState(String parameterHash, String source, String status) {}

    record ItemParameter(UUID itemVersionId, String microSkillId, BigDecimal discriminationA, BigDecimal difficultyB, BigDecimal guessingC) {}

    // ---- bank and item inventory ----

    @Query("select case when count(b) > 0 then true else false end from QuestionBankEntity b where b.questionBankId in :banks")
    boolean anyQuestionBank(@Param("banks") Collection<UUID> bankIds);

    @Query("""
            select case when count(b) > 0 then true else false end from QuestionBankEntity b, AccountEntity a
            where a.accountId = b.createdBy and b.questionBankId = :bank and a.organizationId = :org
            """)
    boolean bankOwnedBy(@Param("bank") UUID bankId, @Param("org") UUID organizationId);

    @Query("""
            select new com.adaptlearngraph.repository.TechnicalVersionSeedJpaRepository$ItemPin(v.itemVersionId, v.contentHash)
            from ItemVersionEntity v where v.questionBankId = :bank
            """)
    List<ItemPin> itemPins(@Param("bank") UUID bankId);

    @Query("select v.itemVersionId from ItemVersionEntity v where v.questionBankId = :bank")
    List<UUID> itemVersionIds(@Param("bank") UUID bankId);

    // ---- model and mastery mapping versions ----

    // Native: idempotent seed (ON CONFLICT (model_version_id) DO NOTHING) of a jsonb configuration.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.model_version(model_version_id,algorithm,version,parameter_hash,configuration,artifact_ref)
            VALUES(:model,'IRT_3PL',:version,:hash,CAST(:configuration AS jsonb),:artifact) ON CONFLICT(model_version_id) DO NOTHING
            """, nativeQuery = true)
    int insertModelIfAbsent(@Param("model") UUID modelVersionId, @Param("version") String version, @Param("hash") String parameterHash,
            @Param("configuration") String configuration, @Param("artifact") String artifactRef);

    // Native: idempotent seed (ON CONFLICT DO NOTHING on any unique key, including algorithm+version) of a jsonb configuration.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.model_version(model_version_id,algorithm,version,parameter_hash,configuration,artifact_ref)
            VALUES(:model,'IRT_3PL',:version,:hash,CAST(:configuration AS jsonb),:artifact) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertModelIgnoringConflicts(@Param("model") UUID modelVersionId, @Param("version") String version,
            @Param("hash") String parameterHash, @Param("configuration") String configuration, @Param("artifact") String artifactRef);

    // Native: idempotent seed (ON CONFLICT DO NOTHING) of a jsonb configuration.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.mastery_mapping_version(mastery_mapping_version_id,mapping_type,configuration,configuration_hash)
            VALUES(:mapping,'LOGISTIC_CONSERVATIVE_V1',CAST(:configuration AS jsonb),:hash) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertMappingIfAbsent(@Param("mapping") UUID mappingVersionId, @Param("configuration") String configuration,
            @Param("hash") String configurationHash);

    // Native: jsonb configuration equality.
    @Query(value = """
            SELECT EXISTS(SELECT 1 FROM platform.model_version WHERE model_version_id=:model AND configuration=CAST(:configuration AS jsonb)
              AND parameter_hash=:hash AND approved_by IS NULL AND artifact_ref=:artifact)
            """, nativeQuery = true)
    boolean unapprovedModelMatches(@Param("model") UUID modelVersionId, @Param("configuration") String configuration,
            @Param("hash") String parameterHash, @Param("artifact") String artifactRef);

    // Native: jsonb configuration equality.
    @Query(value = """
            SELECT EXISTS(SELECT 1 FROM platform.model_version WHERE model_version_id=:model AND algorithm='IRT_3PL'
              AND version=:version AND parameter_hash=:hash AND configuration=CAST(:configuration AS jsonb)
              AND artifact_ref=:artifact AND approved_by IS NULL AND approved_at IS NULL)
            """, nativeQuery = true)
    boolean declaredModelMatches(@Param("model") UUID modelVersionId, @Param("version") String version, @Param("hash") String parameterHash,
            @Param("configuration") String configuration, @Param("artifact") String artifactRef);

    // Native: jsonb configuration equality.
    @Query(value = """
            SELECT EXISTS(SELECT 1 FROM platform.mastery_mapping_version WHERE mastery_mapping_version_id=:mapping
              AND configuration=CAST(:configuration AS jsonb) AND configuration_hash=:hash)
            """, nativeQuery = true)
    boolean mappingMatches(@Param("mapping") UUID mappingVersionId, @Param("configuration") String configuration,
            @Param("hash") String configurationHash);

    // Native: jsonb configuration equality.
    @Query(value = """
            SELECT EXISTS(SELECT 1 FROM platform.mastery_mapping_version WHERE mastery_mapping_version_id=:mapping
              AND mapping_type='LOGISTIC_CONSERVATIVE_V1' AND configuration=CAST(:configuration AS jsonb) AND configuration_hash=:hash)
            """, nativeQuery = true)
    boolean logisticMappingMatches(@Param("mapping") UUID mappingVersionId, @Param("configuration") String configuration,
            @Param("hash") String configurationHash);

    // ---- seeded parameter sets ----

    @Query("""
            select new com.adaptlearngraph.repository.TechnicalVersionSeedJpaRepository$SetState(s.parameterHash, s.source, s.status)
            from IrtParameterSetEntity s where s.parameterSetId = :set
            """)
    List<SetState> setState(@Param("set") UUID parameterSetId);

    @Query("select case when count(s) > 0 then true else false end from IrtParameterSetEntity s where s.parameterSetId = :set")
    boolean setExists(@Param("set") UUID parameterSetId);

    /** A SEEDED set of the model/hash that is either still {@code status} and unactivated, or (when allowed) promoted by the actor. */
    @Query("""
            select case when count(s) > 0 then true else false end from IrtParameterSetEntity s
            where s.parameterSetId = :set and s.modelVersionId = :model and s.source = 'SEEDED' and s.parameterHash = :hash
              and ((s.status = :status and s.activatedBy is null and s.activatedAt is null)
                or (:promotedAllowed = true and s.status = 'PROMOTED' and s.activatedBy = :actor and s.activatedAt is not null))
            """)
    boolean seededSetInState(@Param("set") UUID parameterSetId, @Param("model") UUID modelVersionId, @Param("hash") String parameterHash,
            @Param("status") String status, @Param("promotedAllowed") boolean promotedAllowed, @Param("actor") UUID actorId);

    @Query("""
            select case when count(s) > 0 then true else false end from IrtParameterSetEntity s
            where s.parameterSetId = :set and s.modelVersionId = :model and s.source = 'SEEDED' and s.status = 'PROMOTED'
              and s.parameterHash = :hash and s.activatedBy = :actor and s.activatedAt is not null
            """)
    boolean seededSetPromoted(@Param("set") UUID parameterSetId, @Param("model") UUID modelVersionId, @Param("hash") String parameterHash,
            @Param("actor") UUID actorId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update IrtParameterSetEntity s set s.status = 'CANDIDATE' where s.parameterSetId = :set")
    int markCandidate(@Param("set") UUID parameterSetId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update IrtParameterSetEntity s set s.status = 'CANDIDATE' where s.parameterSetId = :set and s.status = 'BUILDING'")
    int markBuildingCandidate(@Param("set") UUID parameterSetId);

    // Native: activated_at uses clock_timestamp() exactly as before.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.irt_parameter_set SET status='PROMOTED',activated_by=:actor,activated_at=clock_timestamp()
            WHERE parameter_set_id=:set
            """, nativeQuery = true)
    int promote(@Param("set") UUID parameterSetId, @Param("actor") UUID actorId);

    // Native: activated_at uses clock_timestamp() exactly as before.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.irt_parameter_set SET status='PROMOTED',activated_by=:actor,activated_at=clock_timestamp()
            WHERE parameter_set_id=:set AND status='CANDIDATE' AND source='SEEDED' AND parameter_hash=:hash
            """, nativeQuery = true)
    int promoteSeededCandidate(@Param("set") UUID parameterSetId, @Param("actor") UUID actorId, @Param("hash") String parameterHash);

    // ---- item parameters ----

    // Native: idempotent seed (ON CONFLICT DO NOTHING) with a jsonb diagnostics literal.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.irt_item_parameter(parameter_set_id,item_version_id,micro_skill_id,discrimination_a,difficulty_b,guessing_c,fit_diagnostics)
            VALUES(:set,:item,:skill,1.5,:b,0.25,CAST(:diagnostics AS jsonb)) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertDeclaredParameterIfAbsent(@Param("set") UUID parameterSetId, @Param("item") UUID itemVersionId, @Param("skill") String microSkillId,
            @Param("b") int difficultyB, @Param("diagnostics") String fitDiagnostics);

    // Native: jsonb diagnostics equality.
    @Query(value = """
            SELECT EXISTS(SELECT 1 FROM platform.irt_item_parameter WHERE parameter_set_id=:set AND item_version_id=:item
              AND micro_skill_id=:skill AND discrimination_a=1.5 AND difficulty_b=:b AND guessing_c=0.25
              AND fit_diagnostics=CAST(:diagnostics AS jsonb))
            """, nativeQuery = true)
    boolean declaredParameterMatches(@Param("set") UUID parameterSetId, @Param("item") UUID itemVersionId, @Param("skill") String microSkillId,
            @Param("b") int difficultyB, @Param("diagnostics") String fitDiagnostics);

    @Query("select count(p) from IrtItemParameterEntity p where p.parameterSetId = :set")
    long parameterCount(@Param("set") UUID parameterSetId);

    @Query("""
            select new com.adaptlearngraph.repository.TechnicalVersionSeedJpaRepository$ItemParameter(
              p.itemVersionId, p.microSkillId, p.discriminationA, p.difficultyB, p.guessingC)
            from IrtItemParameterEntity p where p.parameterSetId = :set
            """)
    List<ItemParameter> parameters(@Param("set") UUID parameterSetId);
}
