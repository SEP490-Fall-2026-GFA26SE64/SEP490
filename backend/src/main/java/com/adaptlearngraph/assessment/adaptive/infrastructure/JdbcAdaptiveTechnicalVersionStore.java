package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveTechnicalVersionPort;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionPins;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Global system-owned technical data, not tenant catalog authorization or an eligibility adapter. */
public final class JdbcAdaptiveTechnicalVersionStore implements AdaptiveTechnicalVersionPort {
    private final NamedParameterJdbcTemplate jdbc;
    private static final String VERSIONS = """
            SELECT parameters.parameter_set_id,parameters.model_version_id,mapping.mastery_mapping_version_id,
                   model.configuration AS model_configuration,mapping.configuration AS mapping_configuration
            FROM platform.irt_parameter_set parameters
            JOIN platform.model_version model USING (model_version_id)
            JOIN platform.mastery_mapping_version mapping ON mapping.mastery_mapping_version_id=:mapping
            WHERE parameters.model_version_id=:model AND parameters.status='PROMOTED' AND model.algorithm='IRT_3PL'
            """;

    public JdbcAdaptiveTechnicalVersionStore(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = Objects.requireNonNull(jdbc, "jdbc");
    }

    @Override
    @Deprecated
    public Optional<TechnicalVersions> findPromoted(UUID modelVersionId, UUID mappingVersionId) {
        return versions(VERSIONS + " ORDER BY parameters.activated_at DESC,parameters.parameter_set_id LIMIT 1",
                new MapSqlParameterSource("model", modelVersionId).addValue("mapping", mappingVersionId));
    }

    @Override
    public Optional<TechnicalVersions> findEffective(UUID organizationId, UUID bankId, UUID modelVersionId, UUID mappingVersionId) {
        String lock = org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()
                ? " FOR SHARE OF effective" : "";
        return versions("""
                SELECT parameters.parameter_set_id,parameters.model_version_id,mapping.mastery_mapping_version_id,
                       model.configuration AS model_configuration,mapping.configuration AS mapping_configuration
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
                """ + lock, new MapSqlParameterSource("organization",organizationId).addValue("bank",bankId)
                .addValue("model",modelVersionId).addValue("mapping",mappingVersionId));
    }

    @Override
    public Optional<TechnicalVersions> findPinned(VersionPins pins) {
        return versions(VERSIONS + " AND parameters.parameter_set_id=:parameters", key(pins));
    }

    @Override
    public List<ItemParameter> findParameters(VersionPins pins, Set<String> microSkillIds) {
        Objects.requireNonNull(pins, "pins");
        Set<String> skills = Set.copyOf(microSkillIds);
        if (skills.isEmpty()) return List.of();
        return read(() -> jdbc.query("""
                SELECT item.item_version_id,item.micro_skill_id,item.discrimination_a,item.difficulty_b,item.guessing_c
                FROM platform.irt_item_parameter item
                JOIN platform.irt_parameter_set parameters USING (parameter_set_id)
                JOIN platform.model_version model USING (model_version_id)
                JOIN platform.mastery_mapping_version mapping ON mapping.mastery_mapping_version_id=:mapping
                WHERE parameters.parameter_set_id=:parameters AND parameters.model_version_id=:model
                  AND parameters.status='PROMOTED' AND model.algorithm='IRT_3PL' AND item.micro_skill_id IN (:skills)
                ORDER BY item.micro_skill_id,item.item_version_id
                """, key(pins).addValue("skills", skills), (rs, row) -> new ItemParameter(rs.getObject("item_version_id", UUID.class),
                rs.getString("micro_skill_id"), rs.getBigDecimal("discrimination_a"), rs.getBigDecimal("difficulty_b"), rs.getBigDecimal("guessing_c"))));
    }

    private Optional<TechnicalVersions> versions(String sql, MapSqlParameterSource params) {
        return read(() -> jdbc.query(sql, params, (rs, row) -> new TechnicalVersions(new VersionPins(
                rs.getObject("model_version_id", UUID.class), rs.getObject("mastery_mapping_version_id", UUID.class),
                rs.getObject("parameter_set_id", UUID.class)), rs.getString("model_configuration"), rs.getString("mapping_configuration")))
                .stream().findFirst());
    }

    private static MapSqlParameterSource key(VersionPins pins) {
        return new MapSqlParameterSource("model", pins.modelVersionId()).addValue("mapping", pins.masteryMappingVersionId())
                .addValue("parameters", pins.parameterSetId());
    }

    private static <T> T read(Supplier<T> operation) {
        try { return operation.get(); }
        catch (DataAccessException cause) {
            Failure failure = new Failure(Code.DEPENDENCY_UNAVAILABLE, "Technical versions are unavailable", List.of());
            failure.initCause(cause);
            throw failure;
        }
    }
}
