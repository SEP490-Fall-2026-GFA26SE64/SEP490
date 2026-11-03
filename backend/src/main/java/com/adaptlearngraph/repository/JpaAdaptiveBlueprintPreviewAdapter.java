package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort.DependencyUnavailable;
import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.Scope;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataAccessException;

/** TMP-REQ002-03: explicit bank + tenant, no component/bean registration until A6's authorized gated API wiring. */
public final class JpaAdaptiveBlueprintPreviewAdapter implements AdaptiveBlueprintPreviewPort {
    private final boolean demoDraft;
    private final ItemVersionJpaRepository items;
    private final ObjectMapper mapper;
    private final UUID bankId;

    public JpaAdaptiveBlueprintPreviewAdapter(ItemVersionJpaRepository items, ObjectMapper mapper, UUID bankId) { this(items, mapper, bankId, false); }

    public JpaAdaptiveBlueprintPreviewAdapter(ItemVersionJpaRepository items, ObjectMapper mapper, UUID bankId, boolean demoDraft) {
        this.demoDraft = demoDraft;
        this.items = Objects.requireNonNull(items);
        this.mapper = Objects.requireNonNull(mapper).copy();
        this.bankId = Objects.requireNonNull(bankId, "Explicit server question bank required");
    }

    @Override public List<Item> read(Scope scope, Set<UUID> authorizedItemVersionIds) {
        Set<UUID> ids = Set.copyOf(authorizedItemVersionIds);
        if (ids.isEmpty()) return List.of();
        try {
            return items.preview(scope.organizationId(), bankId, ids, demoDraft).stream()
                    .map(row -> new Item(row.itemVersionId(), row.microSkillId(), row.prompt(), options(optionsOf(row.responseSchema())))).toList();
        } catch (DataAccessException | IllegalArgumentException | IllegalStateException cause) {
            throw new DependencyUnavailable("Answer-safe preview items unavailable", cause);
        }
    }

    /** Former {@code response_schema->'options'}: the options as JSON text, or null when absent. */
    private String optionsOf(String responseSchema) {
        try {
            var options = mapper.readTree(responseSchema).get("options");
            return options == null ? null : mapper.writeValueAsString(options);
        } catch (JsonProcessingException failure) { throw new IllegalArgumentException("Invalid preview options", failure); }
    }

    private java.util.Map<String, String> options(String payload) {
        try {
            var nodes = mapper.readTree(payload);
            if (nodes == null || !nodes.isArray()) throw new IllegalArgumentException("Invalid preview options");
            var result = new LinkedHashMap<String, String>();
            for (var node : nodes) {
                if (!node.path("id").isTextual() || !node.path("text").isTextual()
                        || result.putIfAbsent(node.get("id").textValue(), node.get("text").textValue()) != null) {
                    throw new IllegalArgumentException("Invalid or duplicate preview option");
                }
            }
            return result;
        } catch (JsonProcessingException failure) { throw new IllegalArgumentException("Invalid preview options", failure); }
    }
}
