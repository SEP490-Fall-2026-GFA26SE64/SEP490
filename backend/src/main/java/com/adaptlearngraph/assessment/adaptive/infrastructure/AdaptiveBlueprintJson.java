package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintStore.*;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Explicit record allowlist for receipts; no default polymorphic typing or protected-answer DTOs. */
final class AdaptiveBlueprintJson {
    private final ObjectMapper mapper;

    AdaptiveBlueprintJson(ObjectMapper mapper) {
        this.mapper = mapper.copy().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
    }

    String write(Object value) {
        if (value instanceof Configuration config) {
            value = config.scopePolicy() == ScopePolicy.FULL_OCCUPATION_V2
                    ? Map.of("name", config.name(), "occupationBounds", config.occupationBounds())
                    : Map.of("name", config.name(), "exploration", config.exploration(), "roles", config.roles());
        }
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot encode adaptive state", failure); }
    }

    <T> T read(String json, Class<T> type) {
        try { return mapper.readValue(json, type); }
        catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot decode adaptive state", failure); }
    }

    String writeOutcome(Outcome outcome) {
        ObjectNode envelope = mapper.createObjectNode();
        switch (outcome) {
            case Saved saved -> { envelope.put("operation", "SAVE"); envelope.put("noOp", saved.noOp()); envelope.set("value", mapper.valueToTree(saved.working())); }
            case Converted converted -> { envelope.put("operation", "CONVERT"); envelope.set("value", mapper.valueToTree(converted)); }
            case Finalized finalized -> { envelope.put("operation", "FINALIZE"); envelope.set("value", mapper.valueToTree(finalized.version())); }
            case Disabled disabled -> { envelope.put("operation", "DISABLE"); envelope.set("value", mapper.valueToTree(disabled.activation())); }
        }
        return write(envelope);
    }

    Outcome readOutcome(Operation operation, String json) {
        try {
            JsonNode envelope = mapper.readTree(json);
            if (!operation.name().equals(envelope.path("operation").asText()) || !envelope.path("value").isObject()) {
                throw new IllegalStateException("Receipt operation mismatch");
            }
            JsonNode value = envelope.get("value");
            return switch (operation) {
                case SAVE -> new Saved(mapper.treeToValue(value, WorkingRevision.class), envelope.path("noOp").asBoolean(false));
                case CONVERT -> mapper.treeToValue(value, Converted.class);
                case FINALIZE -> new Finalized(mapper.treeToValue(value, Version.class));
                case DISABLE -> new Disabled(mapper.treeToValue(value, Activation.class));
            };
        } catch (JsonProcessingException failure) { throw new IllegalStateException("Cannot decode receipt", failure); }
    }

    Version version(ResultSet header, Scope scope, List<Map<String, Object>> rows) throws SQLException {
        String policy = header.getString("scope_policy");
        boolean full = ScopePolicy.FULL_OCCUPATION_V2.name().equals(policy);
        if (policy != null && !full) throw new IllegalStateException("Unknown Blueprint scope policy");
        Map<String, Bounds> bounds = new LinkedHashMap<>();
        Map<String, RoleSnapshot> roles = new LinkedHashMap<>();
        Map<String, Map<String, SkillSnapshot>> skills = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String role = (String) row.get("role_id");
            skills.computeIfAbsent(role, ignored -> new LinkedHashMap<>()).put((String) row.get("micro_skill_id"),
                    new SkillSnapshot((String) row.get("micro_skill_name_snapshot"), (String) row.get("skill_version")));
            if (!full) bounds.put(role, new Bounds(((Number) row.get("max_questions")).intValue(),
                    ((Number) row.get("time_limit_seconds")).intValue()));
        }
        for (Map<String, Object> row : rows) {
            String role = (String) row.get("role_id");
            roles.putIfAbsent(role, new RoleSnapshot((String) row.get("role_name_snapshot"),
                    (String) row.get("role_version"), skills.get(role)));
        }
        return new Version(scope, new VersionId(header.getObject("blueprint_id", UUID.class), header.getInt("version")),
                full ? Configuration.occupation(header.getString("name"), new Bounds(header.getInt("occupation_max_questions"),
                        header.getInt("occupation_time_limit_seconds")))
                     : new Configuration(header.getString("name"), new Bounds(header.getInt("exploration_max_questions"),
                        header.getInt("exploration_time_limit_seconds")), bounds), header.getString("occupation_name_snapshot"),
                header.getString("catalog_fingerprint"), new VersionPins(header.getObject("model_version_id", UUID.class),
                        header.getObject("mastery_mapping_version_id", UUID.class), header.getObject("parameter_set_id", UUID.class)),
                roles, header.getObject("created_by", UUID.class), header.getTimestamp("created_at").toInstant());
    }

    String canonicalObject(String json) {
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

    static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
