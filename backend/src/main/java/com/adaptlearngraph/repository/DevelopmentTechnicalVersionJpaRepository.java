package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.IrtParameterSetEntity;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Read checks of the explicitly declared synthetic development/fixture technical versions. The pinned-tuple checks stay
 * native because they compare jsonb model/mapping configurations (and model_version/mastery_mapping_version have no
 * entity); parameter rows are JPQL.
 */
public interface DevelopmentTechnicalVersionJpaRepository extends Repository<IrtParameterSetEntity, UUID> {
    record Parameter(UUID itemVersionId, String microSkillId, BigDecimal discriminationA, BigDecimal difficultyB, BigDecimal guessingC,
                     String difficulty, String contentHash) {}

    record ContentHash(UUID itemVersionId, String contentHash) {}

    // Native: jsonb equality of the model/mapping configurations.
    @Query(value = """
            SELECT 1 FROM platform.irt_parameter_set p
            JOIN platform.model_version m USING(model_version_id)
            JOIN platform.mastery_mapping_version v ON v.mastery_mapping_version_id=:mapping
            WHERE p.parameter_set_id=:set AND p.model_version_id=:model AND p.source='SEEDED' AND p.status='PROMOTED'
              AND p.parameter_hash=:hash AND p.activated_by=:fixtureActor AND p.activated_at IS NOT NULL
              AND m.algorithm='IRT_3PL' AND m.version='WORKSPACE_SE_SYNTHETIC' AND m.parameter_hash=:hash
              AND m.configuration=CAST(:modelConfig AS jsonb) AND m.approved_by IS NULL AND m.approved_at IS NULL
              AND m.artifact_ref='development:SE:DECLARED_SYNTHETIC' AND v.mapping_type='LOGISTIC_CONSERVATIVE_V1'
              AND v.configuration=CAST(:mappingConfig AS jsonb)
            """, nativeQuery = true)
    List<Integer> softwareDevelopmentPinned(@Param("set") UUID parameterSetId, @Param("model") UUID modelVersionId,
            @Param("mapping") UUID mappingVersionId, @Param("hash") String parameterHash, @Param("fixtureActor") UUID fixtureActorId,
            @Param("modelConfig") String modelConfiguration, @Param("mappingConfig") String mappingConfiguration);

    // Native: jsonb equality of the model/mapping configurations; the bank must belong to the organization.
    @Query(value = """
            SELECT 1 FROM platform.irt_parameter_set p JOIN platform.model_version m USING(model_version_id)
            JOIN platform.mastery_mapping_version v ON v.mastery_mapping_version_id=:mapping
            WHERE p.parameter_set_id=:set AND p.model_version_id=:model AND p.source='SEEDED' AND p.status='PROMOTED' AND p.parameter_hash=:hash
              AND p.activated_by=:actor AND p.activated_at IS NOT NULL AND m.algorithm='IRT_3PL'
              AND m.parameter_hash=:hash AND m.configuration=CAST(:modelConfig AS jsonb) AND m.artifact_ref=:artifact
              AND m.approved_by IS NULL AND m.approved_at IS NULL AND v.mapping_type='LOGISTIC_CONSERVATIVE_V1'
              AND v.configuration=CAST(:mappingConfig AS jsonb)
              AND EXISTS(SELECT 1 FROM platform.question_bank b JOIN platform.account a ON a.account_id=b.created_by
                WHERE b.question_bank_id=:bank AND a.organization_id=:org AND a.active)
            """, nativeQuery = true)
    List<Integer> mainDevelopmentPinned(@Param("org") UUID organizationId, @Param("bank") UUID bankId, @Param("set") UUID parameterSetId,
            @Param("model") UUID modelVersionId, @Param("mapping") UUID mappingVersionId, @Param("hash") String parameterHash,
            @Param("actor") UUID actorId, @Param("modelConfig") String modelConfiguration, @Param("mappingConfig") String mappingConfiguration,
            @Param("artifact") String artifactRef);

    // Native: jsonb equality of the model/mapping configurations; bank owner and activating L&D Manager belong to the organization.
    @Query(value = """
            SELECT 1 FROM platform.irt_parameter_set p
            JOIN platform.model_version m USING(model_version_id)
            JOIN platform.mastery_mapping_version v ON v.mastery_mapping_version_id=:mapping
            JOIN platform.question_bank b ON b.question_bank_id=:bank
            JOIN platform.account owner ON owner.account_id=b.created_by AND owner.organization_id=:org
            JOIN platform.organization_membership membership ON membership.account_id=:ld AND membership.organization_id=:org AND membership.active
            JOIN platform.organization_membership_role role USING(membership_id)
            WHERE p.parameter_set_id=:parameters AND p.model_version_id=:model AND p.source='SEEDED' AND p.status='PROMOTED'
              AND p.parameter_hash=:hash AND p.activated_by=:ld AND p.activated_at IS NOT NULL
              AND owner.active AND role.role_code='LD_MANAGER' AND b.created_by=:ld
              AND m.algorithm='IRT_3PL' AND m.version=:version AND m.parameter_hash=:hash
              AND m.configuration=CAST(:modelConfig AS jsonb) AND m.artifact_ref=:artifact
              AND m.approved_by IS NULL AND m.approved_at IS NULL
              AND v.mapping_type='LOGISTIC_CONSERVATIVE_V1' AND v.configuration=CAST(:mappingConfig AS jsonb)
            """, nativeQuery = true)
    List<Integer> fixturePinned(@Param("org") UUID organizationId, @Param("bank") UUID bankId, @Param("ld") UUID ldManagerId,
            @Param("model") UUID modelVersionId, @Param("mapping") UUID mappingVersionId, @Param("parameters") UUID parameterSetId,
            @Param("hash") String parameterHash, @Param("version") String modelVersion, @Param("artifact") String artifactRef,
            @Param("modelConfig") String modelConfiguration, @Param("mappingConfig") String mappingConfiguration);

    /** Item parameters of the set whose item is in the bank, of the same skill and in one of the publication states. */
    @Query("""
            select new com.adaptlearngraph.repository.DevelopmentTechnicalVersionJpaRepository$Parameter(
              i.itemVersionId, i.microSkillId, i.discriminationA, i.difficultyB, i.guessingC, v.difficulty, v.contentHash)
            from IrtItemParameterEntity i join ItemVersionEntity v on v.itemVersionId = i.itemVersionId
            where i.parameterSetId = :set and i.microSkillId in :skills and v.questionBankId = :bank
              and v.microSkillId = i.microSkillId and v.publicationState in :states
            order by i.microSkillId, i.itemVersionId
            """)
    List<Parameter> parameters(@Param("set") UUID parameterSetId, @Param("skills") Collection<String> microSkillIds,
            @Param("bank") UUID bankId, @Param("states") Collection<String> publicationStates);

    @Query("""
            select new com.adaptlearngraph.repository.DevelopmentTechnicalVersionJpaRepository$ContentHash(v.itemVersionId, v.contentHash)
            from ItemVersionEntity v where v.itemVersionId in :ids
            """)
    List<ContentHash> contentHashes(@Param("ids") Collection<UUID> itemVersionIds);
}
