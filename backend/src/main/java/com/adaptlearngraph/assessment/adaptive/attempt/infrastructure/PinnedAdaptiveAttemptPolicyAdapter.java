package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveTechnicalVersionPort;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.AdaptiveAttemptPolicyPort;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy;
import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy.Mapping;
import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy.Model;
import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy.Versions;
import com.adaptlearngraph.assessment.adaptive.psychometrics.Irt3pl.Item;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

/** Unwired, read-only adapter over A3 exact pins. Authorization remains the caller's responsibility. */
public final class PinnedAdaptiveAttemptPolicyAdapter implements AdaptiveAttemptPolicyPort {
    private final AdaptiveTechnicalVersionPort technical;
    private final ObjectMapper json = new ObjectMapper()
            .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES)
            .enable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES);

    public PinnedAdaptiveAttemptPolicyAdapter(AdaptiveTechnicalVersionPort technical) {
        this.technical = Objects.requireNonNull(technical);
    }

    @Override public Policy load(VersionPins pins, Map<UUID, String> authorizedItemSkills) {
        if (pins == null) throw new Failure(Code.INVALID_POLICY);
        if (authorizedItemSkills == null || authorizedItemSkills.isEmpty()
                || authorizedItemSkills.entrySet().stream().anyMatch(entry -> entry.getKey() == null
                || entry.getKey().equals(new UUID(0, 0)) || entry.getValue() == null
                || entry.getValue().isBlank() || !entry.getValue().equals(entry.getValue().strip()))) {
            throw new Failure(Code.INVALID_PARAMETERS);
        }
        Map<UUID, String> pool = Map.copyOf(authorizedItemSkills);
        try {
            var stored = technical.findPinned(pins).orElseThrow(() -> new Failure(Code.PINNED_VERSION_UNAVAILABLE));
            if (!pins.equals(stored.pins())) throw new Failure(Code.INVALID_POLICY);
            Model model = configuration(stored.modelConfigurationJson(), Model.class);
            Mapping mapping = configuration(stored.mappingConfigurationJson(), Mapping.class);
            var versions = new Versions(pins.modelVersionId(), pins.masteryMappingVersionId(), pins.parameterSetId(), model, mapping);
            Map<UUID, Item> items = new TreeMap<>(Comparator.comparing(UUID::toString));
            for (var parameter : technical.findParameters(pins, Set.copyOf(pool.values()))) {
                // A3 queries by skill, so other items in these skills are legitimate but never expand this pool.
                if (!pool.containsKey(parameter.itemVersionId())) continue;
                if (!pool.get(parameter.itemVersionId()).equals(parameter.microSkillId())) throw new Failure(Code.INVALID_PARAMETERS);
                Item item = new Item(parameter.itemVersionId(), parameter.microSkillId(), pins.parameterSetId(),
                        parameter.a().doubleValue(), parameter.b().doubleValue(), parameter.c().doubleValue());
                model.validate(item);
                if (items.putIfAbsent(item.id(), item) != null) throw new Failure(Code.INVALID_PARAMETERS);
            }
            if (!items.keySet().equals(pool.keySet())) throw new Failure(Code.INVALID_PARAMETERS);
            return new Policy(versions, List.copyOf(items.values()));
        } catch (AdaptiveIrtPolicy.Failure invalid) {
            throw new Failure(Code.INVALID_PARAMETERS);
        } catch (AdaptiveBlueprintUseCase.Failure unavailable) {
            if (unavailable.code() != AdaptiveBlueprintUseCase.Code.DEPENDENCY_UNAVAILABLE) throw unavailable;
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        }
    }

    /** Only the two B4 records are decoded; exact field count and scalar types precede construction. */
    private <T extends Record> T configuration(String payload, Class<T> type) {
        try {
            JsonNode root = json.readTree(payload);
            var fields = type.getRecordComponents();
            if (root == null || !root.isObject() || root.size() != fields.length) throw new Failure(Code.INVALID_POLICY);
            for (var field : fields) {
                JsonNode value = root.get(field.getName());
                boolean valid = value != null && (field.getType() == String.class ? value.isTextual()
                        : field.getType() == int.class ? value.isIntegralNumber() && value.canConvertToInt()
                        : value.isNumber() && Double.isFinite(value.doubleValue()));
                if (!valid) throw new Failure(Code.INVALID_POLICY);
            }
            return json.treeToValue(root, type);
        } catch (JsonProcessingException | IllegalArgumentException invalid) {
            // Do not retain parser exceptions containing raw stored configuration in public error chains.
            throw new Failure(Code.INVALID_POLICY);
        }
    }
}
