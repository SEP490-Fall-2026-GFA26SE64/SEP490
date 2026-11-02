package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.entities.AdaptiveAttempt.Scope;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Exact immutable content, including superseded publications; never query latest/current on resume. */
public final class JpaAdaptiveAttemptContent implements AdaptiveAttemptContentPort {
    private final boolean demoDraft;
    private final ItemVersionJpaRepository items;
    private final UUID bankId;
    private final ObjectMapper json = new ObjectMapper();
    public JpaAdaptiveAttemptContent(ItemVersionJpaRepository items, UUID bankId) { this(items, bankId, false); }

    public JpaAdaptiveAttemptContent(ItemVersionJpaRepository items, UUID bankId, boolean demoDraft) {
        this.demoDraft = demoDraft;
        this.items = items; this.bankId = Objects.requireNonNull(bankId);
    }
    @Override public Item read(Scope scope, UUID itemVersionId) {
        var rows = items.owned(scope.organizationId(), bankId, itemVersionId, demoDraft).stream()
                .map(row -> new Item(row.itemVersionId(), row.prompt(), options(optionsOf(row.responseSchema())))).toList();
        if (rows.size() != 1 || rows.getFirst().prompt() == null || rows.getFirst().prompt().isBlank()) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        }
        return rows.getFirst();
    }
    /** Former {@code response_schema->'options'}: the options value as JSON text, or null when absent. */
    private String optionsOf(String responseSchema) {
        try {
            var options = json.readTree(responseSchema).get("options");
            return options == null ? null : json.writeValueAsString(options);
        } catch (JsonProcessingException | IllegalArgumentException invalid) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        }
    }

    private Map<String, String> options(String payload) {
        try {
            var nodes = json.readTree(payload);
            if (nodes == null || !nodes.isArray() || nodes.size() < 2) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
            var result = new TreeMap<String, String>();
            for (var node : nodes) {
                if (!node.path("id").isTextual() || node.path("id").textValue().isBlank()
                        || !node.path("id").textValue().equals(node.path("id").textValue().strip())
                        || !node.path("text").isTextual() || node.path("text").textValue().isBlank()
                        || result.putIfAbsent(node.get("id").textValue(), node.get("text").textValue()) != null) {
                    throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
                }
            }
            return result;
        } catch (JsonProcessingException | IllegalArgumentException invalid) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        }
    }
}
