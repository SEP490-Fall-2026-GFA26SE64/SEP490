package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.IrtParameterSetEntity;
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
 * Promoted IRT technical versions, plus the calibration seal/promotion state changes of parameter sets. Native SQL is kept on purpose: the effective selection filters on jsonb paths of the
 * calibration run (organization/bank provenance) and optionally share-locks the selection. jsonb columns are cast to
 * text so results are plain strings. Version rows: [parameter_set_id, model_version_id, mastery_mapping_version_id,
 * model_configuration, mapping_configuration]; parameter rows: [item_version_id, micro_skill_id, a, b, c].
 */
public interface IrtTechnicalVersionJpaRepository extends Repository<IrtParameterSetEntity, UUID>, InsertOnlyRepository<IrtParameterSetEntity> {
    String VERSIONS = """
            SELECT parameters.parameter_set_id,parameters.model_version_id,mapping.mastery_mapping_version_id,
                   model.configuration::text AS model_configuration,mapping.configuration::text AS mapping_configuration
            FROM platform.irt_parameter_set parameters
            JOIN platform.model_version model USING (model_version_id)
            JOIN platform.mastery_mapping_version mapping ON mapping.mastery_mapping_version_id=:mapping
            WHERE parameters.model_version_id=:model AND parameters.status='PROMOTED' AND model.algorithm='IRT_3PL'
            """;
    String EFFECTIVE = """
            SELECT parameters.parameter_set_id,parameters.model_version_id,mapping.mastery_mapping_version_id,
                   model.configuration::text AS model_configuration,mapping.configuration::text AS mapping_configuration
            FROM platform.irt_effective_parameter_selection effective
            JOIN platform.irt_parameter_set parameters USING(parameter_set_id,model_version_id)
            JOIN platform.model_version model USING(model_version_id)
            JOIN platform.mastery_mapping_version mapping ON mapping.mastery_mapping_version_id=:mapping
            JOIN platform.irt_calibration_run run ON run.output_parameter_set_id=parameters.parameter_set_id AND run.model_version_id=model.model_version_id
            JOIN platform.question_bank bank ON bank.question_bank_id=effective.question_bank_id
            JOIN platform.account owner ON owner.account_id=bank.created_by
            WHERE effective.organization_id=:organization AND effective.question_bank_id=:bank AND effective.model_version_id=:model
              AND owner.organization_id=:organization AND parameters.status='PROMOTED' AND parameters.source='CALIBRATED'
              AND model.algorithm='IRT_3PL' AND model.approved_by IS NOT NULL AND model.approved_at IS NOT NULL
              AND run.status='SUCCEEDED' AND run.configuration->>'origin'='ACTUAL_PILOT'
              AND run.configuration->'request'->'scope'->>'organizationId'=CAST(:organization AS text)
              AND run.configuration->'request'->'scope'->>'bankId'=CAST(:bank AS text)
            """;

    @Query(value = VERSIONS + " ORDER BY parameters.activated_at DESC,parameters.parameter_set_id LIMIT 1", nativeQuery = true)
    List<Object[]> promoted(@Param("model") UUID modelVersionId, @Param("mapping") UUID mappingVersionId);

    @Query(value = EFFECTIVE, nativeQuery = true)
    List<Object[]> effective(@Param("organization") UUID organizationId, @Param("bank") UUID bankId, @Param("model") UUID modelVersionId,
            @Param("mapping") UUID mappingVersionId);

    /** Same as {@link #effective} inside a transaction: holds the selection stable ({@code FOR SHARE OF effective}). */
    @Query(value = EFFECTIVE + " FOR SHARE OF effective", nativeQuery = true)
    List<Object[]> effectiveShared(@Param("organization") UUID organizationId, @Param("bank") UUID bankId, @Param("model") UUID modelVersionId,
            @Param("mapping") UUID mappingVersionId);

    @Query(value = VERSIONS + " AND parameters.parameter_set_id=:parameters", nativeQuery = true)
    List<Object[]> pinned(@Param("model") UUID modelVersionId, @Param("mapping") UUID mappingVersionId, @Param("parameters") UUID parameterSetId);

    @Query(value = """
            SELECT item.item_version_id,item.micro_skill_id,item.discrimination_a,item.difficulty_b,item.guessing_c
            FROM platform.irt_item_parameter item
            JOIN platform.irt_parameter_set parameters USING (parameter_set_id)
            JOIN platform.model_version model USING (model_version_id)
            JOIN platform.mastery_mapping_version mapping ON mapping.mastery_mapping_version_id=:mapping
            WHERE parameters.parameter_set_id=:parameters AND parameters.model_version_id=:model
              AND parameters.status='PROMOTED' AND model.algorithm='IRT_3PL' AND item.micro_skill_id IN (:skills)
            ORDER BY item.micro_skill_id,item.item_version_id
            """, nativeQuery = true)
    List<Object[]> parameters(@Param("model") UUID modelVersionId, @Param("mapping") UUID mappingVersionId,
            @Param("parameters") UUID parameterSetId, @Param("skills") Collection<String> microSkillIds);

    /** Calibration seal: a BUILDING set becomes an immutable CANDIDATE (the deferred seal trigger validates content). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update IrtParameterSetEntity s set s.status='CANDIDATE' where s.parameterSetId=:set and s.status='BUILDING'")
    int seal(@Param("set") UUID parameterSetId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update IrtParameterSetEntity s set s.status='PROMOTED',s.activatedBy=:actor,s.activatedAt=:time
            where s.parameterSetId=:set and s.modelVersionId=:model and s.status='CANDIDATE'
            """)
    int promote(@Param("set") UUID parameterSetId, @Param("model") UUID modelVersionId, @Param("actor") UUID actorId,
            @Param("time") Instant activatedAt);

    /**
     * Calibrated set of a succeeded run in the organization/bank scope, share-locking set and run. Columns: [source, status,
     * parameter_hash, created_at, activated_by, activated_at, run configuration, run diagnostics].
     */
    // jsonb path filters on the run configuration and FOR SHARE OF both joined rows.
    @Query(value = """
            SELECT s.source,s.status,s.parameter_hash::text,s.created_at,s.activated_by,s.activated_at,
                   r.configuration::text,r.diagnostics::text
            FROM platform.irt_parameter_set s
            JOIN platform.irt_calibration_run r ON r.output_parameter_set_id=s.parameter_set_id AND r.model_version_id=s.model_version_id
            WHERE s.parameter_set_id=:set AND s.model_version_id=:model AND r.status='SUCCEEDED'
              AND r.configuration->'request'->'scope'->>'organizationId'=:org
              AND r.configuration->'request'->'scope'->>'bankId'=:bank
            FOR SHARE OF s,r
            """, nativeQuery = true)
    List<Object[]> calibratedCandidate(@Param("set") UUID parameterSetId, @Param("model") UUID modelVersionId,
            @Param("org") String organizationId, @Param("bank") String bankId);
}