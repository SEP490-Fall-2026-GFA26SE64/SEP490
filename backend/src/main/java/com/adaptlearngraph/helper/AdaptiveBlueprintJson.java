package com.adaptlearngraph.helper;

import com.adaptlearngraph.repository.AdaptiveBlueprintStore.*;
import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;

/** Explicit record allowlist for receipts; no default polymorphic typing or protected-answer DTOs. */
public final class AdaptiveBlueprintJson {
    private final ObjectMapper mapper;

    public AdaptiveBlueprintJson(ObjectMapper mapper) {
        this.mapper = mapper.copy().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
    }

    public String write(Object value) {
        if (value instanceof Configuration config) {
            value = config.scopePolicy() == ScopePolicy.FULL_OCCUPATION_V2
                    ? Map.of("name", config.name(), "occupationBounds", config.occupationBounds())
                    : Map.of("name", config.name(), "exploration", config.exploration(), "roles", config.roles());
        }
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot encode adaptive state", failure); }
    }

    public <T> T read(String json, Class<T> type) {
        try { return mapper.readValue(json, type); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot decode adaptive state", failure); }
    }

    public String writeOutcome(Outcome outcome) {
        ObjectNode envelope = mapper.createObjectNode();
        switch (outcome) {
            case Discarded discarded -> { envelope.put("operation", "DISCARD"); envelope.set("value", mapper.valueToTree(discarded.working())); }
            case Saved saved -> { envelope.put("operation", "SAVE"); envelope.put("noOp", saved.noOp()); envelope.set("value", mapper.valueToTree(saved.working())); }
            case Converted converted -> { envelope.put("operation", "CONVERT"); envelope.set("value", mapper.valueToTree(converted)); }
            case Finalized finalized -> { envelope.put("operation", "FINALIZE"); envelope.set("value", mapper.valueToTree(finalized.version())); }
            case Disabled disabled -> { envelope.put("operation", "DISABLE"); envelope.set("value", mapper.valueToTree(disabled.activation())); }
        }
        return write(envelope);
    }

    public Outcome readOutcome(Operation operation, String json) {
        try {
            JsonNode envelope = mapper.readTree(json);
            if (!operation.name().equals(envelope.path("operation").asText()) || !envelope.path("value").isObject()) {
                throw new IllegalStateException("Receipt operation mismatch");
            }
            JsonNode value = envelope.get("value");
            return switch (operation) {
                case DISCARD -> new Discarded(mapper.treeToValue(value, WorkingRevision.class));
                case SAVE -> new Saved(mapper.treeToValue(value, WorkingRevision.class), envelope.path("noOp").asBoolean(false));
                case CONVERT -> mapper.treeToValue(value, Converted.class);
                case FINALIZE -> new Finalized(mapper.treeToValue(value, Version.class));
                case DISABLE -> new Disabled(mapper.treeToValue(value, Activation.class));
            };
        } catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot decode receipt", failure); }
    }

    public String canonicalObject(String json) {
        try {
            JsonNode node = mapper.readTree(json);
            if (node == null || !node.isObject() || node.isEmpty()) throw new IllegalArgumentException("Configuration object required");
            return write(sort(node));
        } catch (JsonProcessingException failure) { throw new IllegalArgumentException("Invalid technical configuration", failure); }
    }

    private JsonNode sort(JsonNode node) {
        if (node.isObject()) {
            ObjectNode sorted = mapper.createObjectNode();
            node.properties().stream().sorted(Map.Entry.comparingByKey())
                    .forEach(entry -> sorted.set(entry.getKey(), sort(entry.getValue())));
            return sorted;
        }
        if (node.isArray()) {
            var sorted = mapper.createArrayNode();
            node.forEach(value -> sorted.add(sort(value)));
            return sorted;
        }
        return node;
    }

    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
