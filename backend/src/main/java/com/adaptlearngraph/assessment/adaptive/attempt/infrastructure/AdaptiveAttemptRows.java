package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintStore;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttemptSnapshot;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Internal record JSON and exact immutable Blueprint reads; never an API serializer. */
final class AdaptiveAttemptRows {
    private final NamedParameterJdbcTemplate jdbc;
    private final AdaptiveBlueprintStore blueprints;
    private final ObjectMapper json;

    AdaptiveAttemptRows(NamedParameterJdbcTemplate jdbc, ObjectMapper json, AdaptiveBlueprintStore blueprints) {
        this.jdbc = jdbc; this.blueprints = blueprints;
        this.json = json.copy().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    AdaptiveAttempt header(ResultSet row) throws SQLException {
        var scope = new AdaptiveAttempt.Scope(row.getObject("organization_id", UUID.class), row.getObject("learner_id", UUID.class), row.getString("occupation_id"));
        UUID id = row.getObject("attempt_id", UUID.class);
        var blueprint = blueprints.findVersion(new AdaptiveBlueprint.Scope(scope.organizationId(), scope.occupationId()),
                new AdaptiveBlueprint.VersionId(row.getObject("blueprint_id", UUID.class), row.getInt("blueprint_version"))).orElseThrow();
        Map<UUID, String> pool = new LinkedHashMap<>();
        jdbc.query("SELECT item_version_id,micro_skill_id FROM platform.baseline_attempt_pool_item WHERE organization_id=:org AND attempt_id=:id ORDER BY item_version_id",
                AdaptiveAttemptJdbc.key(scope, id), rs -> { pool.put(rs.getObject(1, UUID.class), rs.getString(2)); });
        var snapshot = new AdaptiveAttemptSnapshot(blueprint, AdaptiveAttemptSnapshot.Purpose.valueOf(row.getString("attempt_purpose")),
                Optional.ofNullable(row.getString("target_role_id")), Optional.ofNullable(row.getObject("target_selection_revision", Long.class)), pool);
        String expectedPolicy = blueprint.configuration().occupationBounds() == null ? null : AdaptiveBlueprint.ScopePolicy.FULL_OCCUPATION_V2.name();
        if (!java.util.Objects.equals(expectedPolicy, row.getString("scope_policy"))) throw new IllegalStateException("Attempt scope pin mismatch");
        if (!blueprint.pins().modelVersionId().equals(row.getObject("model_version_id", UUID.class))
                || !blueprint.pins().masteryMappingVersionId().equals(row.getObject("mastery_mapping_version_id", UUID.class))
                || !blueprint.pins().parameterSetId().equals(row.getObject("parameter_set_id", UUID.class))
                || !blueprint.catalogFingerprint().equals(row.getString("catalog_fingerprint"))
                || snapshot.bounds().maxQuestions() != row.getInt("max_questions")
                || snapshot.bounds().timeLimitSeconds() != row.getInt("time_limit_seconds")) {
            throw new IllegalStateException("Attempt immutable inputs differ from pinned Blueprint");
        }
        return new AdaptiveAttempt(id, scope, snapshot, row.getLong("revision"), AdaptiveAttempt.Status.valueOf(row.getString("state")),
                row.getTimestamp("started_at").toInstant(), row.getTimestamp("deadline_at").toInstant(),
                Optional.ofNullable(row.getTimestamp("finished_at")).map(java.sql.Timestamp::toInstant),
                Optional.ofNullable(row.getObject("replaces_attempt_id", UUID.class)),
                Optional.ofNullable(row.getString("completion_reason")).map(AdaptiveAttempt.CompletionReason::valueOf));
    }

    MapSqlParameterSource parameters(AdaptiveAttempt attempt) {
        var blueprint = attempt.snapshot().blueprint();
        return AdaptiveAttemptJdbc.key(attempt.scope(), attempt.id())
                .addValue("purpose", attempt.snapshot().purpose().name()).addValue("role", attempt.snapshot().roleId().orElse(null))
                .addValue("selection", attempt.snapshot().selectionRevision().orElse(null)).addValue("blueprint", blueprint.id().blueprintId())
                .addValue("version", blueprint.id().version()).addValue("model", blueprint.pins().modelVersionId())
                .addValue("mapping", blueprint.pins().masteryMappingVersionId()).addValue("parameters", blueprint.pins().parameterSetId())
                .addValue("fingerprint", blueprint.catalogFingerprint()).addValue("maximum", attempt.snapshot().bounds().maxQuestions())
                .addValue("duration", attempt.snapshot().bounds().timeLimitSeconds()).addValue("revision", attempt.revision())
                .addValue("policy", blueprint.configuration().occupationBounds() == null ? null : AdaptiveBlueprint.ScopePolicy.FULL_OCCUPATION_V2.name())
                .addValue("state", attempt.status().name()).addValue("started", time(attempt.startedAt())).addValue("deadline", time(attempt.deadlineAt()))
                .addValue("finished", attempt.finishedAt().map(AdaptiveAttemptRows::time).orElse(null))
                .addValue("reason", attempt.completionReason().map(Enum::name).orElse(null)).addValue("replaces", attempt.replacesAttemptId().orElse(null));
    }

    String write(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException cause) { throw new IllegalStateException("Cannot encode attempt state", cause); }
    }
    <T> T read(String value, Class<T> type) {
        try { return json.readValue(value, type); }
        catch (JsonProcessingException cause) { throw new IllegalStateException("Cannot decode attempt state", cause); }
    }
    static java.time.OffsetDateTime time(Instant value) { return value.atOffset(ZoneOffset.UTC); }
}
