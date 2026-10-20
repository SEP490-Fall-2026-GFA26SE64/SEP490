package com.adaptlearngraph.assessment.adaptive.application.port.out;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionPins;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** System-owned version reads. Callers authorize catalog scope before requesting skill parameters. */
public interface AdaptiveTechnicalVersionPort {
    Optional<TechnicalVersions> findPromoted(UUID modelVersionId, UUID mappingVersionId);

    /** Exact pins only; no fallback to latest after Blueprint/attempt creation. */
    Optional<TechnicalVersions> findPinned(VersionPins pins);

    List<ItemParameter> findParameters(VersionPins pins, Set<String> microSkillIds);

    /** Serialized configuration is opaque here; the estimator slice owns its typed policy mapping. */
    record TechnicalVersions(VersionPins pins, String modelConfigurationJson,
                             String mappingConfigurationJson) {
        public TechnicalVersions {
            Objects.requireNonNull(pins, "pins");
            Objects.requireNonNull(modelConfigurationJson, "modelConfigurationJson");
            Objects.requireNonNull(mappingConfigurationJson, "mappingConfigurationJson");
        }
    }

    record ItemParameter(UUID itemVersionId, String microSkillId, BigDecimal a, BigDecimal b, BigDecimal c) {
        public ItemParameter {
            Objects.requireNonNull(itemVersionId, "itemVersionId");
            if (microSkillId == null || microSkillId.isBlank()) throw new IllegalArgumentException("Skill required");
            Objects.requireNonNull(a, "a");
            Objects.requireNonNull(b, "b");
            Objects.requireNonNull(c, "c");
            if (a.signum() <= 0 || c.signum() < 0 || c.compareTo(BigDecimal.ONE) >= 0) {
                throw new IllegalArgumentException("Invalid 3PL parameters");
            }
        }
    }
}
