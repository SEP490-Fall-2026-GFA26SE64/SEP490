package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AdaptiveAttempt;
import com.adaptlearngraph.entities.AdaptiveAttemptSnapshot;
import com.adaptlearngraph.entities.AdaptiveBlueprint;
import com.adaptlearngraph.entities.BaselineAdaptiveAttemptEntity;
import com.adaptlearngraph.entities.OrganizationAssessmentPolicy;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Internal record JSON, header projection mapping and exact immutable Blueprint reads; never an API serializer. */
public final class AdaptiveAttemptRows {
    private final AdaptiveAttemptRepositories data;
    private final AdaptiveBlueprintStore blueprints;
    private final ObjectMapper json;

    AdaptiveAttemptRows(AdaptiveAttemptRepositories data, ObjectMapper json, AdaptiveBlueprintStore blueprints) {
        this.data = data; this.blueprints = blueprints;
        this.json = json.copy().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    AdaptiveAttempt header(AdaptiveAttemptJpaRepository.Row row) {
        var scope = new AdaptiveAttempt.Scope(row.organizationId(), row.learnerId(), row.occupationId());
        UUID id = row.attemptId();
        var blueprint = blueprints.findVersion(new AdaptiveBlueprint.Scope(scope.organizationId(), scope.occupationId()),
                new AdaptiveBlueprint.VersionId(row.blueprintId(), row.blueprintVersion())).orElseThrow();
        Map<UUID, String> pool = new LinkedHashMap<>();
        data.pool().pool(scope.organizationId(), id).forEach(item -> pool.put(item.itemVersionId(), item.microSkillId()));
        var snapshot = new AdaptiveAttemptSnapshot(blueprint, AdaptiveAttemptSnapshot.Purpose.valueOf(row.attemptPurpose()),
                Optional.ofNullable(row.targetRoleId()), Optional.ofNullable(row.targetSelectionRevision()), pool,
                policy(row, scope.organizationId()));
        String expectedPolicy = blueprint.configuration().occupationBounds() == null ? null : AdaptiveBlueprint.ScopePolicy.FULL_OCCUPATION_V2.name();
        if (!Objects.equals(expectedPolicy, row.scopePolicy())) throw new IllegalStateException("Attempt scope pin mismatch");
        if (!blueprint.pins().modelVersionId().equals(row.modelVersionId())
                || !blueprint.pins().masteryMappingVersionId().equals(row.masteryMappingVersionId())
                || !blueprint.pins().parameterSetId().equals(row.parameterSetId())
                || !blueprint.catalogFingerprint().equals(row.catalogFingerprint())
                || snapshot.bounds().maxQuestions() != row.maxQuestions()
                || snapshot.bounds().timeLimitSeconds() != row.timeLimitSeconds()) {
            throw new IllegalStateException("Attempt immutable inputs differ from pinned Blueprint");
        }
        return new AdaptiveAttempt(id, scope, snapshot, row.revision(), AdaptiveAttempt.Status.valueOf(row.state()),
                row.startedAt(), row.deadlineAt(), Optional.ofNullable(row.finishedAt()), Optional.ofNullable(row.replacesAttemptId()),
                Optional.ofNullable(row.completionReason()).map(AdaptiveAttempt.CompletionReason::valueOf));
    }

    BaselineAdaptiveAttemptEntity entity(AdaptiveAttempt attempt) {
        var blueprint = attempt.snapshot().blueprint();
        var policy = attempt.snapshot().assessmentPolicy();
        return new BaselineAdaptiveAttemptEntity(attempt.id(), attempt.scope().organizationId(), attempt.scope().learnerId(),
                attempt.scope().occupationId(), attempt.snapshot().purpose().name(), attempt.snapshot().roleId().orElse(null),
                attempt.snapshot().selectionRevision().orElse(null), blueprint.id().blueprintId(), blueprint.id().version(),
                blueprint.pins().modelVersionId(), blueprint.pins().masteryMappingVersionId(), blueprint.pins().parameterSetId(),
                blueprint.catalogFingerprint(), attempt.snapshot().bounds().maxQuestions(), attempt.snapshot().bounds().timeLimitSeconds(),
                attempt.status().name(), attempt.revision(), attempt.startedAt(), attempt.deadlineAt(), attempt.finishedAt().orElse(null),
                attempt.completionReason().map(Enum::name).orElse(null), attempt.replacesAttemptId().orElse(null),
                blueprint.configuration().occupationBounds() == null ? null : AdaptiveBlueprint.ScopePolicy.FULL_OCCUPATION_V2.name(),
                policy.isPresent() ? OrganizationAssessmentPolicy.SCHEMA : null, policy.map(p -> p.versionId()).orElse(null),
                policy.map(p -> p.hash()).orElse(null), policy.map(p -> write(p.values())).orElse(null));
    }

    private Optional<OrganizationAssessmentPolicy.Pin> policy(AdaptiveAttemptJpaRepository.Row row, UUID organization) {
        String mode = row.assessmentPolicyMode();
        if (mode == null) {
            if (row.assessmentPolicyVersionId() != null || row.assessmentPolicyHash() != null || row.assessmentPolicySnapshot() != null)
                throw new IllegalStateException("Corrupt legacy assessment policy");
            return Optional.empty();
        }
        if (!OrganizationAssessmentPolicy.SCHEMA.equals(mode)) throw new IllegalStateException("Unsupported assessment policy");
        return Optional.of(new OrganizationAssessmentPolicy.Pin(organization, row.assessmentPolicyVersionId(), row.assessmentPolicyHash(),
                read(row.assessmentPolicySnapshot(), OrganizationAssessmentPolicy.Values.class)));
    }

    /** {@code response_payload->>'selectedOptionId'}: text of the value, or null when absent or JSON null. */
    String selectedOption(String responsePayload) {
        JsonNode value = read(responsePayload, JsonNode.class).get("selectedOptionId");
        if (value == null || value.isNull()) return null;
        return value.isValueNode() ? value.asText() : value.toString();
    }

    /** {@code jsonb_build_object('selectedOptionId', CAST(:option AS text))}. */
    String responsePayload(String selectedOptionId) {
        return write(json.createObjectNode().put("selectedOptionId", selectedOptionId));
    }

    String write(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException cause) { throw new IllegalStateException("Cannot encode attempt state", cause); }
    }
    <T> T read(String value, Class<T> type) {
        try { return json.readValue(value, type); }
        catch (JsonProcessingException cause) { throw new IllegalStateException("Cannot decode attempt state", cause); }
    }
    <T> T read(String value, TypeReference<T> type) {
        try { return json.readValue(value, type); }
        catch (JsonProcessingException cause) { throw new IllegalStateException("Cannot decode attempt state", cause); }
    }

    /** timestamptz scalar of a native query, whichever java.time/legacy Date type the driver/Hibernate produced. */
    static Instant instant(Object value) {
        if (value == null) return null;
        if (value instanceof Instant instant) return instant;
        if (value instanceof OffsetDateTime offset) return offset.toInstant();
        if (value instanceof ZonedDateTime zoned) return zoned.toInstant();
        // A driver Timestamp is a java.util.Date subclass whose toInstant() keeps nanosecond precision.
        if (value instanceof java.util.Date date) return date.toInstant();
        throw new IllegalStateException("Unexpected timestamp type " + value.getClass().getName());
    }
}
