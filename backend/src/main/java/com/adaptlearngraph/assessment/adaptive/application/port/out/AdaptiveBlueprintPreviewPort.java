package com.adaptlearngraph.assessment.adaptive.application.port.out;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Scope;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Read-only, answer-safe projection of IDs already authorized by eligibility, never an arbitrary item lookup API. */
public interface AdaptiveBlueprintPreviewPort {
    List<Item> read(Scope scope, Set<UUID> authorizedItemVersionIds);

    /** Explicit allowlist: no protected key, correctness, rationale or estimator state. */
    record Item(UUID itemVersionId, String microSkillId, String prompt, Map<String, String> options) {
        public Item {
            Objects.requireNonNull(itemVersionId);
            if (microSkillId == null || microSkillId.isBlank() || prompt == null || prompt.isBlank()) {
                throw new IllegalArgumentException("Complete preview item required");
            }
            options = Map.copyOf(options);
            if (options.size() < 2 || options.entrySet().stream().anyMatch(option -> option.getKey().isBlank() || option.getValue().isBlank())) {
                throw new IllegalArgumentException("Complete preview options required");
            }
        }
    }
}
