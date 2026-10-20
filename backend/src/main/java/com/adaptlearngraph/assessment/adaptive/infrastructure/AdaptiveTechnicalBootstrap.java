package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionPins;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** TMP-REQ002-07. Local/demo cold-start data only; never a production calibration or approval API. */
public final class AdaptiveTechnicalBootstrap {
    @ConfigurationProperties("assessment.baseline.adaptive.bootstrap")
    public record Properties(boolean enabled, UUID administratorId, UUID questionBankId,
                             String modelConfiguration, String masteryMappingConfiguration) {}

    private final NamedParameterJdbcTemplate jdbc;
    private final AdaptiveBlueprintJson json;
    private final TransactionTemplate transactions;

    public AdaptiveTechnicalBootstrap(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper, PlatformTransactionManager manager) {
        this.jdbc = Objects.requireNonNull(jdbc);
        this.json = new AdaptiveBlueprintJson(mapper);
        this.transactions = new TransactionTemplate(manager);
        transactions.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    /** Caller must be gated by the explicit local/demo configuration; absent policy has no default. */
    public VersionPins initialize(Properties settings) {
        if (!settings.enabled()) throw new IllegalStateException("Technical bootstrap is disabled");
        Objects.requireNonNull(settings.administratorId(), "Configured Administrator is required");
        Objects.requireNonNull(settings.questionBankId(), "Configured development question bank is required");
        String model = json.canonicalObject(settings.modelConfiguration());
        String mapping = json.canonicalObject(settings.masteryMappingConfiguration());
        return transactions.execute(status -> {
            var params = new MapSqlParameterSource("admin", settings.administratorId()).addValue("bank", settings.questionBankId());
            jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(:lock,0))",
                    new MapSqlParameterSource("lock", "adaptive-technical-bootstrap:" + settings.questionBankId()), (rs, row) -> true);
            Boolean administrator = jdbc.queryForObject("""
                    SELECT EXISTS (SELECT 1 FROM platform.account actor JOIN platform.account_role role ON role.account_id=actor.account_id
                    WHERE actor.account_id=:admin AND actor.active AND role.role_code IN ('ADMINISTRATOR','PLATFORM_ADMINISTRATOR'))
                    """, params, Boolean.class);
            if (!Boolean.TRUE.equals(administrator)) throw new IllegalStateException("Active configured System Administrator required");
            List<Map<String, Object>> items = jdbc.queryForList("""
                    WITH latest AS (
                        SELECT DISTINCT ON (item_id) item_version_id,micro_skill_id,difficulty,content_hash,response_schema
                        FROM platform.item_version WHERE question_bank_id=:bank AND publication_state='PUBLISHED'
                        ORDER BY item_id,version DESC,item_version_id
                    ) SELECT item_version_id,micro_skill_id,difficulty,content_hash FROM latest
                    WHERE micro_skill_id IS NOT NULL AND btrim(micro_skill_id)<>'' AND difficulty IN ('EASY','MEDIUM','HARD')
                      AND CASE WHEN jsonb_typeof(response_schema->'options')='array'
                          THEN jsonb_array_length(response_schema->'options')=4 ELSE false END
                    ORDER BY item_version_id
                    """, params);
            if (items.isEmpty()) throw new IllegalStateException("Bootstrap needs published four-option development items");
            String modelHash = AdaptiveBlueprintJson.hash(model);
            String mappingHash = AdaptiveBlueprintJson.hash(mapping);
            UUID modelId = identity("model:" + modelHash);
            UUID mappingId = identity("mapping:" + mappingHash);
            String parameterHash = AdaptiveBlueprintJson.hash("seed-3pl-v1:" + modelId + ":" + settings.questionBankId() + ":" + json.write(items));
            UUID parameterId = identity("parameters:" + parameterHash);
            params.addValue("model", modelId).addValue("mapping", mappingId).addValue("parameters", parameterId)
                    .addValue("modelHash", modelHash).addValue("mappingHash", mappingHash).addValue("parameterHash", parameterHash)
                    .addValue("modelConfig", model).addValue("mappingConfig", mapping).addValue("version", "local-" + modelHash);
            jdbc.update("""
                    INSERT INTO platform.model_version(model_version_id,algorithm,version,parameter_hash,configuration,artifact_ref,approved_by,approved_at)
                    VALUES (:model,'IRT_3PL',:version,:modelHash,CAST(:modelConfig AS jsonb),'local-demo-config:'||:modelHash,:admin,now())
                    ON CONFLICT DO NOTHING
                    """, params);
            jdbc.update("""
                    INSERT INTO platform.mastery_mapping_version(mastery_mapping_version_id,mapping_type,configuration,configuration_hash)
                    VALUES (:mapping,'LOGISTIC_CONSERVATIVE_V1',CAST(:mappingConfig AS jsonb),:mappingHash) ON CONFLICT DO NOTHING
                    """, params);
            Boolean configurationsMatch = jdbc.queryForObject("""
                    SELECT EXISTS (SELECT 1 FROM platform.model_version model JOIN platform.mastery_mapping_version mapping ON mapping.mastery_mapping_version_id=:mapping
                    WHERE model.model_version_id=:model AND model.algorithm='IRT_3PL' AND model.parameter_hash=:modelHash
                      AND model.configuration=CAST(:modelConfig AS jsonb) AND mapping.configuration_hash=:mappingHash
                      AND mapping.configuration=CAST(:mappingConfig AS jsonb))
                    """, params, Boolean.class);
            if (!Boolean.TRUE.equals(configurationsMatch)) throw new IllegalStateException("Bootstrap configuration identity conflict");
            List<String> states = jdbc.query("""
                    SELECT status FROM platform.irt_parameter_set WHERE parameter_set_id=:parameters
                    AND model_version_id=:model AND parameter_hash=:parameterHash AND source='SEEDED'
                    """, params, (rs, row) -> rs.getString(1));
            if (states.isEmpty()) {
                jdbc.update("""
                        INSERT INTO platform.irt_parameter_set(parameter_set_id,model_version_id,source,status,parameter_hash)
                        VALUES (:parameters,:model,'SEEDED','BUILDING',:parameterHash)
                        """, params);
                for (Map<String, Object> item : items) {
                    int difficulty = switch ((String) item.get("difficulty")) { case "EASY" -> -1; case "MEDIUM" -> 0; case "HARD" -> 1; default -> throw new IllegalStateException("Unknown difficulty"); };
                    jdbc.update("""
                            INSERT INTO platform.irt_item_parameter(parameter_set_id,item_version_id,micro_skill_id,discrimination_a,difficulty_b,guessing_c)
                            VALUES (:parameters,:item,:skill,1,:difficulty,0.25)
                            """, params.addValue("item", item.get("item_version_id")).addValue("skill", item.get("micro_skill_id")).addValue("difficulty", difficulty));
                }
                jdbc.update("UPDATE platform.irt_parameter_set SET status='CANDIDATE' WHERE parameter_set_id=:parameters", params);
            }
            jdbc.update("""
                    UPDATE platform.irt_parameter_set SET status='PROMOTED',activated_by=:admin,activated_at=now()
                    WHERE parameter_set_id=:parameters AND status='CANDIDATE' AND source='SEEDED'
                    """, params);
            Boolean promoted = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM platform.irt_parameter_set WHERE parameter_set_id=:parameters AND status='PROMOTED')", params, Boolean.class);
            if (!Boolean.TRUE.equals(promoted)) throw new IllegalStateException("Bootstrap set is not promoted");
            return new VersionPins(modelId, mappingId, parameterId);
        });
    }

    private static UUID identity(String value) {
        return UUID.nameUUIDFromBytes(("adapt-learn-graph:local-demo:" + value).getBytes(StandardCharsets.UTF_8));
    }
}
